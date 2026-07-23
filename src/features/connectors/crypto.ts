import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "@/lib/env.server";
import { AppError } from "@/lib/errors";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

export class TokenEncryptionNotConfiguredError extends AppError {
  constructor() {
    super(
      "TOKEN_ENCRYPTION_NOT_CONFIGURED",
      "CONNECTOR_TOKEN_ENCRYPTION_KEY is not configured — connector tokens cannot be stored until it is.",
    );
    this.name = "TokenEncryptionNotConfiguredError";
  }
}

function getKey(): Buffer {
  if (!env.CONNECTOR_TOKEN_ENCRYPTION_KEY) {
    throw new TokenEncryptionNotConfiguredError();
  }

  const key = Buffer.from(env.CONNECTOR_TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new AppError(
      "TOKEN_ENCRYPTION_MISCONFIGURED",
      `CONNECTOR_TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes (base64-encoded) — got ${key.length}.`,
    );
  }

  return key;
}

/**
 * Real AES-256-GCM authenticated encryption (Node's built-in `crypto` —
 * no new dependency) for connector OAuth tokens before they ever reach
 * `AccountConnection` (`prisma/schema.prisma`). Output packs
 * `iv || authTag || ciphertext`, base64-encoded, into the same `String?`
 * columns that model already had — no schema change beyond the fields
 * this sprint already added. Never falls back to a default/derived key:
 * throws if `CONNECTOR_TOKEN_ENCRYPTION_KEY` is missing or the wrong
 * length, the same "fail loud, never silently degrade security" as the
 * rest of this codebase's configuration checks.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertext, "base64");

  const iv = data.subarray(0, IV_LENGTH_BYTES);
  const authTag = data.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const encrypted = data.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
