import { Progress } from "@/components/ui/progress";
import type { ReadinessFactors } from "@/features/career-intelligence/applications/review/types";

const FACTOR_LABEL: Record<keyof ReadinessFactors, string> = {
  resumeQuality: "Resume Quality",
  jobMatch: "Job Match",
  coverLetterQuality: "Cover Letter",
  emailQuality: "Email",
  keywordCoverage: "Keyword Coverage",
  requiredSkillsCoverage: "Required Skills",
  linkedinCompleteness: "LinkedIn Completeness",
};

const FACTOR_ORDER: (keyof ReadinessFactors)[] = [
  "resumeQuality",
  "jobMatch",
  "coverLetterQuality",
  "emailQuality",
  "keywordCoverage",
  "requiredSkillsCoverage",
  "linkedinCompleteness",
];

/** Shared, transparent readiness display — one overall number plus every
 * contributing factor with its own score and explanation, used in both the
 * Review tab and the Package tab summary. Never presented as a hiring
 * probability: every label and caption below treats these as AI estimates
 * from the materials provided, not a guarantee. */
export function ReadinessBreakdown({
  overallReadiness,
  factors,
}: {
  overallReadiness: number;
  factors: ReadinessFactors;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Overall Readiness (AI estimate)</span>
          <span className="text-muted-foreground">{overallReadiness}/100</span>
        </div>
        <Progress
          value={overallReadiness}
          aria-label="Overall application readiness"
          aria-valuetext={`${overallReadiness} out of 100`}
        />
        <p className="text-muted-foreground text-xs">
          The average of the available factors below — not a hiring probability.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {FACTOR_ORDER.map((key) => {
          const factor = factors[key];
          return (
            <li key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{FACTOR_LABEL[key]}</span>
                <span className="text-muted-foreground">
                  {factor.available ? `${factor.score}/100` : "Not available"}
                </span>
              </div>
              {factor.available && (
                <Progress
                  value={factor.score}
                  aria-label={FACTOR_LABEL[key]}
                  aria-valuetext={`${factor.score} out of 100`}
                />
              )}
              <p className="text-muted-foreground text-xs">{factor.explanation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
