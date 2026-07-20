"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { tailorResume } from "./service";
import type { ResumeTailoringInput, ResumeTailoringOutput } from "./types";

export async function tailorResumeAction(
  input: ResumeTailoringInput,
): Promise<AnalysisActionResult<ResumeTailoringOutput>> {
  return runAnalysisAction("resume.tailoring", () => tailorResume(input));
}
