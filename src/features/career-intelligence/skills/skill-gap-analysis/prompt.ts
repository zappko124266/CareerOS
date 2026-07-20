import type { SkillGapAnalysisInput } from "./types";

export const SKILL_GAP_ANALYSIS_SYSTEM_PROMPT = `You compare a candidate's demonstrated skills against what's typically
expected for a target role.

- existingSkills: skills the resume actually demonstrates (from explicit
  mentions or clearly implied by described work — not guesses).
- missingSkills: skills commonly expected for the target role that the
  resume doesn't demonstrate, each rated by importance (critical, important,
  or nice-to-have) for that role.
- learningPath: an ordered list of concrete steps (specific skills, project
  types, or certifications) to close the most important gaps first.`;

export function buildSkillGapAnalysisPrompt(
  input: SkillGapAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Target role: ${input.targetRole}`,
  ].join("\n\n");
}
