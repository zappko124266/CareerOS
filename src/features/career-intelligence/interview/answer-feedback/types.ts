import type { z } from "zod";

import type {
  AnswerFeedbackInputSchema,
  AnswerFeedbackOutputSchema,
} from "./schema";

export type AnswerFeedbackInput = z.infer<typeof AnswerFeedbackInputSchema>;
export type AnswerFeedbackOutput = z.infer<typeof AnswerFeedbackOutputSchema>;
