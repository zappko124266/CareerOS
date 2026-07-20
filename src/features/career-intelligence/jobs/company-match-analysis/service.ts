import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildCompanyMatchAnalysisPrompt,
  COMPANY_MATCH_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  CompanyMatchAnalysisInputSchema,
  CompanyMatchAnalysisOutputSchema,
} from "./schema";
import type {
  CompanyMatchAnalysisInput,
  CompanyMatchAnalysisOutput,
} from "./types";

export const analyzeCompanyMatch = createAnalysisService<
  CompanyMatchAnalysisInput,
  CompanyMatchAnalysisOutput
>({
  name: "jobs.company_match_analysis",
  inputSchema: CompanyMatchAnalysisInputSchema,
  outputSchema: CompanyMatchAnalysisOutputSchema,
  systemPrompt: COMPANY_MATCH_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildCompanyMatchAnalysisPrompt,
});
