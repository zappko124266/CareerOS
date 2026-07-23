import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const InterviewFeedbackAnalysisInputSchema = z.object({
  roundLabel: z.string().optional(),
  jobDescription: z.string().optional(),
  feedback: z.string().min(1, "feedback is required"),
});

export const InterviewFeedbackAnalysisOutputSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  followUpAdvice: z.array(z.string()),
  /** 0-100 — likelihood of advancing to the next round, grounded only in
   * what the user's own notes describe (tone, outcome cues, stated next
   * steps) — not a market-wide guess. */
  nextStageProbability: scoreSchema,
});
