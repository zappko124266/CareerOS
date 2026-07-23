import { NextResponse } from "next/server";

import { buildAuthorizationUrl } from "@/features/connectors/connectors/google/oauth";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "@/features/connectors/shared/pkce";
import { setOAuthStateCookies } from "@/features/connectors/shared/oauth-state-cookies";
import { verifySession } from "@/lib/auth/dal";

/**
 * Starts the real Google OAuth flow — redirects to Google's own consent
 * screen (`buildAuthorizationUrl`, `features/connectors/connectors/google/oauth.ts`).
 * The `state` and PKCE `code_verifier` are stored via the shared
 * `setOAuthStateCookies` helper (short-lived, httpOnly cookies — never
 * sent to Google, never exposed to client JS) so the callback route can
 * verify this exact browser session initiated the request before
 * exchanging anything.
 */
export async function GET() {
  await verifySession();

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authorizationUrl = buildAuthorizationUrl({ state, codeChallenge });

  await setOAuthStateCookies("google", state, codeVerifier);

  return NextResponse.redirect(authorizationUrl);
}
