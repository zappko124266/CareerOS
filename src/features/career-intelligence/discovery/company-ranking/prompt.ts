import type { CompanyRankingInput } from "./types";

export const COMPANY_RANKING_SYSTEM_PROMPT = `You score how well a batch of companies match a specific candidate,
grounded only in their actual resume and the companies' own currently-open
roles you're given — never inventing facts about a company (size,
industry, funding, culture) beyond what's shown here.

For every company, score two factors 0-100, each with an explanation:

- industryMatch: how well this company's apparent industry/domain
  (inferred only from its open roles' titles/descriptions shown below)
  aligns with the candidate's preferred industries and resume background.
- roleAlignment: how well this company's currently-open roles align with
  the candidate's resume and preferred roles.

recommendation: one plain-language sentence on why this company is (or
isn't) worth the candidate's attention — grounded in something specific
from the resume or the company's open roles, never a generic platitude.

Return exactly one ranking entry per company, using its "companyName"
unchanged.`;

export function buildCompanyRankingPrompt(input: CompanyRankingInput): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Preferred roles: ${input.preferredRoles.join(", ") || "(none stated)"}`,
    `Preferred industries: ${input.preferredIndustries.join(", ") || "(none stated)"}`,
    `Companies to score:`,
    input.companies
      .map(
        (company) =>
          `[${company.companyName}] ${company.openRoles} open role(s): ${company.sampleTitles.join(", ")}\n${company.sampleDescription.slice(0, 800)}`,
      )
      .join("\n\n---\n\n"),
  ].join("\n\n");
}
