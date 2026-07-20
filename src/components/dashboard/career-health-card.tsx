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
import type { CareerHealthResultV2 } from "@/features/career/types";

const FACTOR_LABEL: Record<keyof Omit<CareerHealthResultV2, "overallScore">, string> = {
  interviewReadiness: "Interview readiness",
  resumeQuality: "Resume quality",
  linkedinQuality: "LinkedIn quality",
  skillReadiness: "Skill readiness",
  marketReadiness: "Market readiness",
  companyReadiness: "Company readiness",
  growthReadiness: "Growth readiness",
};

export function CareerHealthCard({ health }: { health: CareerHealthResultV2 | null }) {
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

  const availableFactors = health
    ? (Object.entries(health).filter(
        ([key, value]) => key !== "overallScore" && (value as { score: number | null }).score !== null,
      ) as [keyof Omit<CareerHealthResultV2, "overallScore">, { score: number; explanation: string }][])
    : [];

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="text-muted-foreground size-4" />
          Career Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        {!health ? (
          <>
            <p className="text-muted-foreground flex-1 text-sm">
              Upload a resume or start applying to unlock your Career Health score — every factor
              is computed from your own real activity, never a guess.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/resume">Upload a resume</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <ScoreRing score={health.overallScore} label="Career Health Score" />
              <p className="text-muted-foreground text-sm">
                Average of {availableFactors.length} of 7 factors that have real data behind them.
              </p>
            </div>
            {availableFactors.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {availableFactors.map(([key, factor]) => (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{FACTOR_LABEL[key]}</span>
                    <span className="font-medium">{factor.score}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={handleSave} disabled={saveAction.isPending} size="sm" variant="outline" className="w-fit">
              {saveAction.isPending ? "Saving…" : saved ? "Snapshot saved" : "Save snapshot"}
            </Button>
            {saveAction.error && <p className="text-destructive text-sm">{saveAction.error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
