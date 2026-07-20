import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import {
  AI_SEARCH_STRATEGY_SYSTEM_PROMPT,
  buildAiSearchStrategyPrompt,
} from "./prompt";
import {
  AiSearchStrategyInputSchema,
  AiSearchStrategyOutputSchema,
} from "./schema";
import type { AiSearchStrategyInput, AiSearchStrategyOutput } from "./types";

const runSearchStrategy = createAnalysisService<
  AiSearchStrategyInput,
  AiSearchStrategyOutput
>({
  name: "discovery.search_strategy",
  inputSchema: AiSearchStrategyInputSchema,
  outputSchema: AiSearchStrategyOutputSchema,
  systemPrompt: AI_SEARCH_STRATEGY_SYSTEM_PROMPT,
  buildPrompt: buildAiSearchStrategyPrompt,
});

export async function buildSearchStrategy(
  input: AiSearchStrategyInput,
  deps: AIDependencies = {},
): Promise<AiSearchStrategyOutput> {
  return runSearchStrategy(input, deps);
}
