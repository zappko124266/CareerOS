import type { z } from "zod";

import type { OpportunityType } from "@/features/opportunities/types";
import type { DiscoveryPreference } from "@/generated/prisma/client";

import type {
  AvailabilityWindowSchema,
  ConnectorPreferenceInputSchema,
  DiscoveryDispositionSchema,
  DiscoveryFrequencySchema,
  DiscoveryPreferenceInputSchema,
  DiscoveryTriggerSchema,
  ExperienceLevelSchema,
  SearchPrioritySchema,
  SetCompanyDispositionInputSchema,
  SetListingDispositionInputSchema,
} from "./schema";

export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;
export type DiscoveryFrequency = z.infer<typeof DiscoveryFrequencySchema>;
export type DiscoveryDisposition = z.infer<typeof DiscoveryDispositionSchema>;
export type DiscoveryTrigger = z.infer<typeof DiscoveryTriggerSchema>;
export type SearchPriority = z.infer<typeof SearchPrioritySchema>;
export type DiscoveryPreferenceInput = z.infer<typeof DiscoveryPreferenceInputSchema>;
export type ConnectorPreferenceInput = z.infer<typeof ConnectorPreferenceInputSchema>;
export type SetListingDispositionInput = z.infer<typeof SetListingDispositionInputSchema>;
export type SetCompanyDispositionInput = z.infer<typeof SetCompanyDispositionInputSchema>;

/**
 * Builds a `DiscoveryPreferenceInput` from a possibly-`null` DB row —
 * shared by the Discovery Preferences panel and the Onboarding wizard so
 * both prefill/resume from the exact same real data, with the exact same
 * defaults, instead of two copies of this mapping drifting apart.
 */
export function buildDiscoveryPreferenceFormValue(
  preference: DiscoveryPreference | null,
): DiscoveryPreferenceInput {
  return {
    preferredRoles: (preference?.preferredRoles as string[]) ?? [],
    preferredCompanies: (preference?.preferredCompanies as string[]) ?? [],
    companyBlacklist: (preference?.companyBlacklist as string[]) ?? [],
    companyWhitelist: (preference?.companyWhitelist as string[]) ?? [],
    industries: (preference?.industries as string[]) ?? [],
    keywords: (preference?.keywords as string[]) ?? [],
    salaryMin: preference?.salaryMin ?? null,
    salaryMax: preference?.salaryMax ?? null,
    salaryCurrency: preference?.salaryCurrency ?? null,
    location: {
      countries: (preference?.countries as string[]) ?? [],
      states: (preference?.states as string[]) ?? [],
      cities: (preference?.cities as string[]) ?? [],
      remote: preference?.remote ?? true,
      hybrid: preference?.hybrid ?? true,
      onsite: preference?.onsite ?? true,
      radiusKm: preference?.radiusKm ?? null,
      openToRelocation: preference?.openToRelocation ?? false,
      openToInternationalRelocation: preference?.openToInternationalRelocation ?? false,
    },
    experienceLevel: (preference?.experienceLevel as ExperienceLevel | null) ?? null,
    availability: (preference?.availability as AvailabilityWindow | null) ?? null,
    discoveryFrequency: (preference?.discoveryFrequency as DiscoveryFrequency) ?? "DAILY",
    notifyInApp: preference?.notifyInApp ?? true,
    preferredCompanySize: preference?.preferredCompanySize ?? null,
    visaSponsorshipRequired: preference?.visaSponsorshipRequired ?? null,
    travelWillingness: preference?.travelWillingness ?? null,
    shiftPreference: preference?.shiftPreference ?? null,
    joiningTimeline: preference?.joiningTimeline ?? null,
    languages: (preference?.languages as string[]) ?? [],
    yearsOfExperience: preference?.yearsOfExperience ?? null,
    skills: (preference?.skills as string[]) ?? [],
    educationLevel: preference?.educationLevel ?? null,
    employmentTypes: (preference?.employmentTypes as OpportunityType[]) ?? [],
    searchPriorities: (preference?.searchPriorities as SearchPriority[]) ?? [],
    existingJobPortals: (preference?.existingJobPortals as string[]) ?? [],
  };
}

export interface LocationSummaryInput {
  countries: string[];
  states: string[];
  cities: string[];
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  openToRelocation: boolean;
}

/** Shared by the onboarding review step, the Dashboard, and the AI Coach
 * so all three describe a user's location preference identically instead
 * of three copies of this drifting apart. Only mentions work mode when
 * it's a genuine narrowing (not all three still on, the untouched
 * default) — showing "Remote/Hybrid/Onsite" back at someone who never
 * set a preference isn't personalization. */
export function buildLocationSummary(input: LocationSummaryInput): string | null {
  const parts: string[] = [];

  if (input.cities.length > 0) parts.push(input.cities.join(", "));
  else if (input.states.length > 0) parts.push(input.states.join(", "));
  else if (input.countries.length > 0) parts.push(input.countries.join(", "));

  const modes = [input.remote && "Remote", input.hybrid && "Hybrid", input.onsite && "Onsite"].filter(
    Boolean,
  );
  if (modes.length > 0 && modes.length < 3) parts.push(modes.join("/"));
  if (input.openToRelocation) parts.push("open to relocation");

  return parts.length > 0 ? parts.join(" — ") : null;
}

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

/** Plain-language labels for `OpportunityType`, reused as the "employment
 * type" vocabulary in onboarding — no separate taxonomy invented. */
export const EMPLOYMENT_TYPE_LABEL: Record<OpportunityType, string> = {
  JOB: "Full-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  CAMPUS: "Campus / entry program",
};

export const SEARCH_PRIORITY_LABEL: Record<SearchPriority, string> = {
  salary: "Salary",
  location: "Location",
  growth: "Career growth",
  work_life_balance: "Work-life balance",
  company_culture: "Company culture",
  remote_flexibility: "Remote flexibility",
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
