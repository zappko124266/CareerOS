import { z } from "zod";

import { routeCoachMessage } from "@/features/ai/router";
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
 * anything from `features/ai`/`features/coach` directly (those pull in
 * server-only Prisma/Supabase code) — it POSTs here instead.
 *
 * Sprint 8: this route now calls exactly one function —
 * `routeCoachMessage` (`features/ai/router.ts`, the AI Router) — instead
 * of orchestrating the Context Engine/Decision Engine/Response Builder
 * itself. Request schema and response shape (a text stream plus an
 * `X-Coach-Meta` header) are unchanged.
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

  const { meta, stream, fallback } = await routeCoachMessage({ user, message, history });
  const headers = { "X-Coach-Meta": encodeURIComponent(JSON.stringify(meta)) };

  try {
    return stream().toTextStreamResponse({ headers });
  } catch (error) {
    // Setup failure (e.g. AI_PROVIDER not configured) — never break chat;
    // fall back to the Decision Engine's own plain-language decision,
    // still delivered as a (single-chunk) stream so the client's reader
    // works identically either way.
    logger.error("coach.stream_setup_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return plainTextStreamResponse(fallback(), headers);
  }
}
