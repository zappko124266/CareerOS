import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { APPLICATION_STRATEGY_SYSTEM_PROMPT, buildApplicationStrategyPrompt } from "./prompt";
import { ApplicationStrategyInputSchema, ApplicationStrategyOutputSchema } from "./schema";
import type {
  ApplicationStrategyAiOutput,
  ApplicationStrategyAiResult,
  ApplicationStrategyInput,
} from "./types";

const runStrategy = createAnalysisService<
  ApplicationStrategyInput,
  ApplicationStrategyAiOutput
>({
  name: "applications.strategy",
  inputSchema: ApplicationStrategyInputSchema,
  outputSchema: ApplicationStrategyOutputSchema,
  systemPrompt: APPLICATION_STRATEGY_SYSTEM_PROMPT,
  buildPrompt: buildApplicationStrategyPrompt,
});

/**
 * Judges only the content-quality factors of an Application Strategy
 * (tailoring, ATS optimization, rewrite, skill improvement,
 * certifications) — the presence-based factors (cover letter, recruiter
 * message, portfolio, LinkedIn) are never asked of the model at all; the
 * domain layer (`features/applications/service.ts`) computes those from
 * real DB/resume state and merges them in, same
 * override-never-trust-the-model discipline as `applications/review`.
 */
export async function generateStrategyFactors(
  input: ApplicationStrategyInput,
  deps: AIDependencies = {},
): Promise<ApplicationStrategyAiResult> {
  const result = await runStrategy(input, deps);

  return {
    factors: {
      needsTailoring: result.needsTailoring,
      needsAtsOptimization: result.needsAtsOptimization,
      needsResumeRewrite: result.needsResumeRewrite,
      needsSkillImprovement: result.needsSkillImprovement,
      needsCertifications: result.needsCertifications,
    },
    confidence: result.confidence,
  };
}
