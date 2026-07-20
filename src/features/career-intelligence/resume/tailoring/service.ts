import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import {
  buildResumeTailoringPrompt,
  RESUME_TAILORING_SYSTEM_PROMPT,
} from "./prompt";
import {
  ResumeTailoringInputSchema,
  ResumeTailoringOutputSchema,
} from "./schema";
import type { ResumeTailoringInput, ResumeTailoringOutput } from "./types";

const runTailoring = createAnalysisService<
  ResumeTailoringInput,
  ResumeTailoringOutput
>({
  name: "resume.tailoring",
  inputSchema: ResumeTailoringInputSchema,
  outputSchema: ResumeTailoringOutputSchema,
  systemPrompt: RESUME_TAILORING_SYSTEM_PROMPT,
  buildPrompt: buildResumeTailoringPrompt,
});

/**
 * The model has been observed (real, reproduced) occasionally emitting a
 * single array-shaped string instead of separate elements — e.g. one
 * `keywordsToEmphasize` entry coming back as
 * `design systems","accessibility (WCAG AA)\` — technically a valid
 * `string[]` per the output schema, but with stray JSON punctuation
 * leaking into the displayed text. Stripped here rather than trusted, so
 * the UI never shows a keyword badge with a dangling quote or bracket in
 * it.
 */
function sanitizeKeyword(raw: string): string {
  return raw
    .replace(/["\\[\]]/g, "")
    .replace(/,$/, "")
    .trim();
}

/**
 * Wraps the factory-generated service with two defensive cleanups the
 * output schema alone can't guarantee:
 * - drops any `bulletSuggestion` whose `bulletId` doesn't match one of the
 *   bullet ids actually sent in (the prompt asks the model to copy ids
 *   exactly, but nothing guarantees compliance, and a suggestion the
 *   Resume Builder can't match back to a real bullet must never reach the
 *   UI as if it could be applied);
 * - sanitizes `keywordsToEmphasize` (see `sanitizeKeyword`).
 */
export async function tailorResume(
  input: ResumeTailoringInput,
  deps: AIDependencies = {},
): Promise<ResumeTailoringOutput> {
  const result = await runTailoring(input, deps);
  const validBulletIds = new Set(input.bullets.map((bullet) => bullet.id));

  return {
    ...result,
    bulletSuggestions: result.bulletSuggestions.filter((suggestion) =>
      validBulletIds.has(suggestion.bulletId),
    ),
    keywordsToEmphasize: result.keywordsToEmphasize
      .map(sanitizeKeyword)
      .filter(Boolean),
  };
}
