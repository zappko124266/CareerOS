import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const JobMatchAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  jobDescription: z.string().min(1, "jobDescription is required"),
});

export const JobMatchAnalysisOutputSchema = z.object({
  matchScore: scoreSchema,
  matchedRequirements: z.array(z.string()),
  unmatchedRequirements: z.array(z.string()),
  recommendation: z.enum([
    "strong_match",
    "good_match",
    "stretch",
    "not_a_match",
  ]),
  summary: z.string(),
});
