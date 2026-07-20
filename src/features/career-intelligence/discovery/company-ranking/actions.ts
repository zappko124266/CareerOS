"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { rankCompanies } from "./service";
import type { CompanyRankingInput, CompanyRankingOutput } from "./types";

export async function rankCompaniesAction(
  input: CompanyRankingInput,
): Promise<AnalysisActionResult<CompanyRankingOutput>> {
  return runAnalysisAction("discovery.company_ranking", () => rankCompanies(input));
}
