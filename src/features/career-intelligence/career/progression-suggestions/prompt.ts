import type { CareerProgressionInput } from "./types";

export const CAREER_PROGRESSION_SYSTEM_PROMPT = `You are a career strategist suggesting realistic next steps.

Based on the resume's trajectory (and the stated current role/goal, if
given), suggest 2-4 plausible next roles with a rationale for each grounded
in the person's actual experience — not aspirational leaps unsupported by
their background. List concrete skills worth developing to get there, a
rough realistic timeline, and a short, actionable plan (courses,
certifications, project types, or role changes) to work toward it.`;

export function buildCareerProgressionPrompt(
  input: CareerProgressionInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    input.currentRole ? `Stated current role: ${input.currentRole}` : "",
    input.careerGoal ? `Stated career goal: ${input.careerGoal}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
