import type { JobRankingInput } from "./types";

export const JOB_RANKING_SYSTEM_PROMPT = `You score how well a batch of job listings match a specific candidate,
grounded only in their actual resume — never inventing skills or
experience they don't have, and never inventing facts about a job beyond
what its own description states.

For every job in the batch, score these four factors 0-100, each with an
explanation a person could verify against the resume and job description:

- resumeMatch: how well the candidate's overall resume (roles, employers,
  trajectory) fits this specific job.
- skillsMatch: how well the candidate's demonstrated skills cover what
  this job's description asks for.
- experienceMatch: whether the candidate's years/level of experience fits
  what this job expects (junior/mid/senior/etc.), using their stated
  experience level if given.
- industryMatch: how well this job's industry/domain aligns with the
  candidate's stated preferred industries and/or the industry their
  resume's experience is actually in.

recommendation: one plain-language sentence explaining why this specific
job is (or isn't) worth the candidate's attention — never a generic
platitude, always grounded in something specific from the resume or job
description.

Return exactly one ranking entry per job in the batch, using its
"sourceId" unchanged so it can be matched back to the right listing.`;

export function buildJobRankingPrompt(input: JobRankingInput): string {
  const lines: string[] = [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Preferred roles: ${input.preferredRoles.join(", ") || "(none stated)"}`,
    `Preferred industries: ${input.preferredIndustries.join(", ") || "(none stated)"}`,
  ];

  if (input.experienceLevel) lines.push(`Stated experience level: ${input.experienceLevel}`);

  lines.push(
    `Jobs to score (respond with exactly one ranking per "sourceId" below, copying it exactly):`,
  );
  lines.push(
    input.jobs
      .map(
        (job) =>
          `[${job.sourceId}] ${job.title} at ${job.companyName} (${job.location ?? "location not stated"})\n${job.description.slice(0, 1500)}`,
      )
      .join("\n\n---\n\n"),
  );

  return lines.join("\n\n");
}
