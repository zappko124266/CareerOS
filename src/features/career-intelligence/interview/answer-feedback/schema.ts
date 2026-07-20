import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const AnswerFeedbackInputSchema = z.object({
  question: z.string().min(1, "question is required"),
  userAnswer: z.string().min(1, "userAnswer is required"),
  jobDescription: z.string().optional(),
});

export const AnswerFeedbackOutputSchema = z.object({
  score: scoreSchema,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  /** A rewritten, STAR-structured version of the user's own answer —
   * built from what they actually said, never a fabricated story with
   * details the user never provided. */
  improvedAnswer: z.string(),
});
