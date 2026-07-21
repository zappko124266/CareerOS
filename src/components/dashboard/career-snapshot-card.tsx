import Link from "next/link";
import { MapPin, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CareerRoadmap } from "@/features/coach/roadmap";
import type { CoachContext } from "@/features/coach/types";

/**
 * Personalizes the dashboard with the user's own onboarding answers and
 * the existing Roadmap Engine — reuses `getCoachContext`/`getCareerRoadmap`
 * (Coach's Context/Roadmap Engines) wholesale, no new query, no new rule
 * engine. Only rendered fields the user actually has: no target role set
 * means no "Current Goal" row, not a fabricated placeholder.
 */
export function CareerSnapshotCard({
  onboarding,
  roadmap,
}: {
  onboarding: CoachContext["onboarding"];
  roadmap: CareerRoadmap;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Career Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(onboarding.targetRole || onboarding.targetTimeline) && (
          <div className="flex items-start gap-2">
            <Target className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Current goal</p>
              <p className="text-sm font-medium">
                {[onboarding.targetRole, onboarding.targetTimeline].filter(Boolean).join(" — ")}
              </p>
            </div>
          </div>
        )}

        {onboarding.locationSummary && (
          <div className="flex items-start gap-2">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Location</p>
              <p className="text-sm font-medium">{onboarding.locationSummary}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current focus</span>
            <span className="font-medium">{roadmap.progressPercent}%</span>
          </div>
          <Progress value={roadmap.progressPercent} aria-label="Career roadmap progress" />
          <p className="text-sm font-medium">{roadmap.currentMilestone.title}</p>
          <p className="text-muted-foreground text-sm">{roadmap.currentMilestone.why}</p>
        </div>

        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href={roadmap.currentMilestone.cta.href}>{roadmap.currentMilestone.cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
