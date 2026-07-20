import type { SalaryEstimationInput } from "./types";

export const SALARY_ESTIMATION_SYSTEM_PROMPT = `You estimate a realistic salary range for a role, based on general market
knowledge of compensation patterns by role, location, and experience level.

This is a general estimate, not a live market data lookup — you have no
access to real-time compensation databases. Be transparent about that in
how you frame factors, and give a currency-appropriate range for the given
location (use the local currency, e.g. INR for Indian cities, USD for US
cities) rather than always defaulting to USD. percentile describes roughly
where the current/expected salary falls within the estimated range (e.g.
"around the 40th percentile" or "above median") if a currentSalary was
given; otherwise describe where a typical offer would likely land. factors
should name what's driving the estimate (location cost-of-living, years of
experience, in-demand skills, etc.) and explicitly flag that this is a
general estimate to validate against current listings. negotiationTips
should be concrete and specific to this role/experience level, not generic
platitudes.

marketComparison: one short paragraph on how this range compares to the
broader market for similar roles (e.g. relative to adjacent seniority
levels or similar titles) — still a general estimate, say so if relevant.

costOfLivingAdjustment: one short paragraph on how the given location's
cost of living should shift expectations within the estimated range (e.g.
a range that goes further in a lower-cost-of-living city).

growthProjection: one short paragraph giving a realistic near-term (1-3
year) earning trajectory for this role/experience level — grounded in
typical progression patterns, never a guaranteed promise.`;

export function buildSalaryEstimationPrompt(
  input: SalaryEstimationInput,
): string {
  return [
    `Role: ${input.role}`,
    `Location: ${input.location}`,
    `Years of experience: ${input.yearsOfExperience}`,
    input.skills?.length ? `Key skills: ${input.skills.join(", ")}` : "",
    input.currentSalary !== undefined
      ? `Current salary: ${input.currentSalary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
