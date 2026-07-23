import { streamText } from "@/lib/ai";
import type { CareerRoadmap } from "@/features/coach/roadmap";
import type {
  ConversationTurn,
  CoachContext,
  CoachIntent,
  CoachResponseMeta,
  CoachTone,
  OrchestrationResult,
} from "@/features/coach/types";

import type { NextStepsPlan } from "./action-planner";
import { buildCoachPrompt, COACH_SYSTEM_PROMPT } from "./prompt-builder";

/**
 * The Response Builder — Sprint 8. Moved from `coach/generate-response.ts`
 * (deleted this sprint) — same `streamText` call (`@/lib/ai`, the only
 * way any feature talks to an LLM), same deterministic
 * follow-up-question/tone rules. Only the prompt construction moved out
 * to `prompt-builder.ts`.
 */
export function streamCoachMessage(params: {
  message: string;
  context: CoachContext;
  roadmap: CareerRoadmap;
  orchestration: OrchestrationResult;
  history: ConversationTurn[];
  nextSteps: NextStepsPlan;
}) {
  return streamText({
    system: COACH_SYSTEM_PROMPT,
    prompt: buildCoachPrompt(params),
  });
}

/** Deterministic fallback message when even `streamText` itself can't
 * start — just the Decision Engine's own plain-language decision, with
 * no AI phrasing on top. "Never break chat" applies here too, not just
 * to classification. */
export function fallbackCoachMessage(orchestration: OrchestrationResult): string {
  return orchestration.suggestedAction;
}

/** One optional follow-up question per intent, always checked against
 * `CoachContext` first so it never asks something already known.
 * Deterministic on purpose: the Decision Engine (not the model) decides
 * what still needs asking. */
function pickFollowUpQuestion(intent: CoachIntent, context: CoachContext): string | null {
  switch (intent) {
    case "resume":
      return context.resume.count === 0
        ? "Do you already have a resume ready to upload, or are we starting from scratch?"
        : null;
    case "jobs":
      return "What kind of role are you targeting?";
    case "career_switch":
      return "What field or industry are you hoping to move into?";
    default:
      return null;
  }
}

function pickTone(intent: CoachIntent): CoachTone {
  if (intent === "unknown") return "professional";
  return "encouraging";
}

/**
 * `cta` is a direct pass-through of the Decision Engine's decision (never
 * AI-decided); `followUpQuestion`/`tone` are simple rule lookups, not
 * model output. Keeping these out of the LLM call is what keeps the
 * Decision Engine the source of truth.
 */
export function buildCoachResponseMeta(orchestration: OrchestrationResult, context: CoachContext): CoachResponseMeta {
  return {
    cta: orchestration.cta,
    followUpQuestion: pickFollowUpQuestion(orchestration.intent, context),
    tone: pickTone(orchestration.intent),
  };
}
