"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeResumeStrengths } from "./service";
import type {
  ResumeStrengthAnalysisInput,
  ResumeStrengthAnalysisOutput,
} from "./types";

export async function analyzeResumeStrengthsAction(
  input: ResumeStrengthAnalysisInput,
): Promise<AnalysisActionResult<ResumeStrengthAnalysisOutput>> {
  return runAnalysisAction("resume.strength_analysis", () =>
    analyzeResumeStrengths(input),
  );
}
