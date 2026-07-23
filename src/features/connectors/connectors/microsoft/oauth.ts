import "server-only";

import { clientEnv } from "@/lib/env.client";
import { env } from "@/lib/env.server";

import { OAuthNotConfiguredError, OAuthRequestFailedError, postOAuthForm } from "../../shared/oauth-http";
import { MICROSOFT_OAUTH_SCOPES } from "./types";
import type { MicrosoftTokenResponse, MicrosoftUserInfoResponse } from "./types";

const PROVIDER = "Microsoft";

const GRAPH_USERINFO_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

function authorizationEndpoint(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

function tokenEndpoint(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.MICROSOFT_TENANT_ID);
}

function requireCredentials(): { clientId: string; clientSecret: string; tenantId: string } {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET || !env.MICROSOFT_TENANT_ID) {
    throw new OAuthNotConfiguredError(PROVIDER);
  }
  return {
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
    tenantId: env.MICROSOFT_TENANT_ID,
  };
}

export function getRedirectUri(): string {
  return `${clientEnv.NEXT_PUBLIC_APP_URL}/api/connectors/microsoft/callback`;
}

/** Builds the real Microsoft consent-screen URL (Microsoft identity
 * platform v2.0 authorization endpoint) — no mocked/local authorization
 * flow. `prompt=consent` mirrors Google's connector: it forces the
 * consent screen (and therefore a fresh `refresh_token`) on every
 * connect/reconnect rather than silently reusing a prior grant. PKCE
 * (`code_challenge`) comes from the shared `shared/pkce.ts`, same as
 * Google. */
export function buildAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
  const { clientId, tenantId } = requireCredentials();

  const url = new URL(authorizationEndpoint(tenantId));
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_OAUTH_SCOPES.map((s) => s.scope).join(" "));
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

/** Real authorization-code exchange —
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redeem-a-code-for-an-access-token */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret, tenantId } = requireCredentials();

  return postOAuthForm<MicrosoftTokenResponse>(PROVIDER, tokenEndpoint(tenantId), {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
    scope: MICROSOFT_OAUTH_SCOPES.map((s) => s.scope).join(" "),
  });
}

/** Real refresh-token exchange. Unlike Google, the Microsoft identity
 * platform typically *does* return a new `refresh_token` on every refresh
 * (refresh token rotation) — callers should still defensively keep the
 * prior token if a new one isn't returned, the same defensive shape
 * Google's connector already uses, rather than assuming the rotation
 * behavior is guaranteed for every tenant/app configuration. */
export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret, tenantId } = requireCredentials();

  return postOAuthForm<MicrosoftTokenResponse>(PROVIDER, tokenEndpoint(tenantId), {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    scope: MICROSOFT_OAUTH_SCOPES.map((s) => s.scope).join(" "),
  });
}

/** Real Microsoft Graph `/me` fetch —
 * https://learn.microsoft.com/en-us/graph/api/user-get */
export async function fetchMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfoResponse> {
  const response = await fetch(GRAPH_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new OAuthRequestFailedError(PROVIDER, `Microsoft Graph /me request failed (${response.status}).`);
  }

  return response.json() as Promise<MicrosoftUserInfoResponse>;
}
