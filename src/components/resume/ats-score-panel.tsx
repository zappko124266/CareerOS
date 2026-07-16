import { Progress } from "@/components/ui/progress";
import type { AtsScoreBreakdown } from "@/features/resume/schema";

const DIMENSION_LABEL: Record<keyof AtsScoreBreakdown, string> = {
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
}: {
  overallScore: number;
  breakdown: AtsScoreBreakdown;
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
              <Progress value={breakdown[key]} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
