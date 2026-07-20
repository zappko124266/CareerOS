import { Progress } from "@/components/ui/progress";
import type { AtsScoreBreakdown } from "@/features/resume/schema";
import type { ActionVerbUsage, ReadabilityResult } from "@/features/resume/seo";

export const DIMENSION_LABEL: Record<keyof AtsScoreBreakdown, string> = {
  keywordRelevance: "Keyword relevance",
  formatting: "ATS-friendly formatting",
  sectionCompleteness: "Section completeness",
  impactLanguage: "Impact language",
  quantifiedAchievements: "Quantified achievements",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export function AtsScorePanel({
  overallScore,
  breakdown,
  actionVerbUsage,
  readability,
}: {
  overallScore: number;
  breakdown: AtsScoreBreakdown;
  /** Sprint 10, Module 2 — code-computed, not part of the AI's
   * `overallScore` average (kept separate rather than blended in, same
   * "never let a deterministic factor masquerade as an AI judgment, or
   * vice versa" discipline used elsewhere in this codebase). */
  actionVerbUsage: ActionVerbUsage;
  readability: ReadabilityResult;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-semibold ${scoreColor(overallScore)}`}>
          {overallScore}
        </span>
        <span className="text-muted-foreground text-sm">
          / 100 overall ATS score
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {(Object.keys(DIMENSION_LABEL) as (keyof AtsScoreBreakdown)[]).map(
          (key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{DIMENSION_LABEL[key]}</span>
                <span className="text-muted-foreground">{breakdown[key]}</span>
              </div>
              <Progress
                value={breakdown[key]}
                aria-label={DIMENSION_LABEL[key]}
                aria-valuetext={`${breakdown[key]} out of 100`}
              />
            </div>
          ),
        )}
      </div>

      <div className="flex flex-col gap-4 border-t pt-4">
        <p className="text-muted-foreground text-xs">
          The 2 factors below are computed directly from your resume&apos;s bullet text (not AI
          judgment) — always available instantly, even before you re-run the AI analysis above.
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>Action verb usage</span>
            <span className="text-muted-foreground">{actionVerbUsage.score}</span>
          </div>
          <Progress
            value={actionVerbUsage.score}
            aria-label="Action verb usage"
            aria-valuetext={`${actionVerbUsage.score} out of 100`}
          />
          <p className="text-muted-foreground text-xs">
            {actionVerbUsage.weakBullets.length > 0
              ? `${actionVerbUsage.weakBullets.length} of ${actionVerbUsage.totalBullets} bullets open with a duty phrase ("responsible for," "worked on," etc.) instead of a strong action verb.`
              : actionVerbUsage.totalBullets > 0
                ? "Every bullet opens with a strong action verb."
                : "No experience/project bullets to check yet."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>Readability</span>
            <span className="text-muted-foreground">{readability.score}</span>
          </div>
          <Progress
            value={readability.score}
            aria-label="Readability"
            aria-valuetext={`${readability.score} out of 100`}
          />
          <p className="text-muted-foreground text-xs">
            {readability.averageWordsPerBullet > 0
              ? `Average ${readability.averageWordsPerBullet} words per bullet — recruiters skim best in the 10-22 word range.`
              : "No experience/project bullets to check yet."}
          </p>
        </div>
      </div>
    </div>
  );
}
