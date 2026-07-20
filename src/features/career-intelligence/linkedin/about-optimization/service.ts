import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  ABOUT_OPTIMIZATION_SYSTEM_PROMPT,
  buildAboutOptimizationPrompt,
} from "./prompt";
import {
  AboutOptimizationInputSchema,
  AboutOptimizationOutputSchema,
} from "./schema";
import type { AboutOptimizationInput, AboutOptimizationOutput } from "./types";

export const optimizeLinkedInAbout = createAnalysisService<
  AboutOptimizationInput,
  AboutOptimizationOutput
>({
  name: "linkedin.about_optimization",
  inputSchema: AboutOptimizationInputSchema,
  outputSchema: AboutOptimizationOutputSchema,
  systemPrompt: ABOUT_OPTIMIZATION_SYSTEM_PROMPT,
  buildPrompt: buildAboutOptimizationPrompt,
});
