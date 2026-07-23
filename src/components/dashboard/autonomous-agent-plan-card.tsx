import Link from "next/link";
import { Bot, CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENT_STATUS_LABEL } from "@/features/autonomous-agent/types";
import type { AutonomousAgentReport } from "@/features/autonomous-agent/types";

const STATUS_BADGE_VARIANT = {
  IDLE: "outline",
  PLANNING: "secondary",
  DISCOVERING_JOBS: "secondary",
  REVIEWING_OPPORTUNITIES: "secondary",
  WAITING_FOR_USER: "default",
  NEEDS_RESUME_UPDATE: "destructive",
  WAITING_FOR_CONNECTOR: "destructive",
  PAUSED: "outline",
  COMPLETED: "secondary",
} as const;

const PRIORITY_BADGE_VARIANT = {
  high: "destructive",
  normal: "secondary",
  low: "outline",
} as const;

/**
 * Sprint 15 — Mission Control's Autonomous Career Agent card. Every field
 * here is a pre-computed value off `AutonomousAgentReport`
 * (`features/autonomous-agent/orchestrator.ts`'s `runAutonomousAgentCycle`)
 * — this component does no business logic of its own, same convention as
 * every other dashboard card (`ApplicationsSummaryCard`,
 * `CareerAgentStatusCard`). Deliberately does **not** re-render "Recent
 * Background Activity" — `CareerAgentStatusCard` already owns that (its
 * `recentExecutions` list), reused as-is; this card is the plan/status
 * view `CareerAgentStatusCard` never had.
 */
export function AutonomousAgentPlanCard({ report }: { report: AutonomousAgentReport }) {
  const { plan, todaysProgress, schedule } = report;
  const [currentAction, ...upcoming] = plan.actions;
  const upcomingSlots = schedule.slice(1, 4);

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bot className="text-muted-foreground size-4" />
            Autonomous Agent
          </span>
          <Badge variant={STATUS_BADGE_VARIANT[plan.status]}>{AGENT_STATUS_LABEL[plan.status]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <p className="text-muted-foreground text-sm">{plan.statusDetail}</p>

        {todaysProgress.total > 0 && (
          <p className="text-muted-foreground text-xs">
            {todaysProgress.completed} of {todaysProgress.total} background task
            {todaysProgress.total === 1 ? "" : "s"} completed today.
          </p>
        )}

        {currentAction ? (
          <div className="border-border bg-muted/30 rounded-md border p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Next planned action</p>
            <p className="mt-1 font-medium">{currentAction.title}</p>
            <p className="text-muted-foreground mt-0.5 text-sm">{currentAction.why}</p>
            <Button asChild size="sm" className="mt-2 w-fit">
              <Link href={currentAction.href}>Open</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <span className="text-muted-foreground">Nothing needs your attention right now.</span>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Upcoming actions</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {upcoming.slice(0, 3).map((action, index) => (
                <li key={action.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={action.href} className="min-w-0 truncate hover:underline">
                    {action.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={PRIORITY_BADGE_VARIANT[action.priority]}>{action.priority}</Badge>
                    {upcomingSlots[index] && (
                      <span className="text-muted-foreground text-xs">{upcomingSlots[index].time}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
