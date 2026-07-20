import { Progress } from "@/components/ui/progress";
import type { RankingFactor } from "@/features/discovery/types";

/**
 * Generic explainable-factor breakdown — reused for both job cards and
 * company cards (their factor sets differ, but the "score + explanation,
 * never a bare number" rendering rule is identical, same discipline as
 * Application Studio's `ReadinessBreakdown`). `labels` maps each factor
 * key to its display name. Callers pass their specific `JobMatchFactors`/
 * `CompanyMatchFactors` object — cast to `Record<string, RankingFactor>`
 * at this boundary, same convention used elsewhere in this codebase for
 * plain interfaces (which have no index signature) crossing into
 * Record-typed code.
 */
export function MatchFactorsList({
  overallScore,
  factors,
  labels,
  scoreLabel = "Match score (AI estimate)",
}: {
  overallScore: number;
  factors: Record<string, RankingFactor>;
  labels: Record<string, string>;
  scoreLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{scoreLabel}</span>
          <span className="text-muted-foreground">{overallScore}/100</span>
        </div>
        <Progress
          value={overallScore}
          aria-label="Overall match score"
          aria-valuetext={`${overallScore} out of 100`}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {Object.keys(factors).map((key) => {
          const factor = factors[key];
          return (
            <li key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{labels[key]}</span>
                <span className="text-muted-foreground">
                  {factor.available ? `${factor.score}/100` : "Not available"}
                </span>
              </div>
              {factor.available && (
                <Progress value={factor.score} aria-label={labels[key]} aria-valuetext={`${factor.score} out of 100`} />
              )}
              <p className="text-muted-foreground text-xs">{factor.explanation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
