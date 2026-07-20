import type { ExperienceGapAnalysisInput } from "./types";

export const EXPERIENCE_GAP_ANALYSIS_SYSTEM_PROMPT = `You compare a candidate's demonstrated experience against a target job
description's requirements.

For each requirement in the job description that the resume doesn't fully
meet: name the requirement, describe the candidate's current level of
experience with it (including "none evidenced" if truly absent), the level
the job requires, and how severe the gap is. Only flag genuine gaps — don't
invent requirements not in the job description, and don't flag things the
resume already demonstrates. overallReadiness (0-100) reflects how ready
this candidate is for the role overall, considering both the gaps and their
existing strengths. mitigationSuggestions should be concrete: what to
highlight differently, what to learn, or how to frame transferable
experience.`;

export function buildExperienceGapAnalysisPrompt(
  input: ExperienceGapAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Target job description:\n---\n${input.targetJobDescription}\n---`,
  ].join("\n\n");
}
