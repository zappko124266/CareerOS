import type { Company } from "@/generated/prisma/client";

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
}
