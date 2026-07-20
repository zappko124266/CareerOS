"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { reviewApplication } from "./service";
import type { ApplicationReviewInput, ApplicationReviewOutput } from "./types";

export async function reviewApplicationAction(
  input: ApplicationReviewInput,
): Promise<AnalysisActionResult<ApplicationReviewOutput>> {
  return runAnalysisAction("applications.review", () => reviewApplication(input));
}
