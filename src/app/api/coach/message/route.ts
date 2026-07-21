import { z } from "zod";

import { analyzeMessage } from "@/features/coach/analyze-message";
import { getCoachContext } from "@/features/coach/context";
import {
  buildCoachResponseMeta,
  fallbackCoachMessage,
  streamCoachMessage,
} from "@/features/coach/generate-response";
import { getCareerRoadmap } from "@/features/coach/roadmap";
import { getCurrentUser } from "@/lib/auth/dal";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  // Session-only conversation memory (Step 5) — the client sends its own
  // in-memory history each request; nothing is stored server-side.
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .max(10)
    .default([]),
});

function plainTextStreamResponse(text: string, headers: HeadersInit): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, { headers });
}

/**
 * The Coach chat's only server entry point. The client never imports
 * `analyzeMessage`/`getCoachContext`/`streamCoachMessage` directly (those
 * pull in server-only Prisma/Supabase code) — it POSTs here instead.
 *
 * Flow: Context Engine -> Orchestrator (AI-backed classifier with
 * deterministic fallback, roadmap-gated decision) -> Conversation
 * Generator (streams the Orchestrator's already-decided recommendation in
 * natural language). The Orchestrator's `cta`/`existingRoute` are never
 * touched by the model — see `generate-response.ts`.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { message, history } = parsed.data;

  const context = await getCoachContext(user);
  const roadmap = getCareerRoadmap(context);
  const orchestration = await analyzeMessage(message, context);
  const meta = buildCoachResponseMeta(orchestration, context);
  const headers = { "X-Coach-Meta": encodeURIComponent(JSON.stringify(meta)) };

  try {
    const stream = streamCoachMessage({ message, context, roadmap, orchestration, history });
    return stream.toTextStreamResponse({ headers });
  } catch (error) {
    // Setup failure (e.g. AI_PROVIDER not configured) — never break chat;
    // fall back to the Orchestrator's own plain-language decision, still
    // delivered as a (single-chunk) stream so the client's reader works
    // identically either way.
    logger.error("coach.stream_setup_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return plainTextStreamResponse(fallbackCoachMessage(orchestration), headers);
  }
}
