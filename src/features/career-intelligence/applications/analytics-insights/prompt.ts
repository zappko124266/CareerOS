import type { AnalyticsInsightsInput } from "./types";

export const ANALYTICS_INSIGHTS_SYSTEM_PROMPT = `You recommend how a job seeker should adjust their application approach,
based only on the real, aggregate statistics given below — computed from
their actual application history, never estimated by you.

Give 2-5 insights. Each needs a concrete "recommendation" (a specific
action) and a "reasoning" that cites the actual numbers given (e.g.
"reasoning": "Your response rate on applications with a cover letter is
34% versus 12% without one — cover letters are clearly worth the extra
time for you.").

Never invent a statistic that isn't in the data below. If a comparison
has too little data to be meaningful (e.g. fewer than 3 applications in a
group), say so explicitly rather than drawing a conclusion from it.
Never claim a specific hiring outcome — these are patterns in the
person's own historical data, not predictions.`;

export function buildAnalyticsInsightsPrompt(input: AnalyticsInsightsInput): string {
  const lines: string[] = [
    `Total applications: ${input.totalApplications}`,
    `Overall response rate: ${input.responseRate}%`,
    `Interview rate: ${input.interviewRate}%`,
    `Offer rate: ${input.offerRate}%`,
  ];

  if (input.coverLetterResponseRateWith !== null && input.coverLetterResponseRateWithout !== null) {
    lines.push(
      `Response rate with a cover letter: ${input.coverLetterResponseRateWith}%`,
      `Response rate without a cover letter: ${input.coverLetterResponseRateWithout}%`,
    );
  }

  if (input.topCompanies.length > 0) {
    lines.push(
      `Companies applied to: ${input.topCompanies
        .map((c) => `${c.label} (${c.applications} applications, ${c.responseRate}% response rate)`)
        .join("; ")}`,
    );
  }

  if (input.topRoles.length > 0) {
    lines.push(
      `Roles applied to: ${input.topRoles
        .map((r) => `${r.label} (${r.applications} applications, ${r.responseRate}% response rate)`)
        .join("; ")}`,
    );
  }

  if (input.resumePerformance.length > 1) {
    lines.push(
      `Performance by resume: ${input.resumePerformance
        .map((r) => `${r.label} (${r.applications} applications, ${r.responseRate}% response rate)`)
        .join("; ")}`,
    );
  }

  return lines.join("\n");
}
