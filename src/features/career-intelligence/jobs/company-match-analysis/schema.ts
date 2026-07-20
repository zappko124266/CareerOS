import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const CompanyMatchAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  companyName: z.string().min(1, "companyName is required"),
  companyDescription: z.string().optional(),
  companyValues: z.array(z.string()).optional(),
});

export const CompanyMatchAnalysisOutputSchema = z.object({
  cultureFitScore: scoreSchema,
  alignmentPoints: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  talkingPoints: z.array(z.string()),
});
