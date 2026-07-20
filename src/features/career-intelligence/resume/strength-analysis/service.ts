import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildResumeStrengthAnalysisPrompt,
  RESUME_STRENGTH_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeStrengthAnalysisInputSchema,
  ResumeStrengthAnalysisOutputSchema,
} from "./schema";
import type {
  ResumeStrengthAnalysisInput,
  ResumeStrengthAnalysisOutput,
} from "./types";

export const analyzeResumeStrengths = createAnalysisService<
  ResumeStrengthAnalysisInput,
  ResumeStrengthAnalysisOutput
>({
  name: "resume.strength_analysis",
  inputSchema: ResumeStrengthAnalysisInputSchema,
  outputSchema: ResumeStrengthAnalysisOutputSchema,
  systemPrompt: RESUME_STRENGTH_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeStrengthAnalysisPrompt,
});
