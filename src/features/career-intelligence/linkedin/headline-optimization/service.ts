import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildHeadlineOptimizationPrompt,
  HEADLINE_OPTIMIZATION_SYSTEM_PROMPT,
} from "./prompt";
import {
  HeadlineOptimizationInputSchema,
  HeadlineOptimizationOutputSchema,
} from "./schema";
import type {
  HeadlineOptimizationInput,
  HeadlineOptimizationOutput,
} from "./types";

export const optimizeLinkedInHeadline = createAnalysisService<
  HeadlineOptimizationInput,
  HeadlineOptimizationOutput
>({
  name: "linkedin.headline_optimization",
  inputSchema: HeadlineOptimizationInputSchema,
  outputSchema: HeadlineOptimizationOutputSchema,
  systemPrompt: HEADLINE_OPTIMIZATION_SYSTEM_PROMPT,
  buildPrompt: buildHeadlineOptimizationPrompt,
});
