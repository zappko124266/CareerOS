import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import { ANSWER_FEEDBACK_SYSTEM_PROMPT, buildAnswerFeedbackPrompt } from "./prompt";
import { AnswerFeedbackInputSchema, AnswerFeedbackOutputSchema } from "./schema";
import type { AnswerFeedbackInput, AnswerFeedbackOutput } from "./types";

export const analyzeAnswerFeedback = createAnalysisService<
  AnswerFeedbackInput,
  AnswerFeedbackOutput
>({
  name: "interview.answer_feedback",
  inputSchema: AnswerFeedbackInputSchema,
  outputSchema: AnswerFeedbackOutputSchema,
  systemPrompt: ANSWER_FEEDBACK_SYSTEM_PROMPT,
  buildPrompt: buildAnswerFeedbackPrompt,
});

export type { AnswerFeedbackInput, AnswerFeedbackOutput };
