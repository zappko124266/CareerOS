import type { ResumeAtsAnalysisInput } from "./types";

export const RESUME_ATS_ANALYSIS_SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume reviewer.

Score four dimensions, each 0-100:
- keywordMatch: how well the resume's language matches keywords an ATS/recruiter would search for (against the target job description if provided, otherwise against the resume's own stated role).
- formatting: whether the structure (sections, dates, consistent bullet style) is ATS-parseable — you only see extracted text, so judge structure, not visual design.
- sectionCompleteness: whether expected sections (contact, experience, education, skills) are present and filled in.
- parseability: how reliably an ATS parser could correctly extract fields from this text (unusual layouts, missing delimiters, run-on sections reduce this).

Then list specific issues. Each issue must name the section, a severity, the
concrete problem, and a concrete fix the person can actually go make.`;

export function buildResumeAtsAnalysisPrompt(
  input: ResumeAtsAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    input.targetJobDescription
      ? `Target job description:\n---\n${input.targetJobDescription}\n---`
      : "No target job description was provided — score keyword match against the resume's own apparent role/industry.",
  ].join("\n\n");
}
