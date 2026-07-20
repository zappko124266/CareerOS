"use server";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { computeApplicationAnalytics } from "@/features/analytics/service";
import { generateAnalyticsInsights } from "@/features/career-intelligence/applications";
import type { AnalyticsInsightsOutput } from "@/features/career-intelligence/applications/analytics-insights/types";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("analytics.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/** Bounded, on-demand AI call (not run automatically on page load) —
 * consistent with the AI Router's observed latency/instability elsewhere
 * in this codebase (see docs/ARCHITECTURE.md). Grounded entirely in the
 * user's own real, already-computed aggregate stats. */
export async function generateAnalyticsInsightsAction(): Promise<
  DataActionResult<AnalyticsInsightsOutput>
> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "ANALYTICS_INSIGHTS");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free analytics insights this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const analytics = await computeApplicationAnalytics(user.id);

    if (analytics.totalApplications === 0) {
      return {
        status: "error",
        message: "Apply to at least one opportunity before requesting insights.",
      };
    }

    const insights = await generateAnalyticsInsights({
      totalApplications: analytics.totalApplications,
      responseRate: analytics.responseRate,
      interviewRate: analytics.interviewRate,
      offerRate: analytics.offerRate,
      topCompanies: analytics.bestCompanies,
      topRoles: analytics.bestRoles,
      resumePerformance: analytics.resumePerformance,
      coverLetterResponseRateWith: analytics.coverLetterResponseRateWith,
      coverLetterResponseRateWithout: analytics.coverLetterResponseRateWithout,
    });

    await consumeEntitlement(user.id, "ANALYTICS_INSIGHTS");
    await logAuditEvent("analytics_insights.generated", {
      userId: user.id,
      metadata: { insightCount: insights.insights.length },
    });

    return { status: "success", data: insights };
  } catch (error) {
    return toActionError(error, "We couldn't generate insights right now.");
  }
}
