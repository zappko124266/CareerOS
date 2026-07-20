import type { ResumeStrengthAnalysisInput } from "./types";

export const RESUME_STRENGTH_ANALYSIS_SYSTEM_PROMPT = `You identify what's genuinely strong about a resume — the parts a
recruiter would react well to.

For each strength: name the area (e.g. "Quantified leadership impact"),
cite the specific evidence from the resume that supports it (a bullet,
title, or pattern — quote or closely paraphrase it), and rate its impact.
Only report strengths actually evidenced in the text — do not invent
achievements. Then name the single biggest standout factor that
differentiates this resume from a generic one in its field.`;

export function buildResumeStrengthAnalysisPrompt(
  input: ResumeStrengthAnalysisInput,
): string {
  return `Resume text:\n---\n${input.resumeText}\n---`;
}
