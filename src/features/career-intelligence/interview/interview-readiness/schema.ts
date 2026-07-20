import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const InterviewReadinessInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  jobDescription: z.string().min(1, "jobDescription is required"),
  interviewType: z.enum(["behavioral", "technical", "mixed"]).optional(),
});

export const LikelyQuestionSchema = z.object({
  question: z.string(),
  category: z.string(),
});

export const InterviewReadinessOutputSchema = z.object({
  readinessScore: scoreSchema,
  likelyQuestions: z.array(LikelyQuestionSchema),
  suggestedTalkingPoints: z.array(z.string()),
  areasToStrengthen: z.array(z.string()),
});
