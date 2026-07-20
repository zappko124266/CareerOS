"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeSkillGap } from "./service";
import type { SkillGapAnalysisInput, SkillGapAnalysisOutput } from "./types";

export async function analyzeSkillGapAction(
  input: SkillGapAnalysisInput,
): Promise<AnalysisActionResult<SkillGapAnalysisOutput>> {
  return runAnalysisAction("skills.skill_gap_analysis", () =>
    analyzeSkillGap(input),
  );
}
