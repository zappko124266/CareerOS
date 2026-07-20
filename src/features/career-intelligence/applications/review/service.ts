import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { APPLICATION_REVIEW_SYSTEM_PROMPT, buildApplicationReviewPrompt } from "./prompt";
import { ApplicationReviewInputSchema, ApplicationReviewOutputSchema } from "./schema";
import type {
  ApplicationReviewAiOutput,
  ApplicationReviewInput,
  ApplicationReviewOutput,
  ReadinessFactor,
  ReadinessFactors,
} from "./types";

const runReview = createAnalysisService<
  ApplicationReviewInput,
  ApplicationReviewAiOutput
>({
  name: "applications.review",
  inputSchema: ApplicationReviewInputSchema,
  outputSchema: ApplicationReviewOutputSchema,
  systemPrompt: APPLICATION_REVIEW_SYSTEM_PROMPT,
  buildPrompt: buildApplicationReviewPrompt,
});

const NO_COVER_LETTER: ReadinessFactor = {
  score: 0,
  explanation: "No cover letter has been drafted yet for this application.",
  available: false,
};

const NO_EMAIL: ReadinessFactor = {
  score: 0,
  explanation: "No email has been drafted yet for this application.",
  available: false,
};

const LINKEDIN_NOT_CONNECTED: ReadinessFactor = {
  score: 0,
  explanation:
    "LinkedIn isn't connected yet — CareerOS has no verified LinkedIn data for this factor.",
  available: false,
};

/**
 * Runs the AI Application Review, then overrides `coverLetterQuality` /
 * `emailQuality` in code whenever the corresponding content wasn't actually
 * provided — never trusting the model's own judgment about availability,
 * so a hallucinated score can't slip through for a document that doesn't
 * exist. `linkedinCompleteness` is never sent to the AI at all: CareerOS
 * has no real LinkedIn integration (see `AccountConnection`), so this
 * factor is always a fixed, honest "not available" rather than a fabricated
 * estimate. `overallReadiness` is a plain code-computed average of every
 * `available` factor — deliberately not something the AI reports directly,
 * so the number on screen is always traceable to the factors next to it.
 */
export async function reviewApplication(
  input: ApplicationReviewInput,
  deps: AIDependencies = {},
): Promise<ApplicationReviewOutput> {
  const result = await runReview(input, deps);

  const hasCoverLetter = Boolean(input.coverLetterContent?.trim());
  const hasEmail = Boolean(input.emailContent?.trim());

  const factors: ReadinessFactors = {
    resumeQuality: { ...result.factors.resumeQuality, available: true },
    jobMatch: { ...result.factors.jobMatch, available: true },
    keywordCoverage: { ...result.factors.keywordCoverage, available: true },
    requiredSkillsCoverage: { ...result.factors.requiredSkillsCoverage, available: true },
    coverLetterQuality: hasCoverLetter
      ? { ...result.factors.coverLetterQuality, available: true }
      : NO_COVER_LETTER,
    emailQuality: hasEmail
      ? { ...result.factors.emailQuality, available: true }
      : NO_EMAIL,
    linkedinCompleteness: LINKEDIN_NOT_CONNECTED,
  };

  const availableScores = Object.values(factors)
    .filter((factor) => factor.available)
    .map((factor) => factor.score);

  const overallReadiness =
    availableScores.length > 0
      ? Math.round(
          availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length,
        )
      : 0;

  return { ...result, factors, overallReadiness };
}
