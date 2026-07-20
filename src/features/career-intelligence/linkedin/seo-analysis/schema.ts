import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const LinkedInSeoAnalysisInputSchema = z.object({
  profileText: z.string().min(1, "profileText is required"),
  targetKeywords: z.array(z.string()).optional(),
});

export const KeywordCoverageSchema = z.object({
  keyword: z.string(),
  present: z.boolean(),
});

export const LinkedInSeoAnalysisOutputSchema = z.object({
  seoScore: scoreSchema,
  keywordCoverage: z.array(KeywordCoverageSchema),
  suggestions: z.array(z.string()),
});
