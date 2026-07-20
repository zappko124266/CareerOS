"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeResumeAts } from "./service";
import type { ResumeAtsAnalysisInput, ResumeAtsAnalysisOutput } from "./types";

export async function analyzeResumeAtsAction(
  input: ResumeAtsAnalysisInput,
): Promise<AnalysisActionResult<ResumeAtsAnalysisOutput>> {
  return runAnalysisAction("resume.ats_analysis", () =>
    analyzeResumeAts(input),
  );
}
