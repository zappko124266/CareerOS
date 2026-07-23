import Link from "next/link";
import { Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTOMATION_TASK_LABEL } from "@/features/automation/types";
import type { AutomationExecution } from "@/features/automation/types";
import type { DiscoveryBriefing } from "@/features/discovery/briefing";
import type { OpportunitySyncSummary } from "@/features/career-brain/types";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_BADGE_VARIANT = {
  completed: "secondary",
  skipped: "outline",
  failed: "destructive",
} as const;

/**
 * "Is my agent actively working for me, and what has it found?" — reuses
 * the existing Daily Career Agent's own briefing (`buildDiscoveryBriefing`,
 * `features/discovery/briefing.ts`), the same real, never-fabricated
 * counts the Discovery page's `DailyBriefingCard` already shows. This is
 * the compact, dashboard-level variant — "View discovery feed" links out
 * to the fuller page for dream-employer matches and eligibility notes.
 *
 * Sprint 5 (Automation Engine) — "Career Agent Status uses execution
 * history, display real execution state only": adds a real recent-runs
 * list sourced from `features/automation/history.ts`'s
 * `listAutomationExecutions` (already fetched once by the Career Brain).
 * Renders nothing when there's no history yet — never a placeholder row.
 *
 * Sprint 19 (Universal Opportunity Sync Engine) — extends this same card
 * (no new dashboard widget) with `brain.opportunitySyncSummary`, a pure
 * Career Brain derivation over real `DiscoveryRun` counters and
 * `discovery.listing_changed`/`discovery.listing_closed` audit events.
 * "Closing soon" is deliberately absent — no connector this codebase
 * integrates with reports a real closing/expiration date, and Sprint 19's
 * own rule is "do not fabricate dates or deadlines."
 */
export function CareerAgentStatusCard({
  status,
  recentExecutions,
  syncSummary,
}: {
  status: DiscoveryBriefing;
  recentExecutions: AutomationExecution[];
  syncSummary?: OpportunitySyncSummary;
}) {
  const hasSyncActivity =
    !!syncSummary &&
    (syncSummary.newToday > 0 ||
      syncSummary.updatedToday > 0 ||
      syncSummary.closedToday > 0 ||
      syncSummary.duplicatesRemovedToday > 0 ||
      syncSummary.requirementsChangedToday > 0);

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-muted-foreground size-4" />
          Career Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex-1">
          <p className="font-medium">{status.headline}</p>
          <p className="text-muted-foreground mt-1 text-sm">{status.detail}</p>
          {status.improvementNote && (
            <p className="text-muted-foreground mt-1 text-sm">{status.improvementNote}</p>
          )}
        </div>

        {hasSyncActivity && syncSummary && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Today&apos;s sync</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{syncSummary.newToday}</span> new
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{syncSummary.updatedToday}</span> updated
              </span>
              {syncSummary.closedToday > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{syncSummary.closedToday}</span> closed
                </span>
              )}
              {syncSummary.requirementsChangedToday > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{syncSummary.requirementsChangedToday}</span>{" "}
                  requirements changed
                </span>
              )}
              {syncSummary.duplicatesRemovedToday > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{syncSummary.duplicatesRemovedToday}</span> duplicates
                  removed
                </span>
              )}
            </div>
            {syncSummary.highImpactChanges.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-1">
                {syncSummary.highImpactChanges.slice(0, 2).map((event) => (
                  <li key={event.id} className="text-sm">
                    <Badge variant="secondary" className="mr-1.5">
                      Salary increased
                    </Badge>
                    <span className="text-muted-foreground">{event.companyName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {recentExecutions.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Recent automation activity
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {recentExecutions.slice(0, 3).map((execution) => (
                <li key={execution.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{AUTOMATION_TASK_LABEL[execution.taskId]}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[execution.status]}>{execution.status}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(execution.timestamp)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href="/opportunities/discovery">View discovery feed</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
