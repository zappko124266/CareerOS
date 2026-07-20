import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const ResumeKeywordAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetJobDescription: z.string().min(1, "targetJobDescription is required"),
});

export const ResumeKeywordAnalysisOutputSchema = z.object({
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  keywordDensityScore: scoreSchema,
  suggestions: z.array(z.string()),
});
