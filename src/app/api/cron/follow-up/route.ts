import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { listOpportunitiesDueForFollowUp } from "@/features/applications/queries";
import { generateFollowUpRecommendation } from "@/features/applications/service";

// Same bounded-per-invocation discipline as `/api/cron/discovery` — each
// `generateFollowUpRecommendation` call is one AI Router call and can
// legitimately take a while (see docs/ARCHITECTURE.md#job-discovery-engine
// for this session's observed AI Router latency, which applies to every
// AI Router caller, not just discovery). No background job queue exists
// in this codebase, so a single Vercel Function invocation processing an
// unbounded list would risk the platform's execution time limit.
const MAX_OPPORTUNITIES_PER_INVOCATION = 10;

/**
 * Vercel Cron hits this on a schedule (see `vercel.json`) — Module 12's
 * "Background Automation" for the AI Follow-up Engine (Module 9). Also
 * callable manually with the same `CRON_SECRET` bearer token for local
 * testing/verification, same convention as `/api/cron/discovery`.
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

  const now = new Date();
  const due = await listOpportunitiesDueForFollowUp(now, MAX_OPPORTUNITIES_PER_INVOCATION);

  const results: {
    opportunityId: string;
    status: "completed" | "skipped" | "failed";
    detail?: string;
  }[] = [];

  for (const { opportunityId, userId } of due) {
    const entitlement = await checkEntitlement(userId, "FOLLOW_UP_RECOMMENDATION");
    if (!entitlement.allowed) {
      results.push({ opportunityId, status: "skipped", detail: "entitlement limit reached" });
      continue;
    }

    try {
      const recommendation = await generateFollowUpRecommendation(opportunityId, userId);
      await consumeEntitlement(userId, "FOLLOW_UP_RECOMMENDATION");
      await logAuditEvent("follow_up.recommendation_generated", {
        userId,
        metadata: {
          opportunityId,
          recommendationType: recommendation.recommendationType,
          trigger: "SCHEDULED",
        },
      });
      results.push({ opportunityId, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("follow_up_cron.run_failed", { opportunityId, userId, message });
      results.push({ opportunityId, status: "failed", detail: message });
    }
  }

  return NextResponse.json({
    dueCount: due.length,
    results,
  });
}
