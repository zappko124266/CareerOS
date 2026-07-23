import { z } from "zod";

import { generateObject } from "@/lib/ai";
import { logger } from "@/lib/logger";
import type { GmailCareerClassification } from "@/generated/prisma/client";

import type { ClassificationResult, GmailMessageInput } from "./types";

/** Known recruiting-platform/ATS sending domains — a real signal (who
 * actually sent the mail), not a guess. Kept small and easy to extend;
 * a domain absent here just means the `RECRUITER` rule falls through to
 * its keyword check instead, never a false negative that blocks
 * classification entirely. */
const RECRUITING_PLATFORM_DOMAINS = [
  "linkedin.com",
  "greenhouse.io",
  "greenhouse-mail.io",
  "lever.co",
  "hire.lever.co",
  "myworkday.com",
  "icims.com",
  "smartrecruiters.com",
  "ashbyhq.com",
];

function textOf(message: GmailMessageInput): string {
  return `${message.subject ?? ""} ${message.snippet}`.toLowerCase();
}

function domainOf(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Step 3's deterministic classifier — first matching rule wins, same
 * idiom as `recommendNextStep`/`buildAgentActionPlan`. Order matters:
 * `REJECTION` is checked before `APPLICATION_CONFIRMATION` because a
 * real, common rejection pattern ("Thank you for your interest... we've
 * decided to move forward with other candidates") would otherwise match
 * the confirmation rule's "thank you for your interest" fragment first.
 * Returns `null` — not `UNKNOWN` — when nothing matches, so the caller
 * (`classifyGmailMessage`) knows to escalate to the AI Router rather
 * than defaulting immediately; `UNKNOWN` is reserved for "we tried
 * everything, including AI, and still can't tell."
 */
export function classifyDeterministically(message: GmailMessageInput): GmailCareerClassification | null {
  const text = textOf(message);
  const domain = domainOf(message.fromEmail);

  if (
    includesAny(text, [
      "unfortunately",
      "not moving forward",
      "will not be moving forward",
      "other candidates",
      "regret to inform",
      "not selected",
      "pursue other candidates",
      "decided not to proceed",
    ])
  ) {
    return "REJECTION";
  }

  if (
    includesAny(text, [
      "offer letter",
      "pleased to offer",
      "job offer",
      "offer of employment",
      "excited to offer you",
      "extend an offer",
    ])
  ) {
    return "OFFER";
  }

  if (
    includesAny(text, [
      "coding challenge",
      "coding test",
      "online assessment",
      "hackerrank",
      "codesignal",
      "take-home",
      "technical assessment",
      "skills assessment",
    ])
  ) {
    return "ASSESSMENT";
  }

  if (
    includesAny(text, [
      "interview invitation",
      "schedule your interview",
      "schedule a call",
      "phone screen",
      "meet the team",
      " interview ",
      "interview on",
      "interview for",
    ])
  ) {
    return "INTERVIEW";
  }

  if (
    includesAny(text, [
      "application received",
      "thank you for applying",
      "we've received your application",
      "we have received your application",
      "application confirmation",
    ])
  ) {
    return "APPLICATION_CONFIRMATION";
  }

  if (includesAny(text, ["following up", "checking in on", "wanted to follow up", "any update on your application"])) {
    return "FOLLOW_UP";
  }

  if (
    (domain && RECRUITING_PLATFORM_DOMAINS.includes(domain)) ||
    includesAny(text, ["recruiter", "talent acquisition", "talent partner", "reaching out about"])
  ) {
    return "RECRUITER";
  }

  if (includesAny(text, ["your career", "job opportunity", "open position", "we're hiring"])) {
    return "GENERAL_CAREER";
  }

  return null;
}

const GmailAiClassificationSchema = z.object({
  classification: z.enum([
    "INTERVIEW",
    "RECRUITER",
    "ASSESSMENT",
    "APPLICATION_CONFIRMATION",
    "OFFER",
    "REJECTION",
    "FOLLOW_UP",
    "GENERAL_CAREER",
    "UNKNOWN",
  ]),
});

const GMAIL_CLASSIFICATION_SYSTEM_PROMPT = `You classify one email (subject + short snippet only, no body) into exactly one career-related category. Only use the categories provided. If the email doesn't clearly fit any specific category, return UNKNOWN — never guess.`;

function buildClassificationPrompt(message: GmailMessageInput): string {
  return [
    `Subject: ${message.subject ?? "(no subject)"}`,
    `From: ${message.fromName ?? ""} <${message.fromEmail ?? "unknown"}>`,
    `Snippet: ${message.snippet}`,
  ].join("\n");
}

/**
 * Escalates to the AI Router only when `classifyDeterministically`
 * returned `null` — Step 3's "Only use AI when deterministic rules
 * cannot classify." Dependency-injectable `generateObject`, same pattern
 * `career-intelligence/analysis/service-factory.ts` uses, so this is
 * testable without a network call or `AI_PROVIDER` configured. A failed
 * or malformed AI call degrades to a real, honest `UNKNOWN` — never a
 * fabricated category.
 */
export async function classifyGmailMessage(
  message: GmailMessageInput,
  deps: { generateObject?: typeof generateObject } = {},
): Promise<ClassificationResult> {
  const ruleResult = classifyDeterministically(message);
  if (ruleResult) {
    return { classification: ruleResult, classifiedByRule: true };
  }

  const generate = deps.generateObject ?? generateObject;

  try {
    const { object } = await generate({
      schema: GmailAiClassificationSchema,
      system: GMAIL_CLASSIFICATION_SYSTEM_PROMPT,
      prompt: buildClassificationPrompt(message),
      temperature: 0,
    });
    return { classification: object.classification, classifiedByRule: false };
  } catch (error) {
    logger.error("gmail_intelligence.ai_classification_failed", {
      messageId: message.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return { classification: "UNKNOWN", classifiedByRule: false };
  }
}
