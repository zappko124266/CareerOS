import type { z } from "zod";

import type {
  ApplicationReviewInputSchema,
  ApplicationReviewOutputSchema,
} from "./schema";

export type ApplicationReviewInput = z.infer<typeof ApplicationReviewInputSchema>;
export type ApplicationReviewAiOutput = z.infer<typeof ApplicationReviewOutputSchema>;

/** One transparent, explained readiness factor. `available: false` means
 * this factor couldn't be scored (e.g. no cover letter exists yet) —
 * `score` is always `0` in that case and must never be averaged in as if
 * it were a real low score. */
export interface ReadinessFactor {
  score: number;
  explanation: string;
  available: boolean;
}

export const READINESS_FACTOR_KEYS = [
  "resumeQuality",
  "jobMatch",
  "coverLetterQuality",
  "emailQuality",
  "keywordCoverage",
  "requiredSkillsCoverage",
  "linkedinCompleteness",
] as const;
export type ReadinessFactorKey = (typeof READINESS_FACTOR_KEYS)[number];

export type ReadinessFactors = Record<ReadinessFactorKey, ReadinessFactor>;

/** What `reviewApplication` actually returns — the AI's qualitative
 * findings plus a fully-explained, availability-aware factor breakdown and
 * a code-computed (never AI-reported) overall readiness average. */
export interface ApplicationReviewOutput
  extends Omit<ApplicationReviewAiOutput, "factors"> {
  factors: ReadinessFactors;
  overallReadiness: number;
}
