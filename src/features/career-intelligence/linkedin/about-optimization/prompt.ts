import type { AboutOptimizationInput } from "./types";

export const ABOUT_OPTIMIZATION_SYSTEM_PROMPT = `You write LinkedIn "About" sections — first person, engaging, and
scannable, not a copy-pasted resume summary.

Open with a clear statement of who the person is professionally and what
they focus on, back it with 2-4 concrete highlights (grounded in whatever
resume text or current About section is provided — never invent
achievements), and close with what they're looking for or open to, if that
can be reasonably inferred. Keep paragraphs short. Match the requested tone
if one is given; default to confident and professional but not stiff.
List the key points you chose to highlight and briefly explain why.`;

export function buildAboutOptimizationPrompt(
  input: AboutOptimizationInput,
): string {
  return [
    input.currentAbout
      ? `Current About section:\n---\n${input.currentAbout}\n---`
      : "",
    input.resumeText
      ? `Resume text for reference:\n---\n${input.resumeText}\n---`
      : "",
    input.targetRole ? `Target role/direction: ${input.targetRole}` : "",
    input.tone ? `Desired tone: ${input.tone}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
