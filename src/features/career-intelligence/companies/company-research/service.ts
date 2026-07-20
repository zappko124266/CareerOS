import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { buildCompanyResearchPrompt, COMPANY_RESEARCH_SYSTEM_PROMPT } from "./prompt";
import { CompanyResearchInputSchema, CompanyResearchOutputSchema } from "./schema";
import type { CompanyResearchInput, CompanyResearchOutput } from "./types";

const runCompanyResearch = createAnalysisService<
  CompanyResearchInput,
  CompanyResearchOutput
>({
  name: "companies.company_research",
  inputSchema: CompanyResearchInputSchema,
  outputSchema: CompanyResearchOutputSchema,
  systemPrompt: COMPANY_RESEARCH_SYSTEM_PROMPT,
  buildPrompt: buildCompanyResearchPrompt,
});

export async function researchCompany(
  input: CompanyResearchInput,
  deps: AIDependencies = {},
): Promise<CompanyResearchOutput> {
  const result = await runCompanyResearch(input, deps);

  return {
    ...result,
    highlights: result.highlights.map((entry) => entry.trim()).filter(Boolean),
    caveats: result.caveats.map((entry) => entry.trim()).filter(Boolean),
  };
}
