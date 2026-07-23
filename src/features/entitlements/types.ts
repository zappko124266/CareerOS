/** Mirrors `MeteredFeature` in `prisma/schema.prisma` — independent literal
 * list rather than importing the generated enum, same convention used
 * throughout this codebase (e.g. `OpportunityStatus` in
 * `features/opportunities/schema.ts`). */
export const METERED_FEATURES = [
  "RESUME_TAILORING",
  "RESUME_EXPORT",
  "APPLICATION_DOCUMENT_GENERATION",
  "APPLICATION_REVIEW",
  "APPLICATION_EXPORT",
  "COMPANY_SNAPSHOT",
  "JOB_DISCOVERY_RUN",
  "APPLICATION_STRATEGY",
  "FOLLOW_UP_RECOMMENDATION",
  "ANALYTICS_INSIGHTS",
  "INTERVIEW_PREP",
  "COMPANY_RESEARCH",
  "SALARY_ESTIMATE",
  "CAREER_HEALTH_SCORE",
  "OFFER_COMPARISON",
  "CAREER_GAP_ASSESSMENT",
  "LINKEDIN_ANALYSIS",
  "GMAIL_SYNC",
  "CALENDAR_SYNC",
] as const;
export type MeteredFeature = (typeof METERED_FEATURES)[number];

export type PlanTier = "FREE" | "PRO";

export interface EntitlementCheck {
  allowed: boolean;
  planTier: PlanTier;
  used: number;
  /** `null` means unlimited for this plan/feature. */
  limit: number | null;
  remaining: number | null;
  /** True when `limit` came from an admin `EntitlementOverride` row rather
   * than the plan-tier `PLAN_LIMITS` default — surfaced so the UI can be
   * transparent about why a user's limit differs from their plan. */
  overridden: boolean;
}

export interface EntitlementOverrideInput {
  userId: string;
  feature: MeteredFeature;
  /** `null` clears the limit (unlimited); omit/delete the row entirely to
   * remove the override and fall back to the plan-tier default. */
  customLimit: number | null;
  reason: string;
}
