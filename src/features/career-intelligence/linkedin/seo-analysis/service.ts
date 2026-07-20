import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildLinkedInSeoAnalysisPrompt,
  LINKEDIN_SEO_ANALYSIS_SYSTEM_PROMPT,
} from "./prompt";
import {
  LinkedInSeoAnalysisInputSchema,
  LinkedInSeoAnalysisOutputSchema,
} from "./schema";
import type {
  LinkedInSeoAnalysisInput,
  LinkedInSeoAnalysisOutput,
} from "./types";

export const analyzeLinkedInSeo = createAnalysisService<
  LinkedInSeoAnalysisInput,
  LinkedInSeoAnalysisOutput
>({
  name: "linkedin.seo_analysis",
  inputSchema: LinkedInSeoAnalysisInputSchema,
  outputSchema: LinkedInSeoAnalysisOutputSchema,
  systemPrompt: LINKEDIN_SEO_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildLinkedInSeoAnalysisPrompt,
});
