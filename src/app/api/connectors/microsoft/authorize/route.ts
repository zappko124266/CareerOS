import { NextResponse } from "next/server";

import { buildAuthorizationUrl } from "@/features/connectors/connectors/microsoft/oauth";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "@/features/connectors/shared/pkce";
import { setOAuthStateCookies } from "@/features/connectors/shared/oauth-state-cookies";
import { verifySession } from "@/lib/auth/dal";

/**
 * Starts the real Microsoft OAuth flow — redirects to Microsoft's own
 * consent screen (`buildAuthorizationUrl`,
 * `features/connectors/connectors/microsoft/oauth.ts`). Identical shape
 * to Google's authorize route (`app/api/connectors/google/authorize/route.ts`),
 * built on the same shared PKCE (`features/connectors/shared/pkce.ts`)
 * and state-cookie (`features/connectors/shared/oauth-state-cookies.ts`)
 * helpers rather than reimplementing either.
 */
export async function GET() {
  await verifySession();

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authorizationUrl = buildAuthorizationUrl({ state, codeChallenge });

  await setOAuthStateCookies("microsoft", state, codeVerifier);

  return NextResponse.redirect(authorizationUrl);
}
