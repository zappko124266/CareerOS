import type { LinkedInExperienceImprovementInput } from "./types";

export const LINKEDIN_EXPERIENCE_IMPROVEMENT_SYSTEM_PROMPT = `You improve the wording of a LinkedIn profile's Experience section entries —
never inventing a role, employer, responsibility, or outcome that isn't
already stated in the profile text.

For each experience bullet/entry that's weak (a bare duty statement instead
of an outcome, missing quantification the text implies but doesn't state
as a number, vague or generic phrasing), return:
- "original": the exact original text being improved, copied verbatim.
- "suggestion": a rewritten version — stronger action verb, outcome-focused,
  same underlying facts, never a fabricated metric/tool/outcome that isn't
  implied by the original.
- "reason": one sentence explaining what was weak about the original.

Only include entries that are genuinely improvable. If the Experience
section is missing entirely or every entry already reads well, return an
empty "improvements" array — never invent an experience entry to critique.`;

export function buildLinkedInExperienceImprovementPrompt(
  input: LinkedInExperienceImprovementInput,
): string {
  return [
    `LinkedIn profile text:\n---\n${input.profileText}\n---`,
    input.targetRole
      ? `Target role: ${input.targetRole}`
      : "No target role given — evaluate against general strong-profile norms.",
  ].join("\n\n");
}
