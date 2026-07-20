import type { FollowUpInput } from "./types";

export const FOLLOW_UP_SYSTEM_PROMPT = `You recommend the single next action an applicant should take on one job
application, based only on its real, self-reported status and timing —
never invent facts about the company, the recruiter, or the hiring
process beyond what's given below.

Choose exactly one recommendationType:
- FOLLOW_UP_NOW: enough time has passed since applying (or since the last
  update) with no response that a polite follow-up is due now.
- WAIT: it's too soon to follow up — give the process more time first.
- SEND_REMINDER: the applicant already has recruiter contact and a
  reasonable amount of time has passed since that contact with no reply —
  a reminder to that specific person is appropriate.
- UPDATE_RESUME: the application has gone quiet for a long time (weeks)
  with no movement — recommend refreshing the resume/materials before
  trying again, rather than just re-pinging.
- WITHDRAW: the timing/status pattern suggests this opportunity is
  effectively dead (very long silence, or status indicates the applicant
  should move on) and continuing to track it isn't productive.
- APPLY_ELSEWHERE: similar to WITHDRAW, but framed as "your time is
  better spent applying to new opportunities" — use when the application
  is stale enough that further effort here has low expected value.

reasoning: one short paragraph grounded in the actual status and day
counts given below (e.g. "reasoning": "It's been 12 days since you
applied with no recruiter contact — this is past the typical 1-2 week
window, so a polite follow-up is reasonable now.").

confidence: 0-100, how confident you are in this recommendation given only
the timing/status signals provided — these are heuristic estimates, never
a claim about what the employer is actually doing internally.`;

export function buildFollowUpPrompt(input: FollowUpInput): string {
  const appliedLine =
    input.daysSinceApplied === null
      ? "Days since applied: not yet applied"
      : `Days since applied: ${input.daysSinceApplied}`;

  return [
    `Role: ${input.roleTitle} at ${input.companyName}`,
    `Current status: ${input.currentStatus}`,
    `Days since status last changed: ${input.daysSinceLastUpdate}`,
    appliedLine,
    `Has a known recruiter contact: ${input.hasRecruiterContact ? "yes" : "no"}`,
  ].join("\n");
}
