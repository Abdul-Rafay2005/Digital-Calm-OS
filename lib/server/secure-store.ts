import "server-only";

import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type {
  ConnectorConnection,
  ConnectorProviderId,
  ProviderCredentials
} from "@/lib/connectors";

const credentialsCookie = "calm_provider_credentials";
const vaultCookie = "calm_connector_vault";

export type OAuthStatePayload = {
  providerId: ConnectorProviderId;
  options: ConnectorConnection["options"];
  createdAt: string;
  nonce: string;
};

export type StoredToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  tokenType?: string;
  teamName?: string;
  accountLabel?: string;
};

export type ConnectorVault = {
  connections: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
  tokens: Partial<Record<ConnectorProviderId, StoredToken>>;
};

const defaultVault: ConnectorVault = {
  connections: {},
  tokens: {}
};

function encryptionKey() {
  const raw =
    process.env.CALM_ENCRYPTION_KEY ??
    process.env.NEXTAUTH_SECRET ??
    "development-only-digital-calm-os-local-key";

  return createHash("sha256").update(raw).digest();
}

export function sealJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealJson<T>(sealed: string | undefined): T | null {
  if (!sealed) return null;

  try {
    const payload = Buffer.from(sealed, "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);

    return JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
    ) as T;
  } catch {
    return null;
  }
}

export async function readProviderCredentials(): Promise<ProviderCredentials> {
  const jar = await cookies();
  const stored = unsealJson<ProviderCredentials>(jar.get(credentialsCookie)?.value);

  return {
    googleClientId: stored?.googleClientId ?? process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: stored?.googleClientSecret ?? process.env.GOOGLE_CLIENT_SECRET,
    googlePubsubTopic: stored?.googlePubsubTopic ?? process.env.GOOGLE_PUBSUB_TOPIC
  };
}

export async function writeProviderCredentials(credentials: ProviderCredentials) {
  const jar = await cookies();
  jar.set(credentialsCookie, sealJson(credentials), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function readConnectorVault(): Promise<ConnectorVault> {
  const jar = await cookies();
  return unsealJson<ConnectorVault>(jar.get(vaultCookie)?.value) ?? defaultVault;
}

export async function writeConnectorVault(vault: ConnectorVault) {
  const jar = await cookies();
  jar.set(vaultCookie, sealJson(vault), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function createOAuthState(payload: Omit<OAuthStatePayload, "createdAt" | "nonce">) {
  return sealJson({
    ...payload,
    createdAt: new Date().toISOString(),
    nonce: randomBytes(16).toString("hex")
  } satisfies OAuthStatePayload);
}

export function readOAuthState(state: string | null) {
  return unsealJson<OAuthStatePayload>(state ?? undefined);
}
