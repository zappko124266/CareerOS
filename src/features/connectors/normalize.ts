import type { NormalizedOpportunity } from "@/features/opportunities/providers/types";

import type { NormalizedApplicationResult, NormalizedJob } from "./types";

/**
 * The Normalized Job Model's identity mapping — Sprint 6. `NormalizedJob`
 * already *is* `NormalizedOpportunity`'s shape (`types.ts`), so a
 * universal connector whose portal id happens to also be one of the 8
 * existing `OpportunityProviderId`s can pass its result straight through
 * this. This function exists to document that reuse at the call site,
 * not to add logic.
 */
export function toNormalizedJob(opportunity: NormalizedOpportunity): NormalizedJob {
  return opportunity;
}

/**
 * Maps a connector's `apply()` result onto the field names
 * `ApplicationSubmission` (`prisma/schema.prisma`) already uses for a
 * submission record — `status` -> `result`, `submittedAt`, `failureReason`
 * carry over unchanged. This is intentionally a pure reshape, not a
 * persistence call: `features/applications/service.ts`'s
 * `recordApplicationSubmission` only accepts the three *manual*
 * `SubmissionMethod` values today, by deliberate policy ("CareerOS has
 * no real third-party application-submission API for any connector...
 * every submission this creates is the record of something the user did
 * themselves"). Wiring a real connector's `apply()` result into
 * persistence via `SubmissionMethod.OFFICIAL_API` is future work that
 * requires deliberately revisiting that policy — not something this
 * sprint's architecture-only scope changes. See `connectors/README.md`.
 */
export function toApplicationSubmissionFields(result: NormalizedApplicationResult): {
  result: NormalizedApplicationResult["status"];
  submittedAt: Date | null;
  failureReason: string | null;
  notes: string | null;
} {
  return {
    result: result.status,
    submittedAt: result.submittedAt,
    failureReason: result.failureReason,
    notes: result.externalApplicationId ? `External application id: ${result.externalApplicationId}` : null,
  };
}
