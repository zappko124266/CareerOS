import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { ApplicationAnalytics } from "@/features/analytics/service";

/** Replaces the old "Applications — isn't built yet" roadmap placeholder
 * — Application Studio/Tracker/Analytics were built a sprint ago, so that
 * placeholder was stale, not honest. Reuses the exact same
 * `computeApplicationAnalytics` real-aggregate service the full Analytics
 * page uses — no separate counting logic. */
export function ApplicationsSummaryCard({ analytics }: { analytics: ApplicationAnalytics }) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="text-muted-foreground size-4" />
          Applications
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
            <Button asChild size="sm" variant="outline" className="mt-auto">
              <Link href="/opportunities/analytics">View full analytics</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
