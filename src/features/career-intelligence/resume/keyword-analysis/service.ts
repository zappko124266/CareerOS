import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildResumeKeywordAnalysisPrompt,
  RESUME_KEYWORD_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeKeywordAnalysisInputSchema,
  ResumeKeywordAnalysisOutputSchema,
} from "./schema";
import type {
  ResumeKeywordAnalysisInput,
  ResumeKeywordAnalysisOutput,
} from "./types";

export const analyzeResumeKeywords = createAnalysisService<
  ResumeKeywordAnalysisInput,
  ResumeKeywordAnalysisOutput
>({
  name: "resume.keyword_analysis",
  inputSchema: ResumeKeywordAnalysisInputSchema,
  outputSchema: ResumeKeywordAnalysisOutputSchema,
  systemPrompt: RESUME_KEYWORD_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeKeywordAnalysisPrompt,
});
