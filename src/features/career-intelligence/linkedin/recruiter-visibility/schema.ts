import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const RecruiterVisibilityAnalysisInputSchema = z.object({
  profileText: z.string().min(1, "profileText is required"),
  targetRole: z.string().optional(),
});

export const VisibilityFactorSchema = z.object({
  factor: z.string(),
  status: z.enum(["strong", "weak", "missing"]),
});

export const RecruiterVisibilityAnalysisOutputSchema = z.object({
  visibilityScore: scoreSchema,
  searchAppearanceFactors: z.array(VisibilityFactorSchema),
  suggestions: z.array(z.string()),
});
