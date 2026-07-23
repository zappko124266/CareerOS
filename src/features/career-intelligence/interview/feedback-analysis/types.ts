import type { z } from "zod";

import type {
  InterviewFeedbackAnalysisInputSchema,
  InterviewFeedbackAnalysisOutputSchema,
} from "./schema";

export type InterviewFeedbackAnalysisInput = z.infer<typeof InterviewFeedbackAnalysisInputSchema>;
export type InterviewFeedbackAnalysisOutput = z.infer<typeof InterviewFeedbackAnalysisOutputSchema>;
