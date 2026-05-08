import "server-only";

import { Pool } from "pg";

declare global {
  var calmDbPool: Pool | undefined;
  var calmDbSchemaReady: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Set it to your Neon Postgres connection string.");
  }

  const needsSsl =
    connectionString.includes("neon.tech") ||
    connectionString.includes("sslmode=require") ||
    process.env.PGSSLMODE === "require";

  return new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });
}

export function getDb() {
  globalThis.calmDbPool ??= createPool();
  return globalThis.calmDbPool;
}

export async function ensureSchema() {
  globalThis.calmDbSchemaReady ??= getDb().query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS email_verification_codes_email_idx
      ON email_verification_codes(email, created_at DESC);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);

    CREATE TABLE IF NOT EXISTS provider_credentials (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      google_client_id TEXT,
      google_client_secret_encrypted TEXT,
      google_pubsub_topic TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS provider_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      status TEXT NOT NULL,
      granted_scopes TEXT[] NOT NULL DEFAULT '{}',
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_synced_at TIMESTAMPTZ,
      next_sync_at TIMESTAMPTZ,
      synced_signals INTEGER NOT NULL DEFAULT 0,
      muted_signals INTEGER NOT NULL DEFAULT 0,
      setup_options JSONB NOT NULL DEFAULT '{}',
      UNIQUE(user_id, provider_id)
    );

    CREATE TABLE IF NOT EXISTS provider_tokens (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      expires_at TIMESTAMPTZ,
      scope TEXT,
      token_type TEXT,
      account_label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(user_id, provider_id)
    );
  `).then(() => undefined);

  return globalThis.calmDbSchemaReady;
}
