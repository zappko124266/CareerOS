"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeResume } from "./service";
import type { ResumeAnalysisInput, ResumeAnalysisOutput } from "./types";

export async function analyzeResumeAction(
  input: ResumeAnalysisInput,
): Promise<AnalysisActionResult<ResumeAnalysisOutput>> {
  return runAnalysisAction("resume.resume_analysis", () =>
    analyzeResume(input),
  );
}
