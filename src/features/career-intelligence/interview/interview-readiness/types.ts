import type { z } from "zod";

import type {
  InterviewReadinessInputSchema,
  InterviewReadinessOutputSchema,
  LikelyQuestionSchema,
} from "./schema";

export type InterviewReadinessInput = z.infer<
  typeof InterviewReadinessInputSchema
>;
export type InterviewReadinessOutput = z.infer<
  typeof InterviewReadinessOutputSchema
>;
export type LikelyQuestion = z.infer<typeof LikelyQuestionSchema>;
