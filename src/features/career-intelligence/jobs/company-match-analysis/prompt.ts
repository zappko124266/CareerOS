import type { CompanyMatchAnalysisInput } from "./types";

export const COMPANY_MATCH_ANALYSIS_SYSTEM_PROMPT = `You assess how well a candidate's background and apparent working style fit
a specific company — culture fit, not job-requirement fit.

Use the company description/values if given; otherwise reason from the
company name's general reputation only if you're confident, and say
plainly when you're inferring rather than working from given facts.
alignmentPoints are genuine connections between the resume's evidence
(company sizes/stages worked at, described working style, stated values)
and the target company. potentialConcerns are honest possible mismatches
(e.g. only startup experience applying to a large regulated enterprise, or
vice versa) — don't fabricate concerns just to have something to list.
talkingPoints are specific things the candidate could raise in an interview
to demonstrate genuine fit.`;

export function buildCompanyMatchAnalysisPrompt(
  input: CompanyMatchAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Target company: ${input.companyName}`,
    input.companyDescription
      ? `Company description:\n---\n${input.companyDescription}\n---`
      : "",
    input.companyValues?.length
      ? `Stated company values: ${input.companyValues.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
