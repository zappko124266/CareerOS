import { z } from "zod";

import { severityLevelSchema } from "@/features/career-intelligence/analysis/schema";

export const ResumeWeaknessAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
});

export const ResumeWeaknessSchema = z.object({
  area: z.string(),
  issue: z.string(),
  severity: severityLevelSchema,
  fix: z.string(),
});

export const ResumeWeaknessAnalysisOutputSchema = z.object({
  weaknesses: z.array(ResumeWeaknessSchema),
});
