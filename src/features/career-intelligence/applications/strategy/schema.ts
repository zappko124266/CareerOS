import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const ApplicationStrategyInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  jobDescription: z.string().min(1, "jobDescription is required"),
  companyName: z.string().min(1, "companyName is required"),
  roleTitle: z.string().min(1, "roleTitle is required"),
});

const judgmentFactorSchema = z.object({
  value: z.boolean(),
  reasoning: z.string(),
});

/** Only the factors that genuinely require judging resume/job *content* —
 * factors that are really a presence check (does a cover letter document
 * exist? is LinkedIn connected?) are computed in code by the domain layer
 * (`features/applications/service.ts`), never asked of the model, so they
 * can never be hallucinated. See `service.ts` for how these two halves are
 * merged into the full 9-factor `ApplicationStrategy`. */
export const ApplicationStrategyOutputSchema = z.object({
  needsTailoring: judgmentFactorSchema,
  needsAtsOptimization: judgmentFactorSchema,
  needsResumeRewrite: judgmentFactorSchema,
  needsSkillImprovement: judgmentFactorSchema,
  needsCertifications: judgmentFactorSchema,
  confidence: scoreSchema,
});
