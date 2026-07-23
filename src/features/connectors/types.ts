import type { NormalizedOpportunity, OpportunitySearchParams } from "@/features/opportunities/providers/types";

/**
 * The Normalized Job Model — Sprint 6, item 4. Reuses every field of
 * `NormalizedOpportunity` (`features/opportunities/providers/types.ts`),
 * the 8 existing read-only search connectors' own "one Job format" —
 * widening only `source`, since future universal connectors (LinkedIn,
 * Naukri, ...) aren't part of the closed `OpportunityProviderId` union
 * those 8 adapters use. Every other field keeps its exact existing
 * meaning; this is not a redefinition.
 */
export type NormalizedJob = Omit<NormalizedOpportunity, "source"> & { source: string };

/** Re-exported, not redefined — the same search parameters the existing
 * search connectors already accept. */
export type ConnectorSearchParams = OpportunitySearchParams;

/**
 * The Normalized Application Result — Sprint 6, item 5. Deliberately
 * shaped to be mappable onto `ApplicationSubmission` (`prisma/schema.prisma`) —
 * `status`/`submittedAt`/`failureReason` mirror that model's
 * `result`/`submittedAt`/`failureReason` fields, and a real `apply()`
 * call's result is meant to eventually persist via
 * `SubmissionMethod.OFFICIAL_API`, the value the schema already reserves
 * for exactly this ("Reserved — not used by any code path today").
 *
 * Note: `features/applications/service.ts`'s `recordApplicationSubmission`
 * deliberately only accepts the three *manual* `SubmissionMethod` values
 * today, by design ("CareerOS has no real third-party
 * application-submission API for any connector... every submission this
 * creates is the record of something the user did themselves"). This
 * sprint does not change that function or that policy — see
 * `normalize.ts` and the README in `connectors/` for what wiring a real
 * connector's `apply()` result into persistence would require later.
 */
export interface NormalizedApplicationResult {
  status: "CONFIRMED" | "PENDING" | "FAILED";
  externalApplicationId: string | null;
  submittedAt: Date | null;
  failureReason: string | null;
}

/** Questionnaire support (Capability System) — free-form question id to
 * answer text; a connector's `apply()` decides how to map these onto its
 * portal's actual application form fields. */
export interface ConnectorApplyInput {
  jobId: string;
  resumeFileUrl: string;
  coverLetterText: string | null;
  answers: Record<string, string>;
}

/**
 * Deliberately abstract — a future OAuth connector's `login()` receives
 * an authorization code, a session-login connector receives credentials
 * entered through that portal's own hosted flow. Left unopinionated per
 * "do not implement real OAuth yet — just architecture."
 */
export interface ConnectorLoginInput {
  userId: string;
  payload: unknown;
}

export interface ConnectorConnectionState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/** Dashboard-facing — one row per known portal, classified from real
 * data only. See `manager.ts`'s `listConnectorSources`. */
export type ConnectorSourceState = "CONNECTED" | "SUPPORTED" | "UNAVAILABLE";

export interface ConnectorSourceSummary {
  id: string;
  name: string;
  state: ConnectorSourceState;
  /** Only set when `state` is `UNAVAILABLE` — reused verbatim from the
   * catalog's own `unavailableReason`, never invented here. */
  reason: string | null;
}
