"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeRecruiterVisibility } from "./service";
import type {
  RecruiterVisibilityAnalysisInput,
  RecruiterVisibilityAnalysisOutput,
} from "./types";

export async function analyzeRecruiterVisibilityAction(
  input: RecruiterVisibilityAnalysisInput,
): Promise<AnalysisActionResult<RecruiterVisibilityAnalysisOutput>> {
  return runAnalysisAction("linkedin.recruiter_visibility", () =>
    analyzeRecruiterVisibility(input),
  );
}
