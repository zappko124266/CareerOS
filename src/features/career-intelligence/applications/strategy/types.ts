import type { z } from "zod";

import type {
  ApplicationStrategyInputSchema,
  ApplicationStrategyOutputSchema,
} from "./schema";

export type ApplicationStrategyInput = z.infer<typeof ApplicationStrategyInputSchema>;
export type ApplicationStrategyAiOutput = z.infer<typeof ApplicationStrategyOutputSchema>;

export interface StrategyFactor {
  value: boolean;
  reasoning: string;
}

export const STRATEGY_FACTOR_KEYS = [
  "needsTailoring",
  "needsAtsOptimization",
  "needsCoverLetter",
  "needsRecruiterMessage",
  "needsPortfolio",
  "needsCertifications",
  "needsLinkedinUpdate",
  "needsResumeRewrite",
  "needsSkillImprovement",
] as const;
export type StrategyFactorKey = (typeof STRATEGY_FACTOR_KEYS)[number];

export type StrategyFactors = Record<StrategyFactorKey, StrategyFactor>;

/** The AI-judged subset of `StrategyFactors` — what `generateStrategyFactors`
 * (this module's `service.ts`) actually returns. The remaining
 * presence-based factors are merged in by the domain layer. */
export type JudgmentFactorKey =
  | "needsTailoring"
  | "needsAtsOptimization"
  | "needsResumeRewrite"
  | "needsSkillImprovement"
  | "needsCertifications";

export interface ApplicationStrategyAiResult {
  factors: Record<JudgmentFactorKey, StrategyFactor>;
  confidence: number;
}
