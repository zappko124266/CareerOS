import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { listUsersDueForDiscovery } from "@/features/discovery/queries";
import { hideStaleCompanies, hideStaleListings } from "@/features/discovery/maintenance";
import { runDiscovery } from "@/features/discovery/run-discovery";

// Processed sequentially, capped per invocation — each `runDiscovery` call
// makes several AI Router calls (search strategy + job/company ranking)
// and can legitimately take minutes (see docs/ARCHITECTURE.md#job-discovery-engine
// for this session's observed AI Router latency). With no background job
// queue in this codebase (confirmed absent by this sprint's own audit —
// see the same section), a single Vercel Function invocation processing
// everyone at once would risk the platform's execution time limit for any
// non-trivial user count. A real queue (reusing this same `runDiscovery`
// function as the worker) is the natural next step once that becomes the
// bottleneck — flagged here rather than silently capped with no
// explanation.
const MAX_USERS_PER_INVOCATION = 5;

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — Background
 * Discovery's actual "background" mechanism. Also callable manually with
 * the same `CRON_SECRET` bearer token for local testing/verification.
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

  const dueUserIds = await listUsersDueForDiscovery(now);
  const batch = dueUserIds.slice(0, MAX_USERS_PER_INVOCATION);

  const results: { userId: string; status: "completed" | "skipped" | "failed"; detail?: string }[] = [];

  for (const userId of batch) {
    const entitlement = await checkEntitlement(userId, "JOB_DISCOVERY_RUN");
    if (!entitlement.allowed) {
      results.push({ userId, status: "skipped", detail: "entitlement limit reached" });
      continue;
    }

    try {
      await logAuditEvent("discovery.run_started", {
        userId,
        metadata: { trigger: "SCHEDULED" },
      });
      const summary = await runDiscovery(userId, "SCHEDULED");
      await consumeEntitlement(userId, "JOB_DISCOVERY_RUN");
      await logAuditEvent("discovery.run_completed", {
        userId,
        metadata: {
          runId: summary.runId,
          jobsFound: summary.jobsFound,
          newJobsFound: summary.newJobsFound,
        },
      });
      results.push({ userId, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("discovery.scheduled_run_failed", { userId, message });
      await logAuditEvent("discovery.run_failed", { userId, metadata: { message } });
      results.push({ userId, status: "failed", detail: message });
    }
  }

  return NextResponse.json({
    staleListingsHidden,
    staleCompaniesHidden,
    dueCount: dueUserIds.length,
    processedCount: batch.length,
    remainingCount: Math.max(0, dueUserIds.length - batch.length),
    results,
  });
}
