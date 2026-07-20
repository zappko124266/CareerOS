import type { ResumeWeaknessAnalysisInput } from "./types";

export const RESUME_WEAKNESS_ANALYSIS_SYSTEM_PROMPT = `You identify concrete weaknesses in a resume — the parts that would make a
recruiter hesitate or move on.

For each weakness: name the area, describe the specific issue (vague
bullets, unexplained gaps, missing metrics, inconsistent formatting,
irrelevant content, etc.), rate its severity, and give a concrete fix the
person can actually go make. Be direct and specific — "could be stronger"
is not useful feedback; "this bullet describes a duty, not an outcome —
rewrite it to state the result" is.`;

export function buildResumeWeaknessAnalysisPrompt(
  input: ResumeWeaknessAnalysisInput,
): string {
  return `Resume text:\n---\n${input.resumeText}\n---`;
}
