import { z } from "zod";

import { generateObject } from "@/lib/ai";
import type { ClassifierResult, CoachIntent } from "./types";

const CLASSIFIER_SCHEMA = z.object({
  intent: z.enum([
    "resume",
    "jobs",
    "linkedin",
    "interview",
    "applications",
    "career_switch",
    "salary",
    "general_advice",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const CLASSIFIER_SYSTEM_PROMPT = `You classify a career-coaching chat message into exactly one intent. Respond only with the classification — never answer the user's message, never add extra fields.`;

/**
 * AI-backed classifier (Step 1) — the primary classification strategy,
 * reusing the existing AI Router's `generateObject`. Schema-validated to
 * exactly `{ intent, confidence, reason }`, nothing else. Callers must
 * catch and fall back to `classifyIntent` below on any failure (network,
 * misconfigured provider, schema mismatch) — this function is allowed to
 * throw.
 */
export async function classifyIntentWithAI(message: string): Promise<ClassifierResult> {
  const result = await generateObject({
    schema: CLASSIFIER_SCHEMA,
    system: CLASSIFIER_SYSTEM_PROMPT,
    prompt: `Classify this message: "${message}"

Valid intents:
- resume: resume/CV help
- jobs: finding job listings
- linkedin: LinkedIn profile help
- interview: interview preparation
- applications: reviewing/tracking submitted applications
- career_switch: changing career direction/industry
- salary: pay/compensation questions
- general_advice: career advice that isn't one of the above
- unknown: doesn't fit any of the above, or the message is empty/gibberish

Return your confidence (0-1) and a one-sentence reason for the classification.`,
  });

  return result.object;
}

/**
 * Deterministic keyword classifier — the fallback classification
 * strategy, used automatically whenever `classifyIntentWithAI` fails
 * (Step 1: "never break chat"). `confidence` reflects *how* the match was
 * made (keyword substring vs no match at all), not a fabricated
 * probability.
 */

interface IntentRule {
  intent: Exclude<CoachIntent, "unknown">;
  keywords: string[];
}

// Order matters: more specific/overlapping phrases are checked before
// broader buckets (e.g. "career switch" before the generic "advice" bucket).
const INTENT_RULES: IntentRule[] = [
  { intent: "resume", keywords: ["resume", "cv"] },
  { intent: "linkedin", keywords: ["linkedin"] },
  { intent: "interview", keywords: ["interview"] },
  { intent: "applications", keywords: ["application", "applications", "applied", "apply"] },
  { intent: "jobs", keywords: ["job", "jobs", "remote", "opportunit"] },
  {
    intent: "career_switch",
    keywords: [
      "switch career",
      "change career",
      "career change",
      "new career",
      "pivot",
      "transition",
    ],
  },
  { intent: "salary", keywords: ["salary", "compensation", "pay", "wage", "raise"] },
  {
    intent: "general_advice",
    keywords: [
      "advice",
      "tips",
      "guidance",
      "how do i",
      "how can i",
      "promotion",
      "promoted",
      "career growth",
    ],
  },
];

export function classifyIntent(message: string): ClassifierResult {
  const normalized = message.toLowerCase().trim();

  if (!normalized) {
    return { intent: "unknown", confidence: 0, reason: "Empty message." };
  }

  for (const rule of INTENT_RULES) {
    const matched = rule.keywords.find((keyword) => normalized.includes(keyword));
    if (matched) {
      return {
        intent: rule.intent,
        confidence: 0.8,
        reason: `Matched keyword "${matched}".`,
      };
    }
  }

  return {
    intent: "unknown",
    confidence: 0.2,
    reason: "No keyword matched any known intent.",
  };
}
