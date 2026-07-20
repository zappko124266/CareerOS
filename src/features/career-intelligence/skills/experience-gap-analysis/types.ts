import type { z } from "zod";

import type {
  ExperienceGapAnalysisInputSchema,
  ExperienceGapAnalysisOutputSchema,
  ExperienceGapSchema,
} from "./schema";

export type ExperienceGapAnalysisInput = z.infer<
  typeof ExperienceGapAnalysisInputSchema
>;
export type ExperienceGapAnalysisOutput = z.infer<
  typeof ExperienceGapAnalysisOutputSchema
>;
export type ExperienceGap = z.infer<typeof ExperienceGapSchema>;
