import { classifyIntent, classifyIntentWithAI } from "./classifier";
import { orchestrate } from "./orchestrator";
import { logger } from "@/lib/logger";
import type { CoachContext, OrchestrationResult } from "./types";

/**
 * The AI Integration Layer's single entry point. The UI calls only this
 * function — never the classifier or orchestrator directly — so the
 * classification strategy can change without ever touching the UI or the
 * workflow-mapping layer.
 *
 * Classification is now AI-backed (`classifyIntentWithAI`, the existing
 * AI Router's `generateObject`). If it fails for any reason — provider
 * not configured, network error, malformed response — this falls back
 * automatically to the deterministic keyword classifier so chat never
 * breaks.
 *
 * `orchestrate()` is unaffected either way: it only depends on
 * `ClassifierResult`'s shape, never on how it was produced, and it
 * remains the sole source of truth for the resulting workflow/CTA — the
 * classifier (AI or deterministic) only decides *intent*, never the
 * recommendation itself.
 */
export async function analyzeMessage(
  message: string,
  context: CoachContext,
): Promise<OrchestrationResult> {
  let classification;

  try {
    classification = await classifyIntentWithAI(message);
  } catch (error) {
    logger.error("coach.ai_classification_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    classification = classifyIntent(message);
  }

  return orchestrate(classification, context);
}
