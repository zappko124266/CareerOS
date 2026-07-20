import { z } from "zod";

export const HeadlineOptimizationInputSchema = z.object({
  currentHeadline: z.string().optional(),
  targetRole: z.string().min(1, "targetRole is required"),
  keySkills: z.array(z.string()).optional(),
});

export const HeadlineOptimizationOutputSchema = z.object({
  optimizedHeadlines: z.array(z.string()).min(1),
  rationale: z.string(),
});
