import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { CategorizedRequirementList } from "@/components/opportunities/categorized-requirement-list";
import type { OpportunityIntelligence } from "@/features/opportunities/intelligence";
import { RECOMMENDATION_TIER_LABEL } from "@/features/opportunities/types";
import type { JobMatchAnalysisOutput } from "@/features/career-intelligence/jobs/job-match-analysis/types";

/**
 * Sprint 2 — the single "here's what you need to know" summary at the
 * top of the Application Workspace, visible regardless of which tab is
 * active. Reuses the Opportunity Intelligence Engine's deterministic
 * tier/reasoning/missing-skills (no new scoring logic here — just
 * layout), and, once the user has run the existing on-demand AI match
 * analysis (`MatchPanel`'s "Run AI match analysis" button, unchanged),
 * layers its `recommendation`/`summary` in as an "AI take" — the
 * "AI Recommendation Summary (optional layer)" requirement satisfied
 * entirely by reuse, with no new AI plumbing.
 */
export function OpportunityIntelligenceSummary({
  intelligence,
  aiResult,
}: {
  intelligence: OpportunityIntelligence;
  aiResult: JobMatchAnalysisOutput | null;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {intelligence.match.score !== null && (
            <ScoreRing score={intelligence.match.score} label="Match score" />
          )}
          <div>
            {intelligence.tier && <Badge>{intelligence.tierLabel}</Badge>}
            <p className="text-muted-foreground mt-1.5 text-sm">{intelligence.reasoning}</p>
          </div>
        </div>

        {intelligence.match.missingSkills.length > 0 && (
          <CategorizedRequirementList requirements={intelligence.match.missingSkills} />
        )}

        {aiResult && (
          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="text-sm font-medium">
              AI take: <Badge variant="secondary">{RECOMMENDATION_TIER_LABEL[aiResult.recommendation]}</Badge>
            </p>
            <p className="text-muted-foreground text-sm">{aiResult.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
