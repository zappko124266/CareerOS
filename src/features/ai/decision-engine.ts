import "server-only";

import { classifyIntent, classifyIntentWithAI } from "@/features/coach/classifier";
import { orchestrate } from "@/features/coach/orchestrator";
import type { CoachContext, OrchestrationResult } from "@/features/coach/types";
import { logger } from "@/lib/logger";

/**
 * The Decision Engine — Sprint 8. Replaces `coach/analyze-message.ts`
 * (deleted this sprint, its one caller — the Coach Chat route — now
 * calls `features/ai/router.ts` instead). Reuses `features/coach/`'s
 * existing classifier and orchestrator verbatim — nothing about *how*
 * a message is classified or *how* the roadmap-gated workflow decision
 * is made changes; only the *priority* between the two classification
 * strategies does.
 *
 * Requirement 8 ("only call the AI provider when deterministic logic is
 * insufficient"): the free, instant keyword classifier
 * (`classifyIntent`) now runs first. The AI Router
 * (`classifyIntentWithAI`, `@/lib/ai`'s `generateObject`) is only
 * invoked when it returns `"unknown"` — no keyword matched anything.
 * This is the inverse of the previous priority (AI first, deterministic
 * only as a failure fallback), and means most messages never reach the
 * model at all.
 */
export async function decideWorkflow(message: string, context: CoachContext): Promise<OrchestrationResult> {
  const deterministic = classifyIntent(message);

  if (deterministic.intent !== "unknown") {
    return orchestrate(deterministic, context);
  }

  const classification = await classifyIntentWithAI(message).catch((error) => {
    logger.error("ai.decision_engine.ai_classification_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return deterministic;
  });

  return orchestrate(classification, context);
}
