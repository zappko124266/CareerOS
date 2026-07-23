import { NextResponse } from "next/server";

import { googleConnector } from "@/features/connectors/connectors/google/connector";
import { upsertConnectionState } from "@/features/connectors/manager";
import { consumeOAuthStateCookies } from "@/features/connectors/shared/oauth-state-cookies";
import { verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Receives Google's redirect after the user approves (or denies) access,
 * verifies the `state`/PKCE `code_verifier` cookies set by the authorize
 * route (rejecting anything that doesn't match — CSRF/interception
 * protection), exchanges the real authorization code for real tokens via
 * `googleConnector.login`, and persists the result through the Connection
 * Manager (`upsertConnectionState`, which encrypts tokens before they
 * reach the database).
 */
export async function GET(request: Request) {
  const user = await verifySession();
  const { searchParams, origin } = new URL(request.url);

  const redirectUrl = new URL("/opportunities/connections", origin);

  const { state: expectedState, codeVerifier } = await consumeOAuthStateCookies("google");

  const errorParam = searchParams.get("error");
  if (errorParam) {
    redirectUrl.searchParams.set("connector_error", "Google sign-in was cancelled.");
    return NextResponse.redirect(redirectUrl);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    logger.error("google_connector.callback_state_mismatch", { userId: user.id });
    redirectUrl.searchParams.set("connector_error", "Google sign-in couldn't be verified — please try again.");
    return NextResponse.redirect(redirectUrl);
  }

  const result = await googleConnector.login({ userId: user.id, payload: { code, codeVerifier } });

  if (result.status !== "CONNECTED" || !result.accessToken) {
    logger.error("google_connector.login_failed", { userId: user.id, error: result.error });
    redirectUrl.searchParams.set("connector_error", result.error ?? "Couldn't connect your Google account.");
    return NextResponse.redirect(redirectUrl);
  }

  await upsertConnectionState(user.id, "GOOGLE", {
    status: "CONNECTED",
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? null,
    scopes: result.scopes ?? [],
    expiresAt: result.expiresAt ?? null,
    externalAccountEmail: result.externalAccountEmail ?? null,
    externalAccountName: result.externalAccountName ?? null,
    lastError: null,
  });

  await logAuditEvent("connector.connected", { userId: user.id, metadata: { provider: "GOOGLE" } });

  redirectUrl.searchParams.set("connector_success", "google");
  return NextResponse.redirect(redirectUrl);
}
