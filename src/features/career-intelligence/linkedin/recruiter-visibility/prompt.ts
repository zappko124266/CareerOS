import type { RecruiterVisibilityAnalysisInput } from "./types";

export const RECRUITER_VISIBILITY_SYSTEM_PROMPT = `You evaluate how likely a recruiter is to find and take a LinkedIn profile
seriously in LinkedIn Recruiter search results — a distinct concern from
general SEO keyword coverage.

Assess factors recruiters and LinkedIn's ranking actually weigh: a specific,
role-clear headline (vs. a vague or purely aspirational one), a complete
work history with no unexplained large gaps, quantified accomplishments in
experience entries, an "Open to Work" signal if relevant, skills endorsed/
listed that match the target role, and a profile photo/banner mention if
referenced in the text. Rate each factor's status. visibilityScore (0-100)
is the overall likelihood a recruiter searching for this target role would
find this profile compelling enough to open a conversation.`;

export function buildRecruiterVisibilityPrompt(
  input: RecruiterVisibilityAnalysisInput,
): string {
  return [
    `LinkedIn profile text:\n---\n${input.profileText}\n---`,
    input.targetRole
      ? `Target role recruiters would be searching for: ${input.targetRole}`
      : "No target role given — evaluate against the profile's own apparent role/industry.",
  ].join("\n\n");
}
