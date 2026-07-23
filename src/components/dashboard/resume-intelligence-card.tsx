import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { CategorizedRequirementList } from "@/components/opportunities/categorized-requirement-list";
import type { ResumeIntelligence } from "@/features/career-brain/types";

/**
 * Resume Intelligence summary — Sprint 10, requirement 6. Renders
 * `CareerBrain.resumeIntelligence` (Sprint 4) directly: it was already
 * fully computed (ATS-dimension strengths/weaknesses, missing skills
 * aggregated from saved-opportunity matches, certifications/education
 * from the parsed resume) but never surfaced anywhere in the UI until
 * now — no new computation.
 */
export function ResumeIntelligenceCard({ resumeIntelligence }: { resumeIntelligence: ResumeIntelligence }) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" />
          Resume Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        {!resumeIntelligence.hasResume ? (
          <EmptyState
            icon={FileText}
            title="No resume yet"
            description="Upload a resume to unlock strengths, weaknesses, and missing-skill insights."
            action={
              <Button asChild size="sm">
                <Link href="/resume">Upload resume</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <>
            <div className="flex items-center gap-4">
              {resumeIntelligence.overallScore !== null && (
                <ScoreRing score={resumeIntelligence.overallScore} label="Resume score" size="sm" />
              )}
              <div className="min-w-0 flex-1">
                {resumeIntelligence.strengths.slice(0, 2).map((strength) => (
                  <p key={strength} className="wrap-break-word text-sm">
                    <span className="text-muted-foreground">Strength:</span> {strength}
                  </p>
                ))}
                {resumeIntelligence.weaknesses.slice(0, 2).map((weakness) => (
                  <p key={weakness} className="wrap-break-word text-sm">
                    <span className="text-muted-foreground">Improve:</span> {weakness}
                  </p>
                ))}
              </div>
            </div>

            {resumeIntelligence.missingSkills.length > 0 && (
              <CategorizedRequirementList requirements={resumeIntelligence.missingSkills} />
            )}

            <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
              <Link href="/resume">View full resume</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
