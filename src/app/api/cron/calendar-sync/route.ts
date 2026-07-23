import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { runAutomation } from "@/features/automation/engine";

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — the Calendar
 * Intelligence Engine's only path to real Calendar Provider API calls.
 * Identical shape to `/api/cron/discovery`, `/api/cron/follow-up`, and
 * `/api/cron/gmail-sync`: auth check, then hand off to `runAutomation`.
 * Hard Lock 2 — this route does not implement its own scheduling; it is
 * one more real trigger of the one Automation Engine every other cron
 * route already uses.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    logger.error("calendar_sync_cron.not_configured", {});
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runAutomation("calendar_sync");

  return NextResponse.json({
    dueCount: summary.dueCount,
    processedCount: summary.processedCount,
    results: summary.results,
  });
}
