import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const ResumeAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetRole: z.string().optional(),
});

export const ResumeAnalysisOutputSchema = z.object({
  overallScore: scoreSchema,
  summary: z.string(),
  topStrengths: z.array(z.string()),
  topWeaknesses: z.array(z.string()),
  recommendedActions: z.array(z.string()),
});
