import { z } from "zod";

export const SalaryEstimationInputSchema = z.object({
  role: z.string().min(1, "role is required"),
  location: z.string().min(1, "location is required"),
  yearsOfExperience: z.number().min(0).max(60),
  skills: z.array(z.string()).optional(),
  currentSalary: z.number().min(0).optional(),
});

export const SalaryEstimationOutputSchema = z.object({
  estimatedRange: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }),
  percentile: z.string(),
  factors: z.array(z.string()),
  negotiationTips: z.array(z.string()),
  /** New this sprint (Module 8) — how this range compares to the broader
   * market for similar roles, one short paragraph. */
  marketComparison: z.string(),
  /** New this sprint — how the given location's cost of living should
   * shift expectations within the estimated range. */
  costOfLivingAdjustment: z.string(),
  /** New this sprint — a realistic near-term earning trajectory for this
   * role/experience level, one short paragraph. */
  growthProjection: z.string(),
});
