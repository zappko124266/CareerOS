import Link from "next/link";
import { Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyMission } from "@/features/career-agent/types";

/**
 * The Daily Mission Engine's card — exactly one recommendation, with an
 * effort estimate and the "why," so the user always knows the single
 * highest-impact next action without having to weigh several widgets
 * against each other.
 */
export function DailyMissionCard({ mission }: { mission: DailyMission }) {
  return (
    <Card className="border-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="text-muted-foreground size-4" />
          Today&apos;s Mission
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{mission.title}</p>
            <Badge variant="secondary">{mission.effort}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{mission.why}</p>
        </div>
        <Button asChild className="w-fit shrink-0">
          <Link href={mission.href}>{mission.actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
