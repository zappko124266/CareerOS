import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildResumeAtsAnalysisPrompt,
  RESUME_ATS_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeAtsAnalysisInputSchema,
  ResumeAtsAnalysisOutputSchema,
} from "./schema";
import type { ResumeAtsAnalysisInput, ResumeAtsAnalysisOutput } from "./types";

export const analyzeResumeAts = createAnalysisService<
  ResumeAtsAnalysisInput,
  ResumeAtsAnalysisOutput
>({
  name: "resume.ats_analysis",
  inputSchema: ResumeAtsAnalysisInputSchema,
  outputSchema: ResumeAtsAnalysisOutputSchema,
  systemPrompt: RESUME_ATS_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeAtsAnalysisPrompt,
});
