"use client";

import { Sparkles } from "lucide-react";

import {
  getResumeOverallAnalysisAction,
  getResumeStrengthsAction,
  getResumeWeaknessesAction,
} from "@/actions/resume-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";

const SEVERITY_VARIANT = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
} as const;

const IMPACT_VARIANT = {
  high: "secondary",
  medium: "outline",
  low: "outline",
} as const;

function GenerateButton({
  isPending,
  onClick,
  label,
}: {
  isPending: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button size="sm" onClick={onClick} disabled={isPending} className="w-fit">
      <Sparkles />
      {isPending ? "Analyzing…" : label}
    </Button>
  );
}

export function ResumeSuggestionsPanel({ resumeId }: { resumeId: string }) {
  const overall = useAsyncAction(getResumeOverallAnalysisAction);
  const strengths = useAsyncAction(getResumeStrengthsAction);
  const weaknesses = useAsyncAction(getResumeWeaknessesAction);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Overall assessment</h2>
          {!overall.result ? (
            <>
              <GenerateButton
                isPending={overall.isPending}
                onClick={() => overall.run(resumeId)}
                label="Get overall assessment"
              />
              {overall.error && (
                <p className="text-destructive text-sm">{overall.error}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">{overall.result.overallScore}/100</span>{" "}
                — {overall.result.summary}
              </p>
              <div>
                <p className="text-sm font-medium">Recommended actions</p>
                <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
                  {overall.result.recommendedActions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
              <Button size="sm" variant="ghost" className="w-fit" onClick={overall.reset}>
                Regenerate
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Strengths</h2>
          {!strengths.result ? (
            <>
              <GenerateButton
                isPending={strengths.isPending}
                onClick={() => strengths.run(resumeId)}
                label="Find my strengths"
              />
              {strengths.error && (
                <p className="text-destructive text-sm">{strengths.error}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {strengths.result.standoutFactor}
              </p>
              <div className="flex flex-col gap-2">
                {strengths.result.strengths.map((strength) => (
                  <div key={strength.area} className="flex items-start gap-2">
                    <Badge variant={IMPACT_VARIANT[strength.impact]}>
                      {strength.area}
                    </Badge>
                    <p className="text-muted-foreground text-sm">{strength.evidence}</p>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-fit" onClick={strengths.reset}>
                Regenerate
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Weaknesses</h2>
          {!weaknesses.result ? (
            <>
              <GenerateButton
                isPending={weaknesses.isPending}
                onClick={() => weaknesses.run(resumeId)}
                label="Find weaknesses to fix"
              />
              {weaknesses.error && (
                <p className="text-destructive text-sm">{weaknesses.error}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {weaknesses.result.weaknesses.map((weakness) => (
                  <div key={weakness.area} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[weakness.severity]}>
                        {weakness.area}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{weakness.issue}</p>
                    <p className="text-sm">Fix: {weakness.fix}</p>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-fit" onClick={weaknesses.reset}>
                Regenerate
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
