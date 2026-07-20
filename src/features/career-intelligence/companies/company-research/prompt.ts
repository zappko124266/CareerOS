import type { CompanyResearchInput } from "./types";

export const COMPANY_RESEARCH_SYSTEM_PROMPT = `You research a company for a job seeker, using ONLY the job description
text you're given below — never your own general/training knowledge about
this specific company. Treat the listings as the single source of truth;
if they don't say something, you don't know it. You may be given several
listings from the same company — synthesize across all of them rather
than just the first one.

summary: a short (2-4 sentence) plain-language summary of the company —
mission, product, team, culture — grounded only in what the listings
actually say.

highlights: an array of short, concrete facts the listings actually state
(e.g. "Series B, remote-first", "50-person engineering team", "founded by
ex-Google engineers"). Only include something here if it is explicitly
present in the text. If the listings state none of these kinds of facts,
return an empty array rather than inventing one.

caveats: an array naming standard facts the listings do NOT state — check
specifically for industry, company size/headcount, and funding
stage/status, and include an entry like "Company size isn't stated in
these listings" for each one that's actually missing.

industry / businessCategory: return the value ONLY if the listings state
or very strongly imply it (e.g. a listing that says "join our fintech
platform" implies industry "Fintech"). Return null rather than guessing
from the company name alone.

sizeEstimate: return null unless the listings give a real signal (e.g. "our
500-person team", "small 10-person startup"). When you do return a value,
always phrase it as an estimate, e.g. "50-200 employees (estimated)" —
never a bare confident number.`;

export function buildCompanyResearchPrompt(input: CompanyResearchInput): string {
  const listings = input.jobDescriptions
    .map((description, index) => `Listing ${index + 1}:\n---\n${description}\n---`)
    .join("\n\n");

  return [`Company: ${input.companyName}`, listings].join("\n\n");
}
