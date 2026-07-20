import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildResumeAnalysisPrompt,
  RESUME_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeAnalysisInputSchema,
  ResumeAnalysisOutputSchema,
} from "./schema";
import type { ResumeAnalysisInput, ResumeAnalysisOutput } from "./types";

export const analyzeResume = createAnalysisService<
  ResumeAnalysisInput,
  ResumeAnalysisOutput
>({
  name: "resume.resume_analysis",
  inputSchema: ResumeAnalysisInputSchema,
  outputSchema: ResumeAnalysisOutputSchema,
  systemPrompt: RESUME_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeAnalysisPrompt,
});
