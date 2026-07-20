import { z } from "zod";

export const TailoringBulletInputSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});

export const ResumeTailoringInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetJobDescription: z.string().min(1, "targetJobDescription is required"),
  /** The specific bullets to suggest rewrites for, each carrying a stable
   * client-generated id so the AI's suggestions can be matched back to the
   * exact bullet in the Resume Builder's editor state — the model never
   * invents which bullet it's revising. */
  bullets: z.array(TailoringBulletInputSchema).min(1).max(30),
});

export const BulletSuggestionSchema = z.object({
  bulletId: z.string(),
  tailoredText: z.string(),
  reason: z.string(),
});

export const ResumeTailoringOutputSchema = z.object({
  tailoredSummary: z.string(),
  bulletSuggestions: z.array(BulletSuggestionSchema),
  keywordsToEmphasize: z.array(z.string()),
});
