import type { Company } from "@/generated/prisma/client";
import type { EnrichedRecruiter } from "@/features/recruiters/orchestrator";

export interface CompanyAggregates {
  totalOpportunities: number;
  remoteCount: number;
  onsiteCount: number;
  locations: string[];
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  salaryCurrency: string | null;
  /** Real count of opportunities from this company first seen in the
   * last 90 days — the honest "Hiring Frequency" signal, never a fabricated
   * trend line. */
  hiringFrequencyLast90Days: number;
  /** Keyed by `SubmissionMethod` — real counts from `ApplicationSubmission`
   * rows across every user who's applied to this company. */
  applicationMethodCounts: Record<string, number>;
  /** Average of real, user-submitted `Interview.difficultyRating` values
   * (1-5) for this company — `null` when nobody has rated one yet. */
  averageInterviewDifficulty: number | null;
  interviewDifficultySampleSize: number;
}

export interface CompanyIntelligence {
  company: Company;
  aggregates: CompanyAggregates;
  /** Sprint 21 (Recruiter Intelligence & Networking Operating System),
   * Module 14 — *this user's own* recruiters at this company (`Recruiter`
   * is per-user, unlike `Company`/`aggregates` above which are shared
   * across every user — see `Recruiter`'s own doc comment). Empty when
   * the caller doesn't pass a `userId` (kept optional so this stays a
   * pure additive change to `getCompanyIntelligence`'s signature). */
  recruiters: EnrichedRecruiter[];
}
