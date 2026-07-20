import { z } from "zod";

export const AboutOptimizationInputSchema = z
  .object({
    currentAbout: z.string().optional(),
    resumeText: z.string().optional(),
    targetRole: z.string().optional(),
    tone: z.string().optional(),
  })
  .refine((input) => Boolean(input.currentAbout || input.resumeText), {
    message: "Provide at least one of currentAbout or resumeText",
  });

export const AboutOptimizationOutputSchema = z.object({
  optimizedAbout: z.string(),
  keyPointsHighlighted: z.array(z.string()),
  rationale: z.string(),
});
