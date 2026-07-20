import type { z } from "zod";

import type {
  ResumeStrengthAnalysisInputSchema,
  ResumeStrengthAnalysisOutputSchema,
  ResumeStrengthSchema,
} from "./schema";

export type ResumeStrengthAnalysisInput = z.infer<
  typeof ResumeStrengthAnalysisInputSchema
>;
export type ResumeStrengthAnalysisOutput = z.infer<
  typeof ResumeStrengthAnalysisOutputSchema
>;
export type ResumeStrength = z.infer<typeof ResumeStrengthSchema>;
