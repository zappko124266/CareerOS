"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeCareerTimeline } from "./service";
import type {
  CareerTimelineAnalysisInput,
  CareerTimelineAnalysisOutput,
} from "./types";

export async function analyzeCareerTimelineAction(
  input: CareerTimelineAnalysisInput,
): Promise<AnalysisActionResult<CareerTimelineAnalysisOutput>> {
  return runAnalysisAction("career.timeline_analysis", () =>
    analyzeCareerTimeline(input),
  );
}
