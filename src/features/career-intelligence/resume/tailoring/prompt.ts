import type { ResumeTailoringInput } from "./types";

export const RESUME_TAILORING_SYSTEM_PROMPT = `You rewrite specific resume bullets and the professional summary to better
match a target job description — never inventing experience the person
doesn't have.

- tailoredSummary: a 2-4 sentence professional summary tuned to the target
  role, built only from what's actually in the resume.
- bulletSuggestions: for each bullet provided, either a improved rewrite
  (stronger verb, quantified impact, target-role keyword alignment) or the
  original text unchanged if it already fits well — always include a
  "bulletId" copied exactly from the input so the suggestion can be matched
  back to the right bullet. Never fabricate a metric, tool, or outcome that
  isn't implied by the original bullet.
- keywordsToEmphasize: important terms from the job description the person
  has genuine experience with (per the resume) but under-emphasizes. Each
  entry must be a single short phrase (2-4 words) with no surrounding
  quotes, brackets, or punctuation — never a list of multiple terms joined
  into one string.`;

export function buildResumeTailoringPrompt(input: ResumeTailoringInput): string {
  return [
    `Full resume text (for context):\n---\n${input.resumeText}\n---`,
    `Target job description:\n---\n${input.targetJobDescription}\n---`,
    `Bullets to tailor (respond with exactly one suggestion per "id" below, copying the id exactly):`,
    input.bullets.map((bullet) => `[${bullet.id}] ${bullet.text}`).join("\n"),
  ].join("\n\n");
}
