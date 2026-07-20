"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { buildSearchStrategy } from "./service";
import type { AiSearchStrategyInput, AiSearchStrategyOutput } from "./types";

export async function buildSearchStrategyAction(
  input: AiSearchStrategyInput,
): Promise<AnalysisActionResult<AiSearchStrategyOutput>> {
  return runAnalysisAction("discovery.search_strategy", () => buildSearchStrategy(input));
}
