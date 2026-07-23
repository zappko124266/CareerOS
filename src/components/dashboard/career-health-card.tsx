"use client";

import { useState } from "react";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { generateCareerHealthAction } from "@/actions/career";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { CareerHealthSummary } from "@/features/career-agent/types";

/**
 * Career Health Summary — Sprint 3 rule 4: leads with a human-readable
 * assessment (`summary.headline` + strengths/blockers), not a bare
 * percentage. `overallScore` is still shown, but as a small secondary
 * `ScoreRing` beside the narrative rather than the first thing the user
 * sees. The "save snapshot" action (`generateCareerHealthAction`,
 * `computeCareerHealthV2` persisted) is unchanged — this is the only
 * place that real, already-shipped feature is reachable from.
 */
export function CareerHealthCard({ summary }: { summary: CareerHealthSummary }) {
  const [saved, setSaved] = useState(false);
  const saveAction = useAsyncAction(generateCareerHealthAction);

  async function handleSave() {
    const result = await saveAction.run();
    if (result) {
      setSaved(true);
      toast.success("Career Health snapshot saved");
    } else if (saveAction.error) {
      toast.error(saveAction.error);
    }
  }

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="text-muted-foreground size-4" />
          Career Health
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-4">
          {summary.overallScore !== null && (
            <ScoreRing score={summary.overallScore} label="Career Health Score" size="sm" />
          )}
          <p className="flex-1 text-sm font-medium">{summary.headline}</p>
        </div>

        {summary.strengths.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Strengths
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {summary.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.blockers.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Blockers
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {summary.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex items-center gap-3">
          {summary.overallScore === null ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/resume">Upload a resume</Link>
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saveAction.isPending} size="sm" variant="outline">
                {saveAction.isPending ? "Saving…" : saved ? "Snapshot saved" : "Save snapshot"}
              </Button>
              {saveAction.error && <p className="text-destructive text-sm">{saveAction.error}</p>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
