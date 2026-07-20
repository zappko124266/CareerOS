import { z } from "zod";

export const ResumeStrengthAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
});

export const ResumeStrengthSchema = z.object({
  area: z.string(),
  evidence: z.string(),
  impact: z.enum(["high", "medium", "low"]),
});

export const ResumeStrengthAnalysisOutputSchema = z.object({
  strengths: z.array(ResumeStrengthSchema),
  standoutFactor: z.string(),
});
