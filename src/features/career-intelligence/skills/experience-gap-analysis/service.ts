import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildExperienceGapAnalysisPrompt,
  EXPERIENCE_GAP_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  ExperienceGapAnalysisInputSchema,
  ExperienceGapAnalysisOutputSchema,
} from "./schema";
import type {
  ExperienceGapAnalysisInput,
  ExperienceGapAnalysisOutput,
} from "./types";

export const analyzeExperienceGap = createAnalysisService<
  ExperienceGapAnalysisInput,
  ExperienceGapAnalysisOutput
>({
  name: "skills.experience_gap_analysis",
  inputSchema: ExperienceGapAnalysisInputSchema,
  outputSchema: ExperienceGapAnalysisOutputSchema,
  systemPrompt: EXPERIENCE_GAP_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildExperienceGapAnalysisPrompt,
});
