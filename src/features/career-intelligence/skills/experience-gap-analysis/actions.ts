"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeExperienceGap } from "./service";
import type {
  ExperienceGapAnalysisInput,
  ExperienceGapAnalysisOutput,
} from "./types";

export async function analyzeExperienceGapAction(
  input: ExperienceGapAnalysisInput,
): Promise<AnalysisActionResult<ExperienceGapAnalysisOutput>> {
  return runAnalysisAction("skills.experience_gap_analysis", () =>
    analyzeExperienceGap(input),
  );
}
