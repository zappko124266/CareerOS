import { TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Opportunity-backed missing skills — Sprint 11, requirement 7. Renders
 * `CareerBrain.skillIntelligence.missingSkills` (Sprint 4) directly: a
 * frequency-ranked count of how often each skill shows up as missing
 * across *every* saved opportunity's Opportunity Intelligence match
 * (Sprint 2), not a single pasted job description. Zero new computation
 * — this is the cross-opportunity signal Career Brain already computes,
 * just never surfaced in the resume feature until now. Complements
 * (doesn't replace) `ResumeKeywordPanel`'s one-job-at-a-time comparison.
 */
export function ResumeMissingSkillsPanel({
  missingSkills,
  savedOpportunityCount,
}: {
  missingSkills: { skill: string; frequency: number }[];
  savedOpportunityCount: number;
}) {
  if (missingSkills.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Missing skills across your saved jobs</h2>
          <p className="text-muted-foreground text-sm">
            {savedOpportunityCount === 0
              ? "Save some opportunities from Jobs to see which skills come up as missing across them."
              : "No recurring missing skills — your resume already covers what your saved opportunities ask for."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="text-muted-foreground size-4" />
            Missing skills across your saved jobs
          </h2>
          <p className="text-muted-foreground text-sm">
            Ranked by how often each one shows up across your {savedOpportunityCount} saved
            opportunit{savedOpportunityCount === 1 ? "y" : "ies"} — not just one job description.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {missingSkills.slice(0, 12).map(({ skill, frequency }) => (
            <Badge key={skill} variant="outline" className="gap-1.5">
              {skill}
              <span className="text-muted-foreground">
                {frequency} job{frequency === 1 ? "" : "s"}
              </span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
