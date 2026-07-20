import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildSkillGapAnalysisPrompt,
  SKILL_GAP_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  SkillGapAnalysisInputSchema,
  SkillGapAnalysisOutputSchema,
} from "./schema";
import type { SkillGapAnalysisInput, SkillGapAnalysisOutput } from "./types";

export const analyzeSkillGap = createAnalysisService<
  SkillGapAnalysisInput,
  SkillGapAnalysisOutput
>({
  name: "skills.skill_gap_analysis",
  inputSchema: SkillGapAnalysisInputSchema,
  outputSchema: SkillGapAnalysisOutputSchema,
  systemPrompt: SKILL_GAP_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildSkillGapAnalysisPrompt,
});
