import type { z } from "zod";

import type {
  RecruiterVisibilityAnalysisInputSchema,
  RecruiterVisibilityAnalysisOutputSchema,
  VisibilityFactorSchema,
} from "./schema";

export type RecruiterVisibilityAnalysisInput = z.infer<
  typeof RecruiterVisibilityAnalysisInputSchema
>;
export type RecruiterVisibilityAnalysisOutput = z.infer<
  typeof RecruiterVisibilityAnalysisOutputSchema
>;
export type VisibilityFactor = z.infer<typeof VisibilityFactorSchema>;
