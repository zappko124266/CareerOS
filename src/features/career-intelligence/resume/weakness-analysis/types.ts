import type { z } from "zod";

import type {
  ResumeWeaknessAnalysisInputSchema,
  ResumeWeaknessAnalysisOutputSchema,
  ResumeWeaknessSchema,
} from "./schema";

export type ResumeWeaknessAnalysisInput = z.infer<
  typeof ResumeWeaknessAnalysisInputSchema
>;
export type ResumeWeaknessAnalysisOutput = z.infer<
  typeof ResumeWeaknessAnalysisOutputSchema
>;
export type ResumeWeakness = z.infer<typeof ResumeWeaknessSchema>;
