import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildRecruiterVisibilityPrompt,
  RECRUITER_VISIBILITY_SYSTEM_PROMPT,
} from "./prompt";
import {
  RecruiterVisibilityAnalysisInputSchema,
  RecruiterVisibilityAnalysisOutputSchema,
} from "./schema";
import type {
  RecruiterVisibilityAnalysisInput,
  RecruiterVisibilityAnalysisOutput,
} from "./types";

export const analyzeRecruiterVisibility = createAnalysisService<
  RecruiterVisibilityAnalysisInput,
  RecruiterVisibilityAnalysisOutput
>({
  name: "linkedin.recruiter_visibility",
  inputSchema: RecruiterVisibilityAnalysisInputSchema,
  outputSchema: RecruiterVisibilityAnalysisOutputSchema,
  systemPrompt: RECRUITER_VISIBILITY_SYSTEM_PROMPT,
  buildPrompt: buildRecruiterVisibilityPrompt,
});
