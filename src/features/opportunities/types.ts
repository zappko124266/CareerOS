import type { z } from "zod";

import type { OpportunitySource as PrismaOpportunitySource } from "@/generated/prisma/client";

import type {
  ChecklistItemSchema,
  ChecklistSchema,
  CustomQuestionSchema,
  CustomQuestionsSchema,
  OpportunitySearchInputSchema,
  OpportunitySourceSchema,
  OpportunityStatusSchema,
  OpportunityTypeSchema,
  SaveOpportunityInputSchema,
  StatusHistoryEntrySchema,
  StatusHistorySchema,
  UpdateChecklistInputSchema,
  UpdateCustomQuestionsInputSchema,
  UpdateNotesInputSchema,
  UpdateStatusInputSchema,
} from "./schema";

export type OpportunityType = z.infer<typeof OpportunityTypeSchema>;
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;
export type OpportunitySource = z.infer<typeof OpportunitySourceSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Checklist = z.infer<typeof ChecklistSchema>;
export type CustomQuestion = z.infer<typeof CustomQuestionSchema>;
export type CustomQuestions = z.infer<typeof CustomQuestionsSchema>;
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>;
export type StatusHistory = z.infer<typeof StatusHistorySchema>;
export type OpportunitySearchInput = z.infer<typeof OpportunitySearchInputSchema>;
export type SaveOpportunityInput = z.infer<typeof SaveOpportunityInputSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusInputSchema>;
export type UpdateChecklistInput = z.infer<typeof UpdateChecklistInputSchema>;
export type UpdateCustomQuestionsInput = z.infer<typeof UpdateCustomQuestionsInputSchema>;
export type UpdateNotesInput = z.infer<typeof UpdateNotesInputSchema>;

/** Ordered stages for rendering the Timeline UI — not every opportunity
 * passes through every stage (a rejection can happen at any point), but
 * this is the canonical forward order the UI uses to render progress. */
export const STATUS_ORDER: OpportunityStatus[] = [
  "DISCOVERED",
  "SAVED",
  "READY",
  "PREPARING",
  "READY_FOR_REVIEW",
  "AWAITING_APPROVAL",
  "APPLIED",
  "APPLICATION_VIEWED",
  "RECRUITER_CONTACT",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "JOINED",
];

/** Terminal-but-off-the-happy-path statuses — surfaced separately from
 * `STATUS_ORDER` in pickers/timelines since they can happen at any point
 * rather than being a forward step, same rationale as `ARCHIVED`. */
export const STATUS_OFF_PATH: OpportunityStatus[] = ["DECLINED", "REJECTED", "WITHDRAWN", "ARCHIVED"];

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  DISCOVERED: "Discovered",
  SAVED: "Saved",
  READY: "Ready to apply",
  PREPARING: "Preparing",
  READY_FOR_REVIEW: "Ready for review",
  AWAITING_APPROVAL: "Awaiting your approval",
  APPLIED: "Applied",
  APPLICATION_VIEWED: "Application viewed",
  RECRUITER_CONTACT: "Recruiter contact",
  SHORTLISTED: "Shortlisted",
  ASSESSMENT: "Assessment",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  DECLINED: "Declined offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  JOINED: "Joined",
  ARCHIVED: "Archived",
};

export const PROVIDER_LABEL: Record<OpportunitySource, string> = {
  adzuna: "Adzuna",
  jooble: "Jooble",
  arbeitnow: "Arbeitnow",
  remoteok: "RemoteOK",
  greenhouse: "Greenhouse-hosted careers",
  lever: "Lever-hosted careers",
  usajobs: "USAJobs",
  reed: "Reed",
};

/**
 * Bridges the provider layer's lowercase ids (`OpportunityProviderId`,
 * matching this codebase's `AIProviderId` convention) to the Prisma
 * `OpportunitySource` enum's uppercase values (matching this codebase's
 * other DB enums, e.g. `ResumeStatus`). Both conventions are correct for
 * their own layer; this is the one place they're translated.
 */
export const PROVIDER_TO_DB_SOURCE = {
  adzuna: "ADZUNA",
  jooble: "JOOBLE",
  arbeitnow: "ARBEITNOW",
  remoteok: "REMOTEOK",
  greenhouse: "GREENHOUSE",
  lever: "LEVER",
  usajobs: "USAJOBS",
  reed: "REED",
} as const satisfies Record<OpportunitySource, string>;

/** Sprint 2 (Opportunity Intelligence) — the single shared vocabulary for
 * "how good a fit is this," used both by the AI-powered Job Match
 * Analysis (`JobMatchAnalysisOutputSchema.recommendation`, which already
 * used these exact 4 literals) and by the deterministic Opportunity
 * Intelligence Engine's tier classification (`features/opportunities/intelligence.ts`).
 * One label map, not two copies (previously duplicated verbatim in
 * `match-panel.tsx` and `job-match-card.tsx`). */
export const RECOMMENDATION_TIERS = ["strong_match", "good_match", "stretch", "not_a_match"] as const;
export type RecommendationTier = (typeof RECOMMENDATION_TIERS)[number];
export const RECOMMENDATION_TIER_LABEL: Record<RecommendationTier, string> = {
  strong_match: "Strong match",
  good_match: "Good match",
  stretch: "Stretch",
  not_a_match: "Not a match",
};

/** The inverse of `PROVIDER_TO_DB_SOURCE` — needed wherever code starts
 * from a `Prisma.OpportunitySource` value already (e.g. `DiscoveredListing.source`)
 * and has to call back into `saveOpportunity`, which takes the lowercase
 * provider id. Keyed by the full Prisma enum (which also has `MANUAL`, a
 * value with no corresponding connector) — `Partial` because `MANUAL`
 * deliberately has no entry; callers must handle a possible `undefined`. */
export const DB_SOURCE_TO_PROVIDER: Partial<Record<PrismaOpportunitySource, OpportunitySource>> =
  Object.fromEntries(
    Object.entries(PROVIDER_TO_DB_SOURCE).map(([provider, dbSource]) => [dbSource, provider]),
  );
