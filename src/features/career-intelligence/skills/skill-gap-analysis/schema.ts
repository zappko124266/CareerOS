import { z } from "zod";

import { importanceLevelSchema } from "@/features/career-intelligence/analysis/schema";

export const SkillGapAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetRole: z.string().min(1, "targetRole is required"),
});

export const MissingSkillSchema = z.object({
  skill: z.string(),
  importance: importanceLevelSchema,
});

export const SkillGapAnalysisOutputSchema = z.object({
  existingSkills: z.array(z.string()),
  missingSkills: z.array(MissingSkillSchema),
  learningPath: z.array(z.string()),
});
