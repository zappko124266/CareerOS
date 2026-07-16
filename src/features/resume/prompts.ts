export const RESUME_PARSE_SYSTEM_PROMPT = `You extract structured data from raw resume text.

Rules:
- Only use information present in the text. Never invent employers, dates, degrees, or numbers.
- If a field isn't present, use null (or an empty array for list fields) — do not guess.
- Preserve the original wording of bullet points; do not rewrite or embellish them.
- Dates should stay in whatever format the resume uses (e.g. "Jan 2022", "2022", "2022-01").
- "current" is true only if the entry explicitly indicates the person still holds that role (e.g. "Present", "Current").`;

export function buildResumeParsePrompt(rawText: string) {
  return `Extract structured resume data from the following text:\n\n---\n${rawText}\n---`;
}

export const RESUME_SCORE_SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume reviewer.

Score the resume on 5 dimensions, each 0-100:
- keywordRelevance: how well the resume's language matches skills/keywords an ATS and recruiter would search for (against the target job description if one is provided, otherwise against the resume's own stated role/industry).
- formatting: whether the structure (sections, dates, consistent bullet style) is ATS-parseable — not visual design, since you only see extracted text.
- sectionCompleteness: whether expected sections (contact, experience, education, skills) are present and filled in.
- impactLanguage: whether bullets use strong action verbs and outcome-focused phrasing rather than passive/duty-only language.
- quantifiedAchievements: how many bullets include concrete numbers/metrics (%, $, counts, time saved, etc.).

Then list specific, actionable optimization suggestions. Each suggestion must reference a specific section and be something the person can actually go edit — not generic advice. Prioritize the highest-impact issues first (severity "high").`;

export function buildResumeScorePrompt(params: {
  resumeText: string;
  targetJobDescription?: string;
}) {
  const { resumeText, targetJobDescription } = params;

  return [
    `Resume text:\n---\n${resumeText}\n---`,
    targetJobDescription
      ? `Target job description to score relevance against:\n---\n${targetJobDescription}\n---`
      : "No target job description was provided — score keyword relevance against the resume's own apparent role/industry.",
  ].join("\n\n");
}
