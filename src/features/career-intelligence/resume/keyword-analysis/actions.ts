"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeResumeKeywords } from "./service";
import type {
  ResumeKeywordAnalysisInput,
  ResumeKeywordAnalysisOutput,
} from "./types";

export async function analyzeResumeKeywordsAction(
  input: ResumeKeywordAnalysisInput,
): Promise<AnalysisActionResult<ResumeKeywordAnalysisOutput>> {
  return runAnalysisAction("resume.keyword_analysis", () =>
    analyzeResumeKeywords(input),
  );
}
