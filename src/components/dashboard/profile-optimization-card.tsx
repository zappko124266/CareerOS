import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchFactorsList } from "@/components/opportunities/discovery/match-factors-list";
import type { RankingFactor } from "@/features/discovery/types";
import type { ProfileInsight } from "@/features/profile-optimization/insights";
import type { ProfileOptimizationSummary } from "@/features/profile-optimization/service";

const LABELS: Record<keyof ProfileOptimizationSummary, string> = {
  resumeScore: "Resume / ATS",
  linkedInScore: "LinkedIn",
  careerGapScore: "Career Gap Readiness",
  opportunityScore: "Opportunity Score",
  applicationReadiness: "Application Readiness",
};

function averageAvailable(summary: ProfileOptimizationSummary): number {
  const factors = Object.values(summary) as RankingFactor[];
  const available = factors.filter((factor) => factor.available);
  if (available.length === 0) return 0;
  return Math.round(available.reduce((sum, factor) => sum + factor.score, 0) / available.length);
}

/** Sprint 10, Module 7 — Profile Optimization Dashboard. One card
 * aggregating every real score CareerOS already computes elsewhere
 * (`getProfileOptimizationSummary`) — no new AI call, `available:false`
 * shown honestly wherever the user hasn't generated the underlying
 * analysis yet, same `RankingFactor` convention used throughout Discovery
 * and Opportunity Score. */
export function ProfileOptimizationCard({
  summary,
  insights,
}: {
  summary: ProfileOptimizationSummary;
  insights: ProfileInsight[];
}) {
  return (
    <Card className="sm:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-muted-foreground size-4" />
          Profile Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <MatchFactorsList
          overallScore={averageAvailable(summary)}
          factors={summary as unknown as Record<string, RankingFactor>}
          labels={LABELS}
          scoreLabel="Overall profile strength"
        />

        {insights.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">Insights</p>
            <ul className="flex flex-col gap-2">
              {insights.map((item) => (
                <li key={item.insight} className="ring-foreground/10 rounded-lg p-3 text-sm ring-1">
                  <p>{item.insight}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Source: {item.source}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
