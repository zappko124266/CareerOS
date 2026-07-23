import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { INTERVIEW_STAGE_LABEL } from "@/features/interviews/types";
import type { CareerHealthResultV2 } from "@/features/career/types";
import type { InterviewEvent } from "@/features/career-agent/types";

/**
 * The Interview Center — Sprint 10, requirement 8. Combines the existing
 * upcoming-interviews list (unchanged, `snapshot.upcomingInterviews`)
 * with the Career Health Engine's `interviewReadiness` factor (already
 * computed by `computeCareerHealthV2`, Sprint 3/4) — two pieces of real
 * data that already existed on their own, just never shown together.
 */
export function InterviewCenterCard({
  interviews,
  health,
}: {
  interviews: InterviewEvent[];
  health: CareerHealthResultV2 | null;
}) {
  const readiness = health?.interviewReadiness ?? null;

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="text-muted-foreground size-4" />
          Interview Center
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        {readiness && (
          <div className="border-foreground/10 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Readiness</span>
            {readiness.score !== null ? (
              <Badge variant="secondary">{readiness.score}/100</Badge>
            ) : (
              <span className="text-muted-foreground text-xs">{readiness.explanation}</span>
            )}
          </div>
        )}

        {interviews.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Nothing scheduled"
            description="Schedule an interview round from an application to see it here."
            action={
              <Button asChild size="sm">
                <Link href="/applications">View applications</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <ul className="flex flex-1 flex-col gap-3">
            {interviews.map((interview) => (
              <li key={interview.id}>
                <Link
                  href={`/opportunities/${interview.opportunity.id}`}
                  className="hover:bg-muted -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="wrap-break-word text-sm font-medium">
                      {interview.roundLabel ?? INTERVIEW_STAGE_LABEL[interview.stage]} —{" "}
                      {interview.opportunity.title}
                    </p>
                    <p className="text-muted-foreground wrap-break-word text-xs">
                      {interview.opportunity.companyName}
                    </p>
                  </div>
                  {interview.scheduledAt && (
                    <Badge variant="secondary" className="shrink-0">
                      {interview.scheduledAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
