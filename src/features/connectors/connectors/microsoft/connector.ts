import type {
  ConnectorCapabilities,
  ConnectorLoginResult,
  ConnectorRefreshResult,
  JobConnector,
} from "../../contracts";
import type {
  ConnectorConnectionState,
  ConnectorLoginInput,
  NormalizedApplicationResult,
  NormalizedJob,
} from "../../types";

import { applyToMicrosoftJob, getMicrosoftJob, searchMicrosoftJobs } from "./jobs";
import { normalizeMicrosoftIdentity } from "./normalize";
import {
  exchangeCodeForTokens,
  fetchMicrosoftUserInfo,
  isMicrosoftOAuthConfigured,
  refreshAccessToken,
} from "./oauth";
import { MICROSOFT_OAUTH_SCOPES } from "./types";

/** The payload shape this connector's `login()` expects — the
 * authorization code and PKCE verifier the callback route
 * (`app/api/connectors/microsoft/callback/route.ts`) received from
 * Microsoft. Same shape as Google's `GoogleLoginPayload` — both OAuth2+
 * PKCE connectors need exactly this, but `ConnectorLoginInput.payload` is
 * deliberately `unknown` at the contract level, so each connector still
 * declares and validates its own concrete shape. */
export interface MicrosoftLoginPayload {
  code: string;
  codeVerifier: string;
}

function isMicrosoftLoginPayload(payload: unknown): payload is MicrosoftLoginPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as Record<string, unknown>).code === "string" &&
    typeof (payload as Record<string, unknown>).codeVerifier === "string"
  );
}

const CAPABILITIES: ConnectorCapabilities = {
  auth: "OAUTH2",
  supportsEasyApply: false,
  supportsResumeUpload: false,
  supportsQuestionnaire: false,
  // Calendar access is real (Calendars.Read, see MICROSOFT_OAUTH_SCOPES)
  // and is the interview-tracking-relevant scope this connector requests
  // — same rationale as Google's capability declaration.
  supportsInterviewTracking: true,
  supportsOAuth: true,
};

/**
 * The second real `JobConnector` implementation (Sprint 14), built on the
 * same shared OAuth2+PKCE primitives (`features/connectors/shared/`) that
 * `connectors/google/` was refactored onto first. Identity + Calendar +
 * Outlook Mail via real Microsoft OAuth 2.0 (`oauth.ts`, no mocked
 * responses). Deliberately does not implement job search or Easy Apply —
 * see `jobs.ts` for why `searchJobs`/`getJob` are a real, documented
 * rejection rather than a fabricated result, and `capabilities` above
 * reflects that honestly (`supportsEasyApply: false`).
 *
 * Like Google, this connector never touches the database — `login`/
 * `refresh`/`disconnect` only do real HTTP calls (or, for `disconnect`,
 * deliberately no call — see its own doc comment) and return a result;
 * the caller (the OAuth routes / `disconnectConnectorAction`) persists
 * that result via `features/connectors/manager.ts`.
 */
export const microsoftConnector: JobConnector = {
  id: "microsoft",
  name: "Microsoft",
  capabilities: CAPABILITIES,

  isConfigured(): boolean {
    return isMicrosoftOAuthConfigured();
  },

  async login(input: ConnectorLoginInput): Promise<ConnectorLoginResult> {
    if (!isMicrosoftLoginPayload(input.payload)) {
      return { status: "ERROR", error: "Missing authorization code or PKCE verifier." };
    }

    try {
      const tokens = await exchangeCodeForTokens(input.payload.code, input.payload.codeVerifier);
      const userInfo = await fetchMicrosoftUserInfo(tokens.access_token);
      const identity = normalizeMicrosoftIdentity(userInfo);

      return {
        status: "CONNECTED",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: tokens.scope.split(" "),
        externalAccountEmail: identity.email ?? undefined,
        externalAccountName: identity.name ?? undefined,
      };
    } catch (error) {
      return { status: "ERROR", error: error instanceof Error ? error.message : String(error) };
    }
  },

  async refresh(connection: ConnectorConnectionState): Promise<ConnectorRefreshResult> {
    if (!connection.refreshToken) {
      return { status: "ERROR", error: "No refresh token on file — reconnect required." };
    }

    try {
      const tokens = await refreshAccessToken(connection.refreshToken);
      return {
        status: "CONNECTED",
        accessToken: tokens.access_token,
        // Microsoft typically rotates refresh tokens on every refresh —
        // keep the existing one only if this call didn't return a new
        // one (see oauth.ts's refreshAccessToken doc comment).
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };
    } catch (error) {
      return { status: "ERROR", error: error instanceof Error ? error.message : String(error) };
    }
  },

  /**
   * Real platform constraint, not a placeholder: unlike Google's
   * `/revoke` endpoint, the Microsoft identity platform has no
   * per-application, user-initiated token-revocation REST call. The
   * closest Microsoft Graph API, `POST /me/revokeSignInSessions`,
   * invalidates *every* refresh token the user has issued to *every*
   * application (not scoped to just CareerOS) and requires additional
   * admin-consented permissions this app does not request — calling it
   * here would silently sign the user out of unrelated apps, which is not
   * what "disconnect Microsoft from CareerOS" means. So this is
   * deliberately a real no-op rather than a fabricated revoke call.
   * Disconnecting in CareerOS still always clears the local
   * `AccountConnection` row regardless (`clearConnection`, called
   * unconditionally by `disconnectConnectorAction`) — the same "never
   * leave the user stuck connected locally" guarantee Google's
   * best-effort revoke provides, just without a provider-side call
   * behind it for this provider.
   */
  async disconnect(): Promise<void> {
    return;
  },

  async searchJobs(): Promise<NormalizedJob[]> {
    return searchMicrosoftJobs();
  },

  async getJob(): Promise<NormalizedJob | null> {
    return getMicrosoftJob();
  },

  async apply(): Promise<NormalizedApplicationResult> {
    return applyToMicrosoftJob();
  },
};

export { MICROSOFT_OAUTH_SCOPES };
