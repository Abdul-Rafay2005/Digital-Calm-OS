import "server-only";

import { cookies } from "next/headers";
import { randomInt, randomUUID, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { ensureSchema, getDb } from "@/lib/server/db";
import { hashValue, safeEqualHash } from "@/lib/server/crypto";

const sessionCookieName = "calm_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEmailCode() {
  return randomInt(100000, 999999).toString();
}

export async function sendVerificationEmail(email: string, code: string) {
  if (process.env.EMAIL_DELIVERY_MODE === "console") {
    console.log(`[Digital Calm OS] Verification code for ${email}: ${code}`);
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your Digital Calm OS verification code",
    text: `Your Digital Calm OS verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#050505;color:#fff;padding:32px;border-radius:20px">
        <h1 style="margin:0 0 12px">Digital Calm OS</h1>
        <p style="color:#c8c8c8">Use this verification code to continue:</p>
        <div style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</div>
        <p style="color:#888">This code expires in 10 minutes.</p>
      </div>
    `
  });
}

export async function createVerificationCode(email: string, purpose: "signup" | "login") {
  await ensureSchema();
  const code = generateEmailCode();

  await getDb().query(
    `INSERT INTO email_verification_codes (id, email, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
    [randomUUID(), email, hashValue(code), purpose]
  );

  await sendVerificationEmail(email, code);
}

export async function verifyEmailCode(email: string, code: string, name?: string) {
  await ensureSchema();
  const db = getDb();
  const { rows } = await db.query<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
    consumed_at: Date | null;
  }>(
    `SELECT id, code_hash, attempts, expires_at, consumed_at
     FROM email_verification_codes
     WHERE email = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );

  const record = rows[0];
  if (!record) throw new Error("No active verification code found.");
  if (record.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
  if (new Date(record.expires_at).getTime() < Date.now()) throw new Error("Verification code expired.");

  const valid = safeEqualHash(code.trim(), record.code_hash);
  if (!valid) {
    await db.query(
      `UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1`,
      [record.id]
    );
    throw new Error("Invalid verification code.");
  }

  const userId = randomUUID();
  const userResult = await db.query<AuthUser>(
    `INSERT INTO users (id, email, name, email_verified_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       name = COALESCE(EXCLUDED.name, users.name),
       email_verified_at = COALESCE(users.email_verified_at, NOW()),
       updated_at = NOW()
     RETURNING id, email, name`,
    [userId, email, name?.trim() || null]
  );

  await db.query(
    `UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1`,
    [record.id]
  );

  await createSession(userResult.rows[0].id);
  return userResult.rows[0];
}

export async function createSession(userId: string) {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashValue(token);
  const sessionId = randomUUID();

  await getDb().query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
    [sessionId, userId, tokenHash]
  );

  const jar = await cookies();
  jar.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export async function getCurrentUser() {
  await ensureSchema();
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;

  const { rows } = await getDb().query<AuthUser>(
    `SELECT users.id, users.email, users.name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()
     LIMIT 1`,
    [hashValue(token)]
  );

  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required.");
  return user;
}

export async function logout() {
  await ensureSchema();
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (token) {
    await getDb().query(`DELETE FROM sessions WHERE token_hash = $1`, [hashValue(token)]);
  }
  jar.delete(sessionCookieName);
}
