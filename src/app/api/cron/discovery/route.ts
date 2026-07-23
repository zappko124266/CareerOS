import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { runAutomation } from "@/features/automation/engine";
import { hideStaleCompanies, hideStaleListings } from "@/features/discovery/maintenance";

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — Background
 * Discovery's actual "background" mechanism. Also callable manually with
 * the same `CRON_SECRET` bearer token for local testing/verification.
 *
 * Sprint 5 (Automation Engine): the due-user loop this route used to run
 * itself (batch fetch, entitlement check, `runDiscovery`, audit logging,
 * per-user try/catch) now lives in `features/automation/` as the
 * `job_discovery_run` task — this route only does the auth check and the
 * stale-listing/company maintenance pass (unrelated to task execution),
 * then hands the actual work to `runAutomation`. The manual "Discover
 * now" trigger (`actions/discovery.ts`) is untouched and keeps its own
 * `discovery.run_*` audit events; this scheduled path's execution
 * history is now the unified `automation.task_*` events instead.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    logger.error("discovery.cron_not_configured", {});
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();

  // Module 10 — Background Discovery Engine's stale-listing pass. Cheap
  // pure DB updates, so this runs every invocation regardless of which
  // users are due for a fresh discovery run below.
  const [staleListingsHidden, staleCompaniesHidden] = await Promise.all([
    hideStaleListings(now),
    hideStaleCompanies(now),
  ]);

  const summary = await runAutomation("job_discovery_run", now);

  return NextResponse.json({
    staleListingsHidden,
    staleCompaniesHidden,
    dueCount: summary.dueCount,
    processedCount: summary.processedCount,
    results: summary.results,
  });
}
