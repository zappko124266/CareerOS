import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { CategorizedRequirementList } from "@/components/opportunities/categorized-requirement-list";
import type { MatchBreakdown } from "@/features/opportunities/match";
import { RECOMMENDATION_TIER_LABEL } from "@/features/opportunities/types";
import type { JobMatchAnalysisOutput } from "@/features/career-intelligence/jobs/job-match-analysis/types";

export function MatchPanel({
  deterministic,
  aiResult,
  aiError,
  aiPending,
  aiSlow,
  onRunAi,
}: {
  deterministic: MatchBreakdown;
  aiResult: JobMatchAnalysisOutput | null;
  aiError: string | null;
  aiPending: boolean;
  aiSlow: boolean;
  onRunAi: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Quick match score</h2>
            <p className="text-muted-foreground text-sm">
              Computed instantly from your resume — no AI call, so it&apos;s
              available for every listing without the wait.
            </p>
          </div>

          {deterministic.score !== null && (
            <div className="flex items-center gap-4">
              <ScoreRing score={deterministic.score} label="Quick match score" />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {deterministic.dimensions.map((dimension) => (
              <div key={dimension.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{dimension.label}</span>
                  <span className="text-muted-foreground">
                    {dimension.available ? `${dimension.score}` : "N/A"}
                  </span>
                </div>
                {dimension.available ? (
                  <Progress
                    value={dimension.score}
                    aria-label={dimension.label}
                    aria-valuetext={`${dimension.score} out of 100`}
                  />
                ) : (
                  <div
                    className="bg-muted h-1.5 w-full rounded-full"
                    aria-hidden
                  />
                )}
                <p className="text-muted-foreground text-xs">
                  {dimension.detail}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">AI match analysis</h2>
            <p className="text-muted-foreground text-sm">
              A deeper, on-demand analysis using the real Job Match Analysis
              service — compares your full resume against this listing&apos;s
              description.
            </p>
          </div>

          {!aiResult ? (
            <div className="flex flex-col items-start gap-2">
              <Button onClick={onRunAi} disabled={aiPending} size="sm">
                <Sparkles />
                {aiPending ? "Analyzing…" : "Run AI match analysis"}
              </Button>
              {aiError && <p className="text-destructive text-sm">{aiError}</p>}
              {aiPending && aiSlow && (
                <p className="text-muted-foreground text-sm">
                  Still working — this can take up to a minute or two.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={aiResult.matchScore} label="AI match score" />
                <div>
                  <Badge>{RECOMMENDATION_TIER_LABEL[aiResult.recommendation]}</Badge>
                  <p className="text-muted-foreground mt-1.5 text-sm">
                    {aiResult.summary}
                  </p>
                </div>
              </div>
              {aiResult.matchedRequirements.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Matched requirements</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {aiResult.matchedRequirements.map((req) => (
                      <Badge key={req} variant="secondary">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.unmatchedRequirements.length > 0 && (
                <div>
                  <CategorizedRequirementList requirements={aiResult.unmatchedRequirements} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
