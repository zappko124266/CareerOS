"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { rankJobs } from "./service";
import type { JobRankingInput, JobRankingOutput } from "./types";

export async function rankJobsAction(
  input: JobRankingInput,
): Promise<AnalysisActionResult<JobRankingOutput>> {
  return runAnalysisAction("discovery.job_ranking", () => rankJobs(input));
}
