import { z } from "zod";

export const CareerProgressionInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  currentRole: z.string().optional(),
  careerGoal: z.string().optional(),
});

export const SuggestedRoleSchema = z.object({
  title: z.string(),
  rationale: z.string(),
});

export const CareerProgressionOutputSchema = z.object({
  suggestedNextRoles: z.array(SuggestedRoleSchema),
  skillsToDevelop: z.array(z.string()),
  timelineEstimate: z.string(),
  actionPlan: z.array(z.string()),
});
