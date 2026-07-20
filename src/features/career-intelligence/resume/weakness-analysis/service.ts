import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildResumeWeaknessAnalysisPrompt,
  RESUME_WEAKNESS_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeWeaknessAnalysisInputSchema,
  ResumeWeaknessAnalysisOutputSchema,
} from "./schema";
import type {
  ResumeWeaknessAnalysisInput,
  ResumeWeaknessAnalysisOutput,
} from "./types";

export const analyzeResumeWeaknesses = createAnalysisService<
  ResumeWeaknessAnalysisInput,
  ResumeWeaknessAnalysisOutput
>({
  name: "resume.weakness_analysis",
  inputSchema: ResumeWeaknessAnalysisInputSchema,
  outputSchema: ResumeWeaknessAnalysisOutputSchema,
  systemPrompt: RESUME_WEAKNESS_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeWeaknessAnalysisPrompt,
});
