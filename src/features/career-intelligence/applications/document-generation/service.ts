import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";
import { ValidationError } from "@/lib/errors";

import {
  APPLICATION_DOCUMENT_SYSTEM_PROMPT,
  buildApplicationDocumentPrompt,
} from "./prompt";
import {
  ApplicationDocumentGenerationInputSchema,
  ApplicationDocumentGenerationOutputSchema,
} from "./schema";
import type {
  ApplicationDocumentGenerationInput,
  ApplicationDocumentGenerationOutput,
} from "./types";

const runDocumentGeneration = createAnalysisService<
  ApplicationDocumentGenerationInput,
  ApplicationDocumentGenerationOutput
>({
  name: "applications.document_generation",
  inputSchema: ApplicationDocumentGenerationInputSchema,
  outputSchema: ApplicationDocumentGenerationOutputSchema,
  systemPrompt: APPLICATION_DOCUMENT_SYSTEM_PROMPT,
  buildPrompt: buildApplicationDocumentPrompt,
});

const SUBTYPE_SUBJECT_LABEL: Partial<Record<string, string>> = {
  APPLICATION_EMAIL: "Application",
  RECRUITER_EMAIL: "Introduction",
  HIRING_MANAGER_EMAIL: "Introduction",
  COLD_OUTREACH: "Introduction",
  REFERRAL_REQUEST: "Referral request",
  FOLLOW_UP: "Following up",
  INTERVIEW_CONFIRMATION: "Interview confirmation",
  INTERVIEW_REMINDER: "Interview reminder",
  INTERVIEW_THANK_YOU: "Thank you",
  SALARY_NEGOTIATION: "Compensation discussion",
  OFFER_ACCEPTANCE: "Offer acceptance",
  OFFER_DECLINE: "Offer decline",
};

/**
 * The model has been observed (real, reproduced) occasionally omitting
 * `subjectLine` entirely for an EMAIL generation despite the system prompt
 * asking for one, and occasionally leaving a stray dangling punctuation-only
 * line at the very end of `content` (e.g. a trailing lone comma) where it
 * appears to have started, then abandoned, a closing element. Both are
 * cleaned up here rather than trusted as-is:
 * - a missing subject line gets a deterministic, non-fabricated fallback
 *   built from real inputs (the email's own subtype + role + company),
 *   never invented text;
 * - trailing lines containing only punctuation are dropped.
 */
function cleanDocumentOutput(
  input: ApplicationDocumentGenerationInput,
  result: ApplicationDocumentGenerationOutput,
): ApplicationDocumentGenerationOutput {
  const lines = result.content.split("\n");
  while (lines.length > 0 && /^[\s.,;:!?"'-]*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  const content = lines.join("\n").trimEnd();

  if (input.kind !== "EMAIL") {
    return { ...result, content, subjectLine: undefined };
  }

  const subjectLine =
    result.subjectLine?.trim() ||
    `${SUBTYPE_SUBJECT_LABEL[input.subtype ?? ""] ?? "Regarding"} — ${input.roleTitle} at ${input.companyName}`;

  return { ...result, content, subjectLine };
}

/**
 * The single AI call behind Cover Letter Studio, Email Studio, and
 * Recruiter Message Studio — `kind` and `action` select which of the three
 * document types and which edit operation this call performs, rather than
 * each studio having its own service/prompt/schema. The zod `.refine()` on
 * the input schema already guards "existingContent required for non-GENERATE
 * actions" structurally; this extra check exists because a schema `.refine()`
 * failure surfaces as a generic Zod validation message, while this throws
 * `ValidationError` with the same message `createAnalysisService` would
 * otherwise wrap less specifically — kept for a clearer error path at the
 * service boundary.
 */
export async function generateApplicationDocument(
  input: ApplicationDocumentGenerationInput,
  deps: AIDependencies = {},
): Promise<ApplicationDocumentGenerationOutput> {
  if (input.action !== "GENERATE" && !input.existingContent?.trim()) {
    throw new ValidationError(
      "existingContent is required for anything other than the initial GENERATE action.",
    );
  }

  const result = await runDocumentGeneration(input, deps);
  return cleanDocumentOutput(input, result);
}
