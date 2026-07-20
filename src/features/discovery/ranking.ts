import "server-only";

import type { JobRankingResult } from "@/features/career-intelligence/discovery/job-ranking/types";
import type { CompanyRankingResult } from "@/features/career-intelligence/discovery/company-ranking/types";
import { findCountry, findState } from "@/features/location/service";
import { decodeCityKey, decodeStateKey } from "@/features/location/types";

import type {
  CompanyMatchFactors,
  JobMatchFactors,
  OpportunityScoreV2Factors,
  RankingFactor,
} from "./types";

/**
 * Deterministic ranking factors — computed in code, never asked of the AI,
 * because they're facts the app can check directly (a location string
 * match, a number comparison, a list lookup, a count) rather than
 * something requiring language understanding. Keeping these out of the
 * AI call also means they can never be hallucinated. The AI-scored
 * factors (resumeMatch, skillsMatch, experienceMatch, industryMatch for
 * jobs; industryMatch, roleAlignment for companies) come from
 * `job-ranking`/`company-ranking` and are merged in by
 * `mergeJobFactors`/`mergeCompanyFactors` below — `overallScore` is always
 * this module's own weighted average of `available` factors, never a
 * number the AI reports directly, same discipline as Application Studio's
 * `overallReadiness`.
 */

export interface DeterministicLocationPreference {
  countries: string[];
  states: string[];
  cities: string[];
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  openToRelocation: boolean;
}

export interface DeterministicCompanyPreference {
  preferredCompanies: string[];
  companyWhitelist: string[];
  companyBlacklist: string[];
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().trim();
}

export function computeLocationMatch(
  job: { location: string | null; remote: boolean },
  preference: DeterministicLocationPreference,
): RankingFactor {
  if (job.remote && preference.remote) {
    return { score: 100, explanation: "This job is remote and you're open to remote work.", available: true };
  }

  if (!job.location) {
    return {
      score: 50,
      explanation: "This listing doesn't state a location, so location can't be compared.",
      available: false,
    };
  }

  const haystack = normalizeForMatch(job.location);
  const locationNames = [
    ...preference.countries.map((code) => findCountry(code)?.name).filter((v): v is string => Boolean(v)),
    ...preference.states
      .map((key) => {
        const decoded = decodeStateKey(key);
        return decoded ? findState(decoded.countryCode, decoded.stateCode)?.name : undefined;
      })
      .filter((v): v is string => Boolean(v)),
    ...preference.cities
      .map((key) => decodeCityKey(key)?.cityName)
      .filter((v): v is string => Boolean(v)),
  ];

  const matched = locationNames.some((name) => haystack.includes(normalizeForMatch(name)));

  if (matched) {
    return { score: 100, explanation: `This job's location ("${job.location}") matches one of your preferred locations.`, available: true };
  }

  if (preference.openToRelocation) {
    return {
      score: 60,
      explanation: `This job's location ("${job.location}") isn't one of your preferred locations, but you're open to relocation.`,
      available: true,
    };
  }

  if (locationNames.length === 0) {
    return {
      score: 50,
      explanation: "No location preferences are set yet, so this can't be compared.",
      available: false,
    };
  }

  return {
    score: 20,
    explanation: `This job's location ("${job.location}") doesn't match your preferred locations, and you're not marked as open to relocation.`,
    available: true,
  };
}

export function computeSalaryMatch(
  job: { salaryMin: number | null; salaryMax: number | null },
  preference: { salaryMin: number | null; salaryMax: number | null },
): RankingFactor {
  if (job.salaryMin === null && job.salaryMax === null) {
    return { score: 50, explanation: "This listing doesn't state a salary.", available: false };
  }
  if (preference.salaryMin === null && preference.salaryMax === null) {
    return { score: 50, explanation: "No salary expectation is set yet.", available: false };
  }

  const jobMax = job.salaryMax ?? job.salaryMin!;
  const jobMin = job.salaryMin ?? job.salaryMax!;
  const wantMin = preference.salaryMin ?? 0;
  const wantMax = preference.salaryMax ?? Infinity;

  const overlaps = jobMax >= wantMin && jobMin <= wantMax;

  if (overlaps) {
    return {
      score: 100,
      explanation: `This job's stated range overlaps with your expected salary range.`,
      available: true,
    };
  }

  if (jobMax < wantMin) {
    const gapPct = Math.round(((wantMin - jobMax) / wantMin) * 100);
    return {
      score: Math.max(0, 100 - gapPct),
      explanation: `This job's stated maximum is below your expected minimum by about ${gapPct}%.`,
      available: true,
    };
  }

  return {
    score: 90,
    explanation: "This job's stated range is above your expected range.",
    available: true,
  };
}

export function computeCompanyPreferenceMatch(
  companyName: string,
  preference: DeterministicCompanyPreference,
): RankingFactor {
  const name = normalizeForMatch(companyName);

  if (preference.companyBlacklist.some((entry) => normalizeForMatch(entry) === name)) {
    return { score: 0, explanation: `${companyName} is on your company blacklist.`, available: true };
  }
  if (preference.companyWhitelist.some((entry) => normalizeForMatch(entry) === name)) {
    return { score: 100, explanation: `${companyName} is on your company whitelist.`, available: true };
  }
  if (preference.preferredCompanies.some((entry) => normalizeForMatch(entry) === name)) {
    return { score: 100, explanation: `${companyName} is one of your preferred companies.`, available: true };
  }

  return {
    score: 55,
    explanation: `${companyName} isn't on any of your company lists — a neutral starting point.`,
    available: true,
  };
}

export function computeHiringActivitySignal(openRolesInBatch: number): RankingFactor {
  if (openRolesInBatch <= 1) {
    return {
      score: 40,
      explanation: "Only one open role from this company was found in this run.",
      available: true,
    };
  }

  const score = Math.min(100, openRolesInBatch * 20);
  return {
    score,
    explanation: `${openRolesInBatch} open roles from this company were found in this run — a real signal of active hiring, not an estimate.`,
    available: true,
  };
}

function average(factors: RankingFactor[]): number {
  const available = factors.filter((factor) => factor.available);
  if (available.length === 0) return 0;
  return Math.round(available.reduce((sum, factor) => sum + factor.score, 0) / available.length);
}

export function mergeJobFactors(
  aiResult: Omit<JobRankingResult, "sourceId" | "recommendation">,
  deterministic: {
    locationMatch: RankingFactor;
    salaryMatch: RankingFactor;
    companyPreferenceMatch: RankingFactor;
    recentHiringActivity: RankingFactor;
  },
): { factors: JobMatchFactors; overallScore: number } {
  const factors: JobMatchFactors = {
    resumeMatch: { ...aiResult.resumeMatch, available: true },
    skillsMatch: { ...aiResult.skillsMatch, available: true },
    experienceMatch: { ...aiResult.experienceMatch, available: true },
    industryMatch: { ...aiResult.industryMatch, available: true },
    ...deterministic,
  };

  return { factors, overallScore: average(Object.values(factors)) };
}

export interface CareerGoalMatchInput {
  targetRole: string | null;
  targetCompanies: string[];
  targetSalaryMin: number | null;
  targetSalaryMax: number | null;
  targetLocation: string | null;
}

/** Module 12's "Career Goal Alignment" factor — a real, code-computed
 * comparison against the user's own `CareerGoal` fields, never an AI
 * guess at what the user wants. */
export function computeCareerGoalAlignment(
  opportunity: { title: string; companyName: string; salaryMin: number | null; salaryMax: number | null; location: string | null },
  goal: CareerGoalMatchInput | null,
): RankingFactor {
  if (!goal) {
    return { score: 50, explanation: "No career goal set yet, so this can't be compared.", available: false };
  }

  let points = 0;
  let checks = 0;

  if (goal.targetRole) {
    checks += 1;
    if (normalizeForMatch(opportunity.title).includes(normalizeForMatch(goal.targetRole))) points += 1;
  }
  if (goal.targetCompanies.length > 0) {
    checks += 1;
    if (goal.targetCompanies.some((name) => normalizeForMatch(name) === normalizeForMatch(opportunity.companyName))) points += 1;
  }
  if (goal.targetSalaryMin !== null || goal.targetSalaryMax !== null) {
    checks += 1;
    const jobMax = opportunity.salaryMax ?? opportunity.salaryMin;
    if (jobMax !== null && jobMax >= (goal.targetSalaryMin ?? 0)) points += 1;
  }
  if (goal.targetLocation) {
    checks += 1;
    if (opportunity.location && normalizeForMatch(opportunity.location).includes(normalizeForMatch(goal.targetLocation))) points += 1;
  }

  if (checks === 0) {
    return { score: 50, explanation: "Your career goal doesn't specify enough detail to compare yet.", available: false };
  }

  const score = Math.round((points / checks) * 100);
  return {
    score,
    explanation: `Matches ${points} of ${checks} of your stated career goal criteria (role, company, salary, location).`,
    available: true,
  };
}

/** Module 12's "Recruiter Connection" factor — real: does the user
 * already have a `Recruiter` (with at least one logged interaction) tied
 * to this opportunity's company? Never fabricated. */
export function computeRecruiterConnection(hasConnectedRecruiter: boolean): RankingFactor {
  return hasConnectedRecruiter
    ? { score: 100, explanation: "You already have a recruiter contact tracked at this company.", available: true }
    : { score: 40, explanation: "No recruiter contact tracked at this company yet.", available: true };
}

export interface CompanyHealthInput {
  hiringFrequencyLast90Days: number;
  totalOpportunities: number;
}

/** Module 12's "Company Health" factor — real: derived from
 * `features/companies/service.ts`'s `getCompanyAggregates` (real hiring
 * activity across every user, same connector-honesty discipline as
 * `computeHiringActivitySignal` above), not a fabricated rating. */
export function computeCompanyHealth(input: CompanyHealthInput | null): RankingFactor {
  if (!input || input.totalOpportunities === 0) {
    return { score: 50, explanation: "Not enough listings on file for this company yet to assess.", available: false };
  }

  const score = Math.min(100, 40 + input.hiringFrequencyLast90Days * 15);
  return {
    score,
    explanation: `${input.hiringFrequencyLast90Days} new listing(s) from this company in the last 90 days, out of ${input.totalOpportunities} on file.`,
    available: true,
  };
}

/** Sprint 9, Module 7's "Career Gap Readiness" factor — reads the
 * *latest already-persisted* `ExperienceGapAssessment` row for this
 * opportunity (see that model's doc comment in `prisma/schema.prisma`)
 * rather than triggering a fresh `analyzeExperienceGap` AI call on every
 * score view, keeping this whole score computation AI-free and instant. */
export function computeCareerGapReadiness(
  latestAssessment: { overallReadiness: number } | null,
): RankingFactor {
  if (!latestAssessment) {
    return {
      score: 0,
      explanation: "No career gap analysis has been run for this opportunity yet.",
      available: false,
    };
  }
  return {
    score: latestAssessment.overallReadiness,
    explanation: `Your last career gap analysis for this opportunity scored you ${latestAssessment.overallReadiness}% ready.`,
    available: true,
  };
}

/** Sprint 9, Module 7's "ATS Readiness" factor — reuses the resume's
 * existing, already-persisted `ResumeAnalysis.overallScore` (Resume
 * Studio) rather than a new AI call, so this factor is also free. */
export function computeAtsReadiness(
  latestAnalysis: { overallScore: number } | null,
): RankingFactor {
  if (!latestAnalysis) {
    return {
      score: 0,
      explanation: "The resume attached to this opportunity hasn't been analyzed yet.",
      available: false,
    };
  }
  return {
    score: latestAnalysis.overallScore,
    explanation: `The attached resume's last ATS analysis scored ${latestAnalysis.overallScore}/100.`,
    available: true,
  };
}

/** Blends the existing `JobMatchFactors` (already computed for this
 * opportunity, e.g. from its originating `DiscoveredListing` — `null`
 * when unavailable, in which case those 8 factors are marked
 * unavailable rather than re-triggering a fresh AI ranking call just for
 * this) with the 5 additional Opportunity Score factors. */
export function mergeOpportunityScoreV2Factors(
  baseFactors: JobMatchFactors | null,
  additional: {
    careerGoalAlignment: RankingFactor;
    recruiterConnection: RankingFactor;
    companyHealth: RankingFactor;
    careerGapReadiness: RankingFactor;
    atsReadiness: RankingFactor;
  },
): { factors: OpportunityScoreV2Factors; overallScore: number } {
  const unavailableBase = (label: string): RankingFactor => ({
    score: 0,
    explanation: `${label} hasn't been computed for this opportunity yet.`,
    available: false,
  });

  const factors: OpportunityScoreV2Factors = {
    resumeMatch: baseFactors?.resumeMatch ?? unavailableBase("Resume match"),
    skillsMatch: baseFactors?.skillsMatch ?? unavailableBase("Skills match"),
    experienceMatch: baseFactors?.experienceMatch ?? unavailableBase("Experience match"),
    industryMatch: baseFactors?.industryMatch ?? unavailableBase("Industry match"),
    locationMatch: baseFactors?.locationMatch ?? unavailableBase("Location match"),
    salaryMatch: baseFactors?.salaryMatch ?? unavailableBase("Salary match"),
    companyPreferenceMatch: baseFactors?.companyPreferenceMatch ?? unavailableBase("Company preference"),
    recentHiringActivity: baseFactors?.recentHiringActivity ?? unavailableBase("Recent hiring activity"),
    ...additional,
  };

  return { factors, overallScore: average(Object.values(factors)) };
}

export function mergeCompanyFactors(
  aiResult: Omit<CompanyRankingResult, "companyName" | "recommendation">,
  deterministic: {
    companyPreferenceMatch: RankingFactor;
    hiringActivity: RankingFactor;
  },
): { factors: CompanyMatchFactors; overallScore: number } {
  const factors: CompanyMatchFactors = {
    industryMatch: { ...aiResult.industryMatch, available: true },
    roleAlignment: { ...aiResult.roleAlignment, available: true },
    ...deterministic,
  };

  return { factors, overallScore: average(Object.values(factors)) };
}
