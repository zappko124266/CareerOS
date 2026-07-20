"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { optimizeLinkedInAbout } from "./service";
import type { AboutOptimizationInput, AboutOptimizationOutput } from "./types";

export async function optimizeLinkedInAboutAction(
  input: AboutOptimizationInput,
): Promise<AnalysisActionResult<AboutOptimizationOutput>> {
  return runAnalysisAction("linkedin.about_optimization", () =>
    optimizeLinkedInAbout(input),
  );
}
