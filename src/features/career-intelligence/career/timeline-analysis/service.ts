import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildCareerTimelineAnalysisPrompt,
  CAREER_TIMELINE_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  CareerTimelineAnalysisInputSchema,
  CareerTimelineAnalysisOutputSchema,
} from "./schema";
import type {
  CareerTimelineAnalysisInput,
  CareerTimelineAnalysisOutput,
} from "./types";

export const analyzeCareerTimeline = createAnalysisService<
  CareerTimelineAnalysisInput,
  CareerTimelineAnalysisOutput
>({
  name: "career.timeline_analysis",
  inputSchema: CareerTimelineAnalysisInputSchema,
  outputSchema: CareerTimelineAnalysisOutputSchema,
  systemPrompt: CAREER_TIMELINE_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildCareerTimelineAnalysisPrompt,
});
