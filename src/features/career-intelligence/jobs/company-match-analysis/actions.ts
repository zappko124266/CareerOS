"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeCompanyMatch } from "./service";
import type {
  CompanyMatchAnalysisInput,
  CompanyMatchAnalysisOutput,
} from "./types";

export async function analyzeCompanyMatchAction(
  input: CompanyMatchAnalysisInput,
): Promise<AnalysisActionResult<CompanyMatchAnalysisOutput>> {
  return runAnalysisAction("jobs.company_match_analysis", () =>
    analyzeCompanyMatch(input),
  );
}
