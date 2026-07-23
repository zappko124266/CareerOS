import "server-only";

import type { ConversationTurn } from "@/features/coach/types";
import type { UserDTO } from "@/lib/auth/dto";

import { planNextSteps } from "./action-planner";
import { getAiContext } from "./context";
import { decideWorkflow } from "./decision-engine";
import { buildCoachResponseMeta, fallbackCoachMessage, streamCoachMessage } from "./response-builder";

/**
 * The AI Router — Sprint 8's single entry point for AI-orchestrated
 * features. **Not** `src/lib/ai/router.ts` (that's the low-level
 * LLM-*provider* router — nvidia/groq/gemini/openrouter — that
 * `generateText`/`generateObject`/`streamText` resolve through; this file
 * never duplicates that, it calls into it only via
 * `response-builder.ts`'s `streamCoachMessage`). This is the
 * application-level orchestration router: Context Engine -> Action
 * Planner -> Decision Engine -> Response Builder.
 *
 * Coach Chat (`api/coach/message/route.ts`) is this router's first
 * caller — the route stays thin, calling only this one function instead
 * of orchestrating Context/Decision/Response itself.
 */
export async function routeCoachMessage(input: {
  user: UserDTO;
  message: string;
  history: ConversationTurn[];
}) {
  const context = await getAiContext(input.user);
  const nextSteps = planNextSteps(context);
  const orchestration = await decideWorkflow(input.message, context.coach);
  const meta = buildCoachResponseMeta(orchestration, context.coach);

  return {
    meta,
    stream: () =>
      streamCoachMessage({
        message: input.message,
        context: context.coach,
        roadmap: context.roadmap,
        orchestration,
        history: input.history,
        nextSteps,
      }),
    fallback: () => fallbackCoachMessage(orchestration),
  };
}
