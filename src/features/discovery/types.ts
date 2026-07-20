import type { z } from "zod";

import type {
  AvailabilityWindowSchema,
  ConnectorPreferenceInputSchema,
  DiscoveryDispositionSchema,
  DiscoveryFrequencySchema,
  DiscoveryPreferenceInputSchema,
  DiscoveryTriggerSchema,
  ExperienceLevelSchema,
  SetCompanyDispositionInputSchema,
  SetListingDispositionInputSchema,
} from "./schema";

export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;
export type DiscoveryFrequency = z.infer<typeof DiscoveryFrequencySchema>;
export type DiscoveryDisposition = z.infer<typeof DiscoveryDispositionSchema>;
export type DiscoveryTrigger = z.infer<typeof DiscoveryTriggerSchema>;
export type DiscoveryPreferenceInput = z.infer<typeof DiscoveryPreferenceInputSchema>;
export type ConnectorPreferenceInput = z.infer<typeof ConnectorPreferenceInputSchema>;
export type SetListingDispositionInput = z.infer<typeof SetListingDispositionInputSchema>;
export type SetCompanyDispositionInput = z.infer<typeof SetCompanyDispositionInputSchema>;

export const EXPERIENCE_LEVEL_LABEL: Record<ExperienceLevel, string> = {
  ENTRY: "Entry-level",
  MID: "Mid-level",
  SENIOR: "Senior",
  LEAD: "Lead",
  EXECUTIVE: "Executive",
};

export const AVAILABILITY_LABEL: Record<AvailabilityWindow, string> = {
  IMMEDIATE: "Immediately",
  TWO_WEEKS: "Within 2 weeks",
  ONE_MONTH: "Within a month",
  FLEXIBLE: "Flexible",
  NOT_LOOKING: "Not actively looking",
};

export const DISCOVERY_FREQUENCY_LABEL: Record<DiscoveryFrequency, string> = {
  HOURLY: "Every hour",
  DAILY: "Once a day",
  WEEKLY: "Once a week",
  MANUAL_ONLY: "Only when I ask",
};

/** One explainable, 0-100 ranking factor. `available: false` means this
 * factor couldn't be computed (e.g. the job listed no salary) — `score`
 * is always `0` in that case and must never be averaged in as a real low
 * score, same convention as Application Studio's `ReadinessFactor`. */
export interface RankingFactor {
  score: number;
  explanation: string;
  available: boolean;
}

export interface JobMatchFactors {
  resumeMatch: RankingFactor;
  skillsMatch: RankingFactor;
  experienceMatch: RankingFactor;
  industryMatch: RankingFactor;
  locationMatch: RankingFactor;
  salaryMatch: RankingFactor;
  companyPreferenceMatch: RankingFactor;
  recentHiringActivity: RankingFactor;
}

export interface CompanyMatchFactors {
  industryMatch: RankingFactor;
  roleAlignment: RankingFactor;
  companyPreferenceMatch: RankingFactor;
  hiringActivity: RankingFactor;
}

export const JOB_MATCH_FACTOR_LABEL: Record<keyof JobMatchFactors, string> = {
  resumeMatch: "Resume Match",
  skillsMatch: "Skills Match",
  experienceMatch: "Experience Match",
  industryMatch: "Industry Preference",
  locationMatch: "Location Match",
  salaryMatch: "Salary Match",
  companyPreferenceMatch: "Company Preference",
  recentHiringActivity: "Recent Hiring Activity",
};

export const COMPANY_MATCH_FACTOR_LABEL: Record<keyof CompanyMatchFactors, string> = {
  industryMatch: "Industry Match",
  roleAlignment: "Role Alignment",
  companyPreferenceMatch: "Company Preference",
  hiringActivity: "Hiring Activity",
};

/**
 * Module 12 — Career Opportunity Score V2. Extends (not replaces)
 * `JobMatchFactors` with 3 additional real, code-computed factors —
 * deliberately not the full 14-factor wishlist some sprint briefs ask
 * for: "Growth", "Promotion", and "Competition" would require external
 * market data CareerOS has no source for, and fabricating them would
 * violate the "never fabricate" rule this codebase holds everywhere
 * else. Only applied to already-*saved* `Opportunity` rows (via
 * `computeOpportunityScoreV2` in `features/discovery/ranking.ts`), not
 * the live Discovery pipeline's bounded per-run scoring — a fresh
 * `DiscoveredListing` has no linked `Company`/`Recruiter`/`CareerGoal`
 * data yet for these factors to mean anything.
 */
export interface OpportunityScoreV2Factors extends JobMatchFactors {
  careerGoalAlignment: RankingFactor;
  recruiterConnection: RankingFactor;
  companyHealth: RankingFactor;
  /** Sprint 9, Module 7 — see `computeCareerGapReadiness` in `ranking.ts`. */
  careerGapReadiness: RankingFactor;
  /** Sprint 9, Module 7 — see `computeAtsReadiness` in `ranking.ts`. */
  atsReadiness: RankingFactor;
}

export const OPPORTUNITY_SCORE_V2_FACTOR_LABEL: Record<keyof OpportunityScoreV2Factors, string> = {
  ...JOB_MATCH_FACTOR_LABEL,
  careerGoalAlignment: "Career Goal Alignment",
  recruiterConnection: "Recruiter Connection",
  companyHealth: "Company Health",
  careerGapReadiness: "Career Gap Readiness",
  atsReadiness: "ATS Readiness",
};
