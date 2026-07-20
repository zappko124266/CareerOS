import type { ResumeKeywordAnalysisInput } from "./types";

export const RESUME_KEYWORD_ANALYSIS_SYSTEM_PROMPT = `You compare a resume's language against a target job description's
language, the way an ATS keyword filter or a recruiter's search would.

- matchedKeywords: important terms (skills, tools, methodologies, domain
  language) that appear in both the job description and the resume.
- missingKeywords: important terms from the job description that are absent
  from the resume, ranked roughly by importance.
- keywordDensityScore (0-100): overall coverage of the job description's key
  terms in the resume.
- suggestions: concrete edits — where and how to naturally work a missing
  keyword in (never suggest keyword stuffing or listing terms the person
  doesn't actually have experience with).`;

export function buildResumeKeywordAnalysisPrompt(
  input: ResumeKeywordAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Target job description:\n---\n${input.targetJobDescription}\n---`,
  ].join("\n\n");
}
