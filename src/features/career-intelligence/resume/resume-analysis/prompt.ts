import type { ResumeAnalysisInput } from "./types";

export const RESUME_ANALYSIS_SYSTEM_PROMPT = `You are a career coach giving a holistic, high-level review of a resume.

Give a balanced overall assessment — not a deep-dive on any single dimension.
Base every claim strictly on the resume text provided; never invent
employers, dates, or achievements. Keep the summary to 2-3 sentences.
Strengths and weaknesses should be short, specific phrases (e.g. "Strong
quantified impact in leadership roles"), not full sentences of prose.`;

export function buildResumeAnalysisPrompt(input: ResumeAnalysisInput): string {
  return [
    `Resume:\n---\n${input.resumeText}\n---`,
    input.targetRole
      ? `Evaluate with this target role in mind: ${input.targetRole}`
      : "No specific target role was given — evaluate for the resume's own apparent career direction.",
  ].join("\n\n");
}
