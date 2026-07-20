import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildJobMatchAnalysisPrompt,
  JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  JobMatchAnalysisInputSchema,
  JobMatchAnalysisOutputSchema,
} from "./schema";
import type { JobMatchAnalysisInput, JobMatchAnalysisOutput } from "./types";

export const analyzeJobMatch = createAnalysisService<
  JobMatchAnalysisInput,
  JobMatchAnalysisOutput
>({
  name: "jobs.job_match_analysis",
  inputSchema: JobMatchAnalysisInputSchema,
  outputSchema: JobMatchAnalysisOutputSchema,
  systemPrompt: JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildJobMatchAnalysisPrompt,
});
