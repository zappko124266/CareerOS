"use client";

import { useEffect } from "react";

import { getOpportunityScoreV2Action } from "@/actions/opportunities";
import { Card, CardContent } from "@/components/ui/card";
import { MatchFactorsList } from "@/components/opportunities/discovery/match-factors-list";
import { OPPORTUNITY_SCORE_V2_FACTOR_LABEL } from "@/features/discovery/types";
import type { RankingFactor } from "@/features/discovery/types";
import { useAsyncAction } from "@/hooks/use-async-action";

/**
 * Sprint 9, Module 7 — surfaces the Opportunity Score (built in Sprint 8
 * as `computeOpportunityScoreV2`, never previously rendered anywhere).
 * Unlike `MatchPanel`'s AI match card, this runs automatically on mount
 * rather than behind a button: `getOpportunityScoreV2Action` is entirely
 * code-computed (no AI call, no entitlement gate — see its doc comment),
 * so there's no cost or latency reason to make the user ask for it.
 */
export function OpportunityScoreCard({ opportunityId }: { opportunityId: string }) {
  const score = useAsyncAction(getOpportunityScoreV2Action);
  const { run } = score;

  useEffect(() => {
    run(opportunityId);
    // Only ever re-run if the opportunity itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Opportunity Score</h2>
          <p className="text-muted-foreground text-sm">
            How well this saved opportunity fits your resume, career goals, and real activity on
            file — recomputed from your latest data every time you open this tab.
          </p>
        </div>

        {score.isPending && !score.result && (
          <p className="text-muted-foreground text-sm">Computing…</p>
        )}
        {score.error && <p className="text-destructive text-sm">{score.error}</p>}
        {score.result && (
          <MatchFactorsList
            overallScore={score.result.overallScore}
            factors={score.result.factors as unknown as Record<string, RankingFactor>}
            labels={OPPORTUNITY_SCORE_V2_FACTOR_LABEL}
            scoreLabel="Opportunity Score"
          />
        )}
      </CardContent>
    </Card>
  );
}
