import { Card, CardContent } from "@/components/ui/card";
import { MatchFactorsList } from "@/components/opportunities/discovery/match-factors-list";
import { OPPORTUNITY_SCORE_V2_FACTOR_LABEL } from "@/features/discovery/types";
import type { OpportunityScoreV2Factors, RankingFactor } from "@/features/discovery/types";

/**
 * Sprint 9, Module 7 — surfaces the Opportunity Score (`computeOpportunityScoreV2`).
 * Sprint 2 (Opportunity Intelligence): converted from a client component
 * that fetched this via `useEffect` on mount to a plain presentational
 * component fed synchronously by the Server Component detail page —
 * `computeOpportunityScoreV2` is entirely code-computed (no AI call, no
 * entitlement gate), so there was never a reason for the client
 * round-trip; computing it in the page's existing `Promise.all` removes
 * a network waterfall and a loading-flicker state.
 */
export function OpportunityScoreCard({
  factors,
  overallScore,
}: {
  factors: OpportunityScoreV2Factors;
  overallScore: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Opportunity Score</h2>
          <p className="text-muted-foreground text-sm">
            How well this saved opportunity fits your resume, career goals, and real activity on
            file.
          </p>
        </div>

        <MatchFactorsList
          overallScore={overallScore}
          factors={factors as unknown as Record<string, RankingFactor>}
          labels={OPPORTUNITY_SCORE_V2_FACTOR_LABEL}
          scoreLabel="Opportunity Score"
        />
      </CardContent>
    </Card>
  );
}
