import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { buildCompanyRankingPrompt, COMPANY_RANKING_SYSTEM_PROMPT } from "./prompt";
import { CompanyRankingInputSchema, CompanyRankingOutputSchema } from "./schema";
import type { CompanyRankingInput, CompanyRankingOutput } from "./types";

const runCompanyRanking = createAnalysisService<
  CompanyRankingInput,
  CompanyRankingOutput
>({
  name: "discovery.company_ranking",
  inputSchema: CompanyRankingInputSchema,
  outputSchema: CompanyRankingOutputSchema,
  systemPrompt: COMPANY_RANKING_SYSTEM_PROMPT,
  buildPrompt: buildCompanyRankingPrompt,
});

/** Drops any ranking whose `companyName` doesn't match a company actually
 * sent in — same hallucinated-reference guard used throughout this
 * codebase's other AI services. */
export async function rankCompanies(
  input: CompanyRankingInput,
  deps: AIDependencies = {},
): Promise<CompanyRankingOutput> {
  const result = await runCompanyRanking(input, deps);
  const validNames = new Set(input.companies.map((company) => company.companyName));

  return {
    rankings: result.rankings.filter((ranking) => validNames.has(ranking.companyName)),
  };
}
