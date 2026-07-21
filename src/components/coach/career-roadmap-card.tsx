import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CareerRoadmap } from "@/features/coach/roadmap";

/**
 * Replaces the old Career Journey card (`career-journey.tsx`, removed
 * this sprint) — same "show real progress, don't invent scores" spirit,
 * now built on the richer 7-milestone Roadmap Engine instead of a flat
 * checklist. Completed and locked milestones stay collapsed to a single
 * line each; only Current and Next get full detail.
 */
export function CareerRoadmapCard({ roadmap }: { roadmap: CareerRoadmap }) {
  const { milestones, currentMilestone, progressPercent } = roadmap;
  const currentIndex = milestones.findIndex((m) => m.id === currentMilestone.id);
  const completed = milestones.filter((m) => m.status === "completed");
  const nextMilestone = milestones[currentIndex + 1] ?? null;
  const laterMilestones = milestones.slice(currentIndex + 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Career Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>

        {completed.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {completed.map((milestone) => (
              <li
                key={milestone.id}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <Check className="text-foreground size-3.5 shrink-0" />
                <span className="line-through decoration-muted-foreground/40">
                  {milestone.title}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-foreground/10 flex flex-col gap-3 rounded-xl border p-4">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Current milestone
          </span>
          <div>
            <p className="text-lg font-semibold">{currentMilestone.title}</p>
            <p className="text-muted-foreground text-sm">{currentMilestone.description}</p>
          </div>
          <p className="text-sm">{currentMilestone.why}</p>
          <Button asChild size="sm" className="w-fit">
            <Link href={currentMilestone.cta.href}>{currentMilestone.cta.label}</Link>
          </Button>
        </div>

        {nextMilestone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Next:</span>
            <span className="font-medium">{nextMilestone.title}</span>
          </div>
        )}

        {laterMilestones.length > 0 && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Lock className="size-3" />
            {laterMilestones.map((milestone) => milestone.title).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
