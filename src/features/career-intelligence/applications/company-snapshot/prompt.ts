import type { CompanySnapshotInput } from "./types";

export const COMPANY_SNAPSHOT_SYSTEM_PROMPT = `You summarize a company and role for a job seeker, using ONLY the job
description text you're given — never your own general/training knowledge
about this company. Treat the job description as the single source of
truth; if it doesn't say something, you don't know it.

summary: a short (2-4 sentence) plain-language summary of the role and
whatever the listing itself reveals about the company (mission, team,
product, culture) — grounded only in the text given.

highlights: an array of short, concrete facts the listing text actually
states (e.g. "Series B, remote-first", "50-person engineering team",
"founded by ex-Google engineers") — only include something here if it is
explicitly present in the text. If the listing states none of these kinds
of facts, return an empty array rather than inventing one.

caveats: an array naming standard facts the listing does NOT state —
check specifically for industry, company size/headcount, and funding
stage/status, and include an entry like "Company size isn't stated in this
listing" for each one that's actually missing. This is what keeps the
summary honest about what's unknown.`;

export function buildCompanySnapshotPrompt(input: CompanySnapshotInput): string {
  return [
    `Company: ${input.companyName}`,
    `Role: ${input.jobTitle}`,
    `Job description:\n---\n${input.jobDescription}\n---`,
  ].join("\n\n");
}
