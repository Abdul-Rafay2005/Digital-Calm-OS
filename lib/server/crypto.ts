import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey() {
  const raw =
    process.env.CALM_ENCRYPTION_KEY ??
    process.env.NEXTAUTH_SECRET ??
    "development-only-digital-calm-os-local-key";

  return createHash("sha256").update(raw).digest();
}

export function sealText(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealText(sealed: string | null | undefined) {
  if (!sealed) return null;

  try {
    const payload = Buffer.from(sealed, "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqualHash(value: string, hash: string) {
  const valueHash = Buffer.from(hashValue(value), "hex");
  const expectedHash = Buffer.from(hash, "hex");

  if (valueHash.length !== expectedHash.length) return false;
  return timingSafeEqual(valueHash, expectedHash);
}
