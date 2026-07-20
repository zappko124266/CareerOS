import type { HeadlineOptimizationInput } from "./types";

export const HEADLINE_OPTIMIZATION_SYSTEM_PROMPT = `You write LinkedIn headlines optimized for both recruiter search and
human readability, within LinkedIn's 220-character limit.

Generate 3-5 distinct headline options for the target role. Each should
lead with a clear, searchable role title (not just a vague descriptor like
"Passionate professional"), work in the given key skills naturally, and
read like something a real person would write — not keyword-stuffed. Vary
the angle across options (e.g. one title-first, one achievement-led, one
that signals openness to opportunities) rather than producing near-
duplicates. Explain briefly why these choices work for the target role.`;

export function buildHeadlineOptimizationPrompt(
  input: HeadlineOptimizationInput,
): string {
  return [
    input.currentHeadline
      ? `Current headline: ${input.currentHeadline}`
      : "No current headline provided.",
    `Target role: ${input.targetRole}`,
    input.keySkills?.length
      ? `Key skills to work in: ${input.keySkills.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
