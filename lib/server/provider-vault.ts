import "server-only";

import { randomUUID } from "node:crypto";
import {
  createConnectionRecord,
  getConnector,
  type ConnectorConnection,
  type ConnectorProviderId,
  type ConnectorSetupOptions,
  type ProviderCredentials
} from "@/lib/connectors";
import { ensureSchema, getDb } from "@/lib/server/db";
import { sealText, unsealText } from "@/lib/server/crypto";
import type { StoredToken } from "@/lib/server/secure-store";

export async function readProviderCredentials(userId: string): Promise<ProviderCredentials> {
  await ensureSchema();
  const { rows } = await getDb().query<{
    google_client_id: string | null;
    google_client_secret_encrypted: string | null;
    google_pubsub_topic: string | null;
  }>(
    `SELECT google_client_id, google_client_secret_encrypted, google_pubsub_topic
     FROM provider_credentials
     WHERE user_id = $1`,
    [userId]
  );

  const row = rows[0];
  return {
    googleClientId: row?.google_client_id ?? process.env.GOOGLE_CLIENT_ID,
    googleClientSecret:
      unsealText(row?.google_client_secret_encrypted) ?? process.env.GOOGLE_CLIENT_SECRET,
    googlePubsubTopic: row?.google_pubsub_topic ?? process.env.GOOGLE_PUBSUB_TOPIC
  };
}

export async function readStoredProviderCredentials(userId: string): Promise<ProviderCredentials> {
  await ensureSchema();
  const { rows } = await getDb().query<{
    google_client_id: string | null;
    google_client_secret_encrypted: string | null;
    google_pubsub_topic: string | null;
  }>(
    `SELECT google_client_id, google_client_secret_encrypted, google_pubsub_topic
     FROM provider_credentials
     WHERE user_id = $1`,
    [userId]
  );

  const row = rows[0];
  return {
    googleClientId: row?.google_client_id ?? undefined,
    googleClientSecret: unsealText(row?.google_client_secret_encrypted) ?? undefined,
    googlePubsubTopic: row?.google_pubsub_topic ?? undefined
  };
}

export async function updateProviderAccessToken({
  accessToken,
  expiresAt,
  providerId,
  scope,
  tokenType,
  userId
}: {
  accessToken: string;
  expiresAt?: string;
  providerId: ConnectorProviderId;
  scope?: string;
  tokenType?: string;
  userId: string;
}) {
  await ensureSchema();
  await getDb().query(
    `UPDATE provider_tokens
     SET access_token_encrypted = $3,
         expires_at = $4,
         scope = COALESCE($5, scope),
         token_type = COALESCE($6, token_type),
         updated_at = NOW()
     WHERE user_id = $1 AND provider_id = $2`,
    [
      userId,
      providerId,
      sealText(accessToken),
      expiresAt ?? null,
      scope ?? null,
      tokenType ?? null
    ]
  );
}

export async function writeProviderCredentials(
  userId: string,
  credentials: ProviderCredentials
) {
  await ensureSchema();
  await getDb().query(
    `INSERT INTO provider_credentials (
       user_id,
       google_client_id,
       google_client_secret_encrypted,
       google_pubsub_topic
     )
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET
       google_client_id = EXCLUDED.google_client_id,
       google_client_secret_encrypted = EXCLUDED.google_client_secret_encrypted,
       google_pubsub_topic = EXCLUDED.google_pubsub_topic,
       updated_at = NOW()`,
    [
      userId,
      credentials.googleClientId ?? null,
      credentials.googleClientSecret ? sealText(credentials.googleClientSecret) : null,
      credentials.googlePubsubTopic ?? null
    ]
  );
}

export async function readConnections(userId: string) {
  await ensureSchema();
  const { rows } = await getDb().query<{
    provider_id: ConnectorProviderId;
    provider_name: string;
    status: ConnectorConnection["status"];
    granted_scopes: string[];
    connected_at: Date;
    last_synced_at: Date | null;
    next_sync_at: Date | null;
    synced_signals: number;
    muted_signals: number;
    setup_options: ConnectorSetupOptions;
    id: string;
  }>(
    `SELECT id, provider_id, provider_name, status, granted_scopes, connected_at,
            last_synced_at, next_sync_at, synced_signals, muted_signals, setup_options
     FROM provider_connections
     WHERE user_id = $1
     ORDER BY connected_at DESC`,
    [userId]
  );

  return rows.reduce(
    (acc, row) => ({
      ...acc,
      [row.provider_id]: {
        id: row.id,
        providerId: row.provider_id,
        providerName: row.provider_name,
        status: row.status,
        source: "oauth",
        options: row.setup_options,
        grantedScopes: row.granted_scopes,
        connectedAt: row.connected_at.toISOString(),
        lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
        nextSyncAt: row.next_sync_at?.toISOString() ?? new Date().toISOString(),
        syncedSignals: row.synced_signals,
        mutedSignals: row.muted_signals
      } satisfies ConnectorConnection
    }),
    {} as Partial<Record<ConnectorProviderId, ConnectorConnection>>
  );
}

export async function saveProviderToken({
  grantedScopes,
  options,
  providerId,
  token,
  userId
}: {
  grantedScopes: string[];
  options: ConnectorSetupOptions;
  providerId: ConnectorProviderId;
  token: StoredToken;
  userId: string;
}) {
  await ensureSchema();
  const connector = getConnector(providerId);
  if (!connector) throw new Error("Unknown connector provider.");

  const connection = {
    ...createConnectionRecord(connector, options, grantedScopes),
    id: randomUUID(),
    syncedSignals: 0,
    mutedSignals: 0
  };

  await getDb().query(
    `INSERT INTO provider_tokens (
       user_id,
       provider_id,
       access_token_encrypted,
       refresh_token_encrypted,
       expires_at,
       scope,
       token_type,
       account_label
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, provider_id)
     DO UPDATE SET
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
       expires_at = EXCLUDED.expires_at,
       scope = EXCLUDED.scope,
       token_type = EXCLUDED.token_type,
       account_label = EXCLUDED.account_label,
       updated_at = NOW()`,
    [
      userId,
      providerId,
      sealText(token.accessToken),
      token.refreshToken ? sealText(token.refreshToken) : null,
      token.expiresAt ?? null,
      token.scope ?? null,
      token.tokenType ?? null,
      token.accountLabel ?? null
    ]
  );

  await getDb().query(
    `INSERT INTO provider_connections (
       id, user_id, provider_id, provider_name, status, granted_scopes,
       connected_at, last_synced_at, next_sync_at, synced_signals, muted_signals, setup_options
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL, $7, 0, 0, $8)
     ON CONFLICT (user_id, provider_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       granted_scopes = EXCLUDED.granted_scopes,
       connected_at = NOW(),
       next_sync_at = EXCLUDED.next_sync_at,
       setup_options = EXCLUDED.setup_options`,
    [
      connection.id,
      userId,
      providerId,
      connection.providerName,
      connection.status,
      grantedScopes,
      connection.nextSyncAt,
      JSON.stringify(options)
    ]
  );
}

export async function readProviderToken(userId: string, providerId: ConnectorProviderId) {
  await ensureSchema();
  const { rows } = await getDb().query<{
    access_token_encrypted: string;
    refresh_token_encrypted: string | null;
    expires_at: Date | null;
    scope: string | null;
    token_type: string | null;
    account_label: string | null;
  }>(
    `SELECT access_token_encrypted, refresh_token_encrypted, expires_at, scope, token_type, account_label
     FROM provider_tokens
     WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId]
  );

  const row = rows[0];
  if (!row) return null;

  const accessToken = unsealText(row.access_token_encrypted);
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: unsealText(row.refresh_token_encrypted) ?? undefined,
    expiresAt: row.expires_at?.toISOString(),
    scope: row.scope ?? undefined,
    tokenType: row.token_type ?? undefined,
    accountLabel: row.account_label ?? undefined
  } satisfies StoredToken;
}

export async function updateConnectionSyncStats({
  mutedSignals,
  providerId,
  syncedSignals,
  userId
}: {
  mutedSignals: number;
  providerId: ConnectorProviderId;
  syncedSignals: number;
  userId: string;
}) {
  await ensureSchema();
  await getDb().query(
    `UPDATE provider_connections
     SET last_synced_at = NOW(), synced_signals = $3, muted_signals = $4
     WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId, syncedSignals, mutedSignals]
  );
}

export async function deleteProviderToken(userId: string, providerId: ConnectorProviderId) {
  await ensureSchema();
  await getDb().query(
    `DELETE FROM provider_tokens WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId]
  );
}

export async function disconnectProvider(userId: string, providerId: ConnectorProviderId) {
  await ensureSchema();
  await getDb().query(
    `DELETE FROM provider_tokens WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId]
  );
  await getDb().query(
    `DELETE FROM provider_connections WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId]
  );
}

export async function deleteConnection(userId: string, providerId: ConnectorProviderId) {
  await ensureSchema();
  await getDb().query(`DELETE FROM provider_tokens WHERE user_id = $1 AND provider_id = $2`, [
    userId,
    providerId
  ]);
  await getDb().query(
    `DELETE FROM provider_connections WHERE user_id = $1 AND provider_id = $2`,
    [userId, providerId]
  );
}
