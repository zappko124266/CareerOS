import { z } from "zod";

export const LinkedInExperienceImprovementInputSchema = z.object({
  profileText: z.string().min(1, "profileText is required"),
  targetRole: z.string().optional(),
});

export const ExperienceImprovementSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  reason: z.string(),
});

export const LinkedInExperienceImprovementOutputSchema = z.object({
  improvements: z.array(ExperienceImprovementSchema),
});
