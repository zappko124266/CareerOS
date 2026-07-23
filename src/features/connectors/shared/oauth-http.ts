import "server-only";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Shared OAuth2 error types + the token-endpoint POST helper every
 * confidential-client connector needs — extracted from
 * `connectors/google/oauth.ts` (Sprint 14) before Microsoft was built, so
 * the second real connector doesn't duplicate this rather than being
 * asked to copy it. Provider-specific behavior (endpoints, scopes,
 * request bodies) stays in each connector's own `oauth.ts`; only the
 * mechanical "POST url-encoded form, handle non-2xx, log, throw a typed
 * error" part lives here.
 */
export class OAuthNotConfiguredError extends AppError {
  constructor(provider: string) {
    super("OAUTH_NOT_CONFIGURED", `${provider} connector isn't configured yet.`);
    this.name = "OAuthNotConfiguredError";
  }
}

export class OAuthRequestFailedError extends AppError {
  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super("OAUTH_REQUEST_FAILED", message, options);
    this.name = "OAuthRequestFailedError";
  }
}

/**
 * Real POST to an OAuth2 token endpoint (`application/x-www-form-urlencoded`,
 * the format every OAuth2 token endpoint — Google's, Microsoft's, and the
 * spec's own — requires). `provider` is only used for the log event name
 * and error message, never sent in the request itself.
 */
export async function postOAuthForm<T>(
  provider: string,
  endpoint: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error(`${provider.toLowerCase()}_connector.oauth_request_failed`, {
      endpoint,
      status: response.status,
      detail,
    });
    throw new OAuthRequestFailedError(provider, `${provider} OAuth request to ${endpoint} failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}
