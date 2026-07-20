import type { LinkedInSeoAnalysisInput } from "./types";

export const LINKEDIN_SEO_ANALYSIS_SYSTEM_PROMPT = `You evaluate a LinkedIn profile's discoverability in LinkedIn's own search
and Google search results — this is about keyword placement in the
headline, about section, experience entries, and skills list, not about
prose quality.

If target keywords are given, report whether each appears in the profile
text. If not, infer the 5-8 keywords a recruiter would plausibly search for
given the person's apparent role/industry, and report coverage for those
instead. seoScore (0-100) reflects overall keyword coverage and placement
(keywords in the headline and first few lines of the about section weigh
more than keywords buried at the end). Suggestions should say exactly where
to add or move a keyword, not generic advice like "use more keywords."`;

export function buildLinkedInSeoAnalysisPrompt(
  input: LinkedInSeoAnalysisInput,
): string {
  return [
    `LinkedIn profile text:\n---\n${input.profileText}\n---`,
    input.targetKeywords?.length
      ? `Target keywords to check: ${input.targetKeywords.join(", ")}`
      : "No target keywords given — infer the most relevant ones for this profile's apparent role/industry.",
  ].join("\n\n");
}
