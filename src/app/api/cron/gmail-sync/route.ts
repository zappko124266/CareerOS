import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { runAutomation } from "@/features/automation/engine";

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — the Gmail
 * Intelligence Engine's only path to the real Gmail API. Also callable
 * manually with the same `CRON_SECRET` bearer token for local
 * testing/verification, same convention as `/api/cron/discovery` and
 * `/api/cron/follow-up`. The due-user loop, entitlement check, and
 * classify/extract/persist work all live in `features/gmail-intelligence/`
 * and `features/automation/tasks/gmail-sync.ts` — this route only does
 * the auth check and hands off to `runAutomation`, identical shape to
 * the other two cron routes.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    logger.error("gmail_sync_cron.not_configured", {});
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runAutomation("gmail_sync");

  return NextResponse.json({
    dueCount: summary.dueCount,
    processedCount: summary.processedCount,
    results: summary.results,
  });
}
