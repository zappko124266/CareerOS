"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeJobMatch } from "./service";
import type { JobMatchAnalysisInput, JobMatchAnalysisOutput } from "./types";

export async function analyzeJobMatchAction(
  input: JobMatchAnalysisInput,
): Promise<AnalysisActionResult<JobMatchAnalysisOutput>> {
  return runAnalysisAction("jobs.job_match_analysis", () =>
    analyzeJobMatch(input),
  );
}
