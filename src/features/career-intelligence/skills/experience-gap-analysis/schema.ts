import { z } from "zod";

import {
  scoreSchema,
  severityLevelSchema,
} from "@/features/career-intelligence/analysis/schema";

export const ExperienceGapAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetJobDescription: z.string().min(1, "targetJobDescription is required"),
});

export const ExperienceGapSchema = z.object({
  requirement: z.string(),
  currentLevel: z.string(),
  requiredLevel: z.string(),
  severity: severityLevelSchema,
});

export const ExperienceGapAnalysisOutputSchema = z.object({
  gaps: z.array(ExperienceGapSchema),
  overallReadiness: scoreSchema,
  mitigationSuggestions: z.array(z.string()),
});
