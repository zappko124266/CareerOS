import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  INTERVIEW_FEEDBACK_ANALYSIS_SYSTEM_PROMPT,
  buildInterviewFeedbackAnalysisPrompt,
} from "./prompt";
import { InterviewFeedbackAnalysisInputSchema, InterviewFeedbackAnalysisOutputSchema } from "./schema";
import type { InterviewFeedbackAnalysisInput, InterviewFeedbackAnalysisOutput } from "./types";

export const analyzeInterviewFeedback = createAnalysisService<
  InterviewFeedbackAnalysisInput,
  InterviewFeedbackAnalysisOutput
>({
  name: "interview.feedback_analysis",
  inputSchema: InterviewFeedbackAnalysisInputSchema,
  outputSchema: InterviewFeedbackAnalysisOutputSchema,
  systemPrompt: INTERVIEW_FEEDBACK_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildInterviewFeedbackAnalysisPrompt,
});

export type { InterviewFeedbackAnalysisInput, InterviewFeedbackAnalysisOutput };
