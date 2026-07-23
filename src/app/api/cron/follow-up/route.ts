import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { runAutomation } from "@/features/automation/engine";

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — Module 12's
 * "Background Automation" for the AI Follow-up Engine (Module 9). Also
 * callable manually with the same `CRON_SECRET` bearer token for local
 * testing/verification, same convention as `/api/cron/discovery`.
 *
 * Sprint 5 (Automation Engine): the due-opportunity loop this route used
 * to run itself now lives in `features/automation/` as the
 * `follow_up_recommendation` task. The manual follow-up trigger
 * (`actions/application-automation.ts`) is untouched and keeps its own
 * `follow_up.recommendation_generated` audit event; this scheduled
 * path's execution history is now the unified `automation.task_*`
 * events instead.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    logger.error("follow_up_cron.not_configured", {});
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runAutomation("follow_up_recommendation");

  return NextResponse.json({
    dueCount: summary.dueCount,
    results: summary.results,
  });
}
