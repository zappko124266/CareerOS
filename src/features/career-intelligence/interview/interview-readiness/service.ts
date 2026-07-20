import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildInterviewReadinessPrompt,
  INTERVIEW_READINESS_SYSTEM_PROMPT,
} from "./prompt";
import {
  InterviewReadinessInputSchema,
  InterviewReadinessOutputSchema,
} from "./schema";
import type {
  InterviewReadinessInput,
  InterviewReadinessOutput,
} from "./types";

export const analyzeInterviewReadiness = createAnalysisService<
  InterviewReadinessInput,
  InterviewReadinessOutput
>({
  name: "interview.interview_readiness",
  inputSchema: InterviewReadinessInputSchema,
  outputSchema: InterviewReadinessOutputSchema,
  systemPrompt: INTERVIEW_READINESS_SYSTEM_PROMPT,
  buildPrompt: buildInterviewReadinessPrompt,
});
