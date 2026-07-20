"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeInterviewReadiness } from "./service";
import type {
  InterviewReadinessInput,
  InterviewReadinessOutput,
} from "./types";

export async function analyzeInterviewReadinessAction(
  input: InterviewReadinessInput,
): Promise<AnalysisActionResult<InterviewReadinessOutput>> {
  return runAnalysisAction("interview.interview_readiness", () =>
    analyzeInterviewReadiness(input),
  );
}
