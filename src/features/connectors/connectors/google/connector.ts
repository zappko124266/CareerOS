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

import { applyToGoogleJob, getGoogleJob, searchGoogleJobs } from "./jobs";
import { normalizeGoogleIdentity } from "./normalize";
import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  isGoogleOAuthConfigured,
  refreshAccessToken,
  revokeToken,
} from "./oauth";
import { GOOGLE_OAUTH_SCOPES } from "./types";

/** The payload shape this connector's `login()` expects — the
 * authorization code and PKCE verifier the callback route
 * (`app/api/connectors/google/callback/route.ts`) received from Google.
 * `ConnectorLoginInput.payload` is deliberately `unknown` at the contract
 * level (every connector's login flow differs); this is Google's own
 * concrete shape for it. */
export interface GoogleLoginPayload {
  code: string;
  codeVerifier: string;
}

function isGoogleLoginPayload(payload: unknown): payload is GoogleLoginPayload {
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
  // Calendar access is real (see GOOGLE_OAUTH_SCOPES) and is the
  // interview-tracking-relevant scope this connector requests.
  supportsInterviewTracking: true,
  supportsOAuth: true,
};

/**
 * The first real `JobConnector` implementation — Sprint 7. Identity +
 * Calendar + Gmail via real Google OAuth 2.0 (`oauth.ts`, no mocked
 * responses). Deliberately does not implement job search or Easy Apply:
 * see `jobs.ts` for why `searchJobs`/`getJob` are a real, documented
 * rejection rather than a fabricated result, and `capabilities` above
 * reflects that honestly (`supportsEasyApply: false`) so nothing in this
 * codebase should call `apply()` on this connector in the first place.
 *
 * This connector never touches the database — `login`/`refresh`/
 * `disconnect` only do real HTTP calls to Google and return a result;
 * the caller (the OAuth routes / `disconnectConnectorAction`) persists
 * that result via `features/connectors/manager.ts`, keeping this file's
 * only dependency the network, not Prisma.
 */
export const googleConnector: JobConnector = {
  id: "google",
  name: "Google",
  capabilities: CAPABILITIES,

  isConfigured(): boolean {
    return isGoogleOAuthConfigured();
  },

  async login(input: ConnectorLoginInput): Promise<ConnectorLoginResult> {
    if (!isGoogleLoginPayload(input.payload)) {
      return { status: "ERROR", error: "Missing authorization code or PKCE verifier." };
    }

    try {
      const tokens = await exchangeCodeForTokens(input.payload.code, input.payload.codeVerifier);
      const userInfo = await fetchGoogleUserInfo(tokens.access_token);
      const identity = normalizeGoogleIdentity(userInfo);

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
        // Google does not reliably return a new refresh_token on
        // refresh — keep the existing one unless a new one was issued.
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };
    } catch (error) {
      return { status: "ERROR", error: error instanceof Error ? error.message : String(error) };
    }
  },

  async disconnect(connection: ConnectorConnectionState): Promise<void> {
    const token = connection.refreshToken ?? connection.accessToken;
    if (token) {
      await revokeToken(token);
    }
  },

  async searchJobs(): Promise<NormalizedJob[]> {
    return searchGoogleJobs();
  },

  async getJob(): Promise<NormalizedJob | null> {
    return getGoogleJob();
  },

  async apply(): Promise<NormalizedApplicationResult> {
    return applyToGoogleJob();
  },
};

export { GOOGLE_OAUTH_SCOPES };
