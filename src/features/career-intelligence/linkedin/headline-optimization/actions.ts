"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { optimizeLinkedInHeadline } from "./service";
import type {
  HeadlineOptimizationInput,
  HeadlineOptimizationOutput,
} from "./types";

export async function optimizeLinkedInHeadlineAction(
  input: HeadlineOptimizationInput,
): Promise<AnalysisActionResult<HeadlineOptimizationOutput>> {
  return runAnalysisAction("linkedin.headline_optimization", () =>
    optimizeLinkedInHeadline(input),
  );
}
