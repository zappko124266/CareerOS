"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";

import { generateExperienceGapAssessmentAction } from "@/actions/application-automation";
import { getSkillUnlockCountsAction } from "@/actions/discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ExperienceGapAssessmentOutput } from "@/features/applications/format";
import { useAsyncAction } from "@/hooks/use-async-action";

const SEVERITY_VARIANT = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
} as const;

/**
 * Sprint 9, Module 8 — Career Gap Engine. Wires the previously-unused
 * `analyzeExperienceGap` AI service into a real, opportunity-scoped panel
 * (persisted as `ExperienceGapAssessment`, same versioned-run convention
 * as the Application Strategy card). Each gap's "N companies require
 * this" count comes from `getSkillUnlockCountsAction` — a real query over
 * the user's own discovered listings, never an AI estimate.
 */
export function CareerGapPanel({
  opportunityId,
  latestAssessment,
}: {
  opportunityId: string;
  latestAssessment: ExperienceGapAssessmentOutput | null;
}) {
  const assessmentAction = useAsyncAction(generateExperienceGapAssessmentAction);
  const unlockCounts = useAsyncAction(getSkillUnlockCountsAction);
  const { run: runUnlockCounts } = unlockCounts;

  const assessment = assessmentAction.result ?? latestAssessment;

  useEffect(() => {
    if (latestAssessment && latestAssessment.gaps.length > 0) {
      runUnlockCounts(latestAssessment.gaps.map((gap) => gap.requirement));
    }
    // Only ever needed once, for whatever assessment the server already loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun() {
    const result = await assessmentAction.run(opportunityId);
    if (result && result.gaps.length > 0) {
      runUnlockCounts(result.gaps.map((gap) => gap.requirement));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Career gap analysis</h2>
          <p className="text-muted-foreground text-sm">
            Compares your resume against this opportunity&apos;s requirements and shows exactly
            what&apos;s missing, backed by real requirements — never a vague readiness guess.
          </p>
        </div>

        {!assessment ? (
          <div className="flex flex-col items-start gap-2">
            <Button onClick={handleRun} disabled={assessmentAction.isPending} size="sm">
              <Sparkles />
              {assessmentAction.isPending ? "Analyzing…" : "Run career gap analysis"}
            </Button>
            {assessmentAction.error && (
              <p className="text-destructive text-sm">{assessmentAction.error}</p>
            )}
            {assessmentAction.isPending && assessmentAction.isSlow && (
              <p className="text-muted-foreground text-sm">
                Still working — this can take up to a minute or two.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Overall readiness</span>
                <span className="text-muted-foreground">{assessment.overallReadiness}%</span>
              </div>
              <Progress
                value={assessment.overallReadiness}
                aria-label="Overall readiness"
                aria-valuetext={`${assessment.overallReadiness}% ready`}
              />
            </div>

            {assessment.gaps.length > 0 ? (
              <div>
                <p className="text-sm font-medium">Gaps</p>
                <ul className="mt-2 flex flex-col gap-3">
                  {assessment.gaps.map((gap) => {
                    const unlocked = unlockCounts.result?.[gap.requirement];
                    return (
                      <li key={gap.requirement} className="ring-foreground/10 rounded-lg p-3 ring-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{gap.requirement}</span>
                          <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          You: {gap.currentLevel} — Needed: {gap.requiredLevel}
                        </p>
                        {typeof unlocked === "number" && unlocked > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Closing this gap already matches {unlocked}{" "}
                            {unlocked === 1 ? "company" : "companies"} in your discovery feed.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No significant gaps found against this opportunity&apos;s requirements.
              </p>
            )}

            {assessment.mitigationSuggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="text-muted-foreground mt-1.5 list-disc pl-5 text-sm">
                  {assessment.mitigationSuggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleRun}
              disabled={assessmentAction.isPending}
              size="sm"
              variant="outline"
              className="w-fit"
            >
              <Sparkles />
              {assessmentAction.isPending ? "Re-analyzing…" : "Re-run analysis"}
            </Button>
            {assessmentAction.error && (
              <p className="text-destructive text-sm">{assessmentAction.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
