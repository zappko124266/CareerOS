import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplicationApprovalList } from "./application-approval-list";
import type { ApplicationAnalytics } from "@/features/analytics/service";
import type { ApplicationEngineExecutionSummary } from "@/features/career-brain/types";

/** Replaces the old "Applications — isn't built yet" roadmap placeholder
 * — Application Studio/Tracker/Analytics were built a sprint ago, so that
 * placeholder was stale, not honest. Reuses the exact same
 * `computeApplicationAnalytics` real-aggregate service the full Analytics
 * page uses — no separate counting logic.
 *
 * Sprint 3: only the 4 fields this card actually renders, as a `Pick` —
 * so the dashboard can pass `CoachContext.applications` (a subset
 * `getCoachContext` already derived from the same service, no second
 * `computeApplicationAnalytics` call) without needing the full
 * `ApplicationAnalytics` shape.
 *
 * Sprint 18 — extended (not duplicated into a new widget) with the
 * Autonomous Application Engine's real, persisted execution state
 * (`ApplicationEngineExecutionSummary`, a pure Career Brain derivation —
 * no new query here). Today's applications / submitted / failed are
 * plain counts; "waiting your approval" renders real Approve/Decline
 * controls via `ApplicationApprovalList`, a small client island composed
 * into this otherwise server-rendered card.
 */
export function ApplicationsSummaryCard({
  analytics,
  engineSummary,
}: {
  analytics: Pick<ApplicationAnalytics, "totalApplications" | "totalInterviews" | "totalOffers" | "responseRate">;
  engineSummary?: ApplicationEngineExecutionSummary;
}) {
  const autoApplyAvailable = (engineSummary?.easyApplyConnectorIds.length ?? 0) > 0;

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Briefcase className="text-muted-foreground size-4" />
            Applications
          </span>
          {engineSummary && (
            <Badge variant={autoApplyAvailable ? "secondary" : "outline"}>
              Auto Apply {autoApplyAvailable ? "available" : "not yet available"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {analytics.totalApplications === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Once you apply, your response and interview rates show up here."
            action={
              <Button asChild size="sm">
                <Link href="/opportunities">View opportunities</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-semibold tracking-tight">{analytics.totalApplications}</p>
              <Badge variant="secondary">{analytics.responseRate}% response rate</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {analytics.totalInterviews} interview{analytics.totalInterviews === 1 ? "" : "s"},{" "}
              {analytics.totalOffers} offer{analytics.totalOffers === 1 ? "" : "s"}.
            </p>

            {engineSummary && (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{engineSummary.todaysCount}</span> today
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{engineSummary.submittedCount}</span> submitted
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{engineSummary.failedCount}</span> failed
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{engineSummary.manualRequiredCount}</span> need manual
                    review
                  </span>
                </div>

                <ApplicationApprovalList items={engineSummary.waitingApproval} />
              </>
            )}

            <Button asChild size="sm" variant="outline" className="mt-auto">
              <Link href="/opportunities/analytics">View full analytics</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
