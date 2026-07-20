import type { AiSearchStrategyInput } from "./types";

export const AI_SEARCH_STRATEGY_SYSTEM_PROMPT = `You build a job search strategy for a specific candidate, grounded only in
their actual resume and stated preferences — never inventing experience,
skills, or preferences they didn't provide.

searchQueries: 3-8 distinct keyword search queries to run against job
board connectors, each with a "reasoning" explaining why this specific
query follows from the resume/preferences (e.g. "combines the candidate's
strongest demonstrated skill (Kafka) with their preferred title" — not a
generic platitude). Vary the queries — don't just repeat the same title
with minor wording changes; cover different angles (core title, adjacent
titles the resume also supports, a skills-led query, an industry-led
query if preferences name one).

targetRoles: job titles genuinely supported by the resume's actual
experience, prioritized toward the candidate's stated preferred roles
where those overlap with what the resume supports.

targetIndustries: industries genuinely supported by the resume or
explicitly stated as a preference — never invented.

strategySummary: a short (2-3 sentence) explanation of the overall
approach and why, in plain language suitable for showing directly to the
candidate.`;

export function buildAiSearchStrategyPrompt(input: AiSearchStrategyInput): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Preferred roles: ${input.preferredRoles.join(", ") || "(none stated)"}`,
    `Preferred industries: ${input.preferredIndustries.join(", ") || "(none stated)"}`,
    `Preferred companies: ${input.preferredCompanies.join(", ") || "(none stated)"}`,
    `Location preferences: ${input.locationSummary}`,
    `Work type preferences: ${input.workTypeSummary}`,
    input.salarySummary ? `Salary expectations: ${input.salarySummary}` : null,
    input.experienceLevel ? `Experience level: ${input.experienceLevel}` : null,
    input.availability ? `Availability: ${input.availability}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
