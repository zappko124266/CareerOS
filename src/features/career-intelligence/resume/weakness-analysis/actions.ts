"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeResumeWeaknesses } from "./service";
import type {
  ResumeWeaknessAnalysisInput,
  ResumeWeaknessAnalysisOutput,
} from "./types";

export async function analyzeResumeWeaknessesAction(
  input: ResumeWeaknessAnalysisInput,
): Promise<AnalysisActionResult<ResumeWeaknessAnalysisOutput>> {
  return runAnalysisAction("resume.weakness_analysis", () =>
    analyzeResumeWeaknesses(input),
  );
}
