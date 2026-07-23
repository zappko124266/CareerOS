import type {
  ConnectorApplyInput,
  ConnectorConnectionState,
  ConnectorLoginInput,
  ConnectorSearchParams,
  NormalizedApplicationResult,
  NormalizedJob,
} from "./types";

/**
 * How a connector authenticates, if at all. `NONE` covers the 8 existing
 * read-only search connectors (`features/opportunities/providers/`) —
 * they have nothing to log into. The other three describe the shape a
 * future full connector's `login()` would need, without picking one
 * concretely — that choice belongs to whoever builds the first real one.
 */
export type ConnectorAuthMethod = "NONE" | "API_KEY" | "OAUTH2" | "SESSION_LOGIN";

/**
 * The Connector Capability System — Sprint 6, item 2. Every connector
 * declares these honestly; nothing here is enforced by fabricating
 * behavior — a connector that sets `supportsEasyApply: false` simply
 * never has `apply()` called on it (see `registry.ts`'s
 * `listConnectorsWithCapability`).
 */
export interface ConnectorCapabilities {
  auth: ConnectorAuthMethod;
  supportsEasyApply: boolean;
  supportsResumeUpload: boolean;
  supportsQuestionnaire: boolean;
  supportsInterviewTracking: boolean;
  supportsOAuth: boolean;
}

export interface ConnectorLoginResult {
  status: "CONNECTED" | "PENDING" | "ERROR";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
  /** Sprint 7 — additive, optional: which account on the external
   * platform got connected (e.g. a Google email/display name), for
   * connectors that can report it. */
  externalAccountEmail?: string;
  externalAccountName?: string;
}

export interface ConnectorRefreshResult {
  status: "CONNECTED" | "EXPIRED" | "ERROR";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * The Universal Connector Interface — Sprint 6, item 1. Every connector,
 * read-only search adapters and future full (login + apply) connectors
 * alike, implements this single contract. Reuses this feature's own
 * `NormalizedJob`/`NormalizedApplicationResult` (`types.ts`, which itself
 * reuses `features/opportunities/providers/types.ts`'s existing
 * `NormalizedOpportunity` field vocabulary) — nothing downstream of a
 * connector should ever see a portal-specific field name.
 *
 * `login`/`refresh`/`apply` are only meaningful when the connector's own
 * `capabilities` says so (`auth !== "NONE"`, `supportsEasyApply`) — a
 * connector that doesn't support them should implement them as a
 * rejection (throwing, or returning an `ERROR`/`FAILED` result), never a
 * fabricated success.
 */
export interface JobConnector {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ConnectorCapabilities;

  isConfigured(): boolean;
  searchJobs(params: ConnectorSearchParams): Promise<NormalizedJob[]>;
  getJob(jobId: string): Promise<NormalizedJob | null>;
  login(input: ConnectorLoginInput): Promise<ConnectorLoginResult>;
  refresh(connection: ConnectorConnectionState): Promise<ConnectorRefreshResult>;
  apply(input: ConnectorApplyInput): Promise<NormalizedApplicationResult>;
  /** Sprint 7 — additive: revokes the connection at the provider (best
   * effort) so every future authenticated connector has a real,
   * consistent way to disconnect, not just Google. */
  disconnect(connection: ConnectorConnectionState): Promise<void>;
}
