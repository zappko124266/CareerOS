import type { z } from "zod";

import type {
  MissingSkillSchema,
  SkillGapAnalysisInputSchema,
  SkillGapAnalysisOutputSchema,
} from "./schema";

export type SkillGapAnalysisInput = z.infer<typeof SkillGapAnalysisInputSchema>;
export type SkillGapAnalysisOutput = z.infer<
  typeof SkillGapAnalysisOutputSchema
>;
export type MissingSkill = z.infer<typeof MissingSkillSchema>;
