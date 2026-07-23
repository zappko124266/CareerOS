import "server-only";
import { createHash, randomBytes } from "crypto";

/**
 * PKCE (RFC 7636) + OAuth `state` generation — provider-agnostic. Used by
 * every OAuth2 connector (Google, Microsoft, and any future one), even
 * though all are confidential (server-side) clients: PKCE here is defense
 * in depth against authorization-code interception, the same rationale
 * Google's connector documented before this was extracted for reuse.
 *
 * Extracted from `connectors/google/oauth.ts` (Sprint 14) so a second
 * OAuth2 connector doesn't reimplement identical crypto — nothing about
 * PKCE or `state` generation is provider-specific.
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return randomBytes(32).toString("base64url");
}
