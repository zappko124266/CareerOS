import { z } from "zod";

export const LinkedInProfileInputSchema = z.object({
  profileText: z.string().trim().min(1, "Paste your profile text first."),
  headline: z.string().trim().max(220).nullable(),
  targetRole: z.string().trim().max(200).nullable(),
});
