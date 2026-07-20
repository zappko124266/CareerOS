import Link from "next/link";
import { IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/dashboard/score-ring";
import type { LinkedInAnalysis } from "@/generated/prisma/client";

/**
 * Sprint 10, Module 1/7 — replaces the old session-only, dialog-only
 * LinkedIn check (paste-and-forget, nothing saved) with a server-fed card
 * reading the latest persisted `LinkedInAnalysis`, same pattern as
 * `ResumeScoreCard`. The full paste/save/analyze/version flow lives at
 * `/linkedin` now — this card is a summary + entry point, not its own
 * separate analysis surface.
 */
export function LinkedInScoreCard({
  hasProfile,
  latestAnalysis,
}: {
  hasProfile: boolean;
  latestAnalysis: LinkedInAnalysis | null;
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="text-muted-foreground size-4" />
          LinkedIn Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!hasProfile ? (
          <EmptyState
            icon={IdCard}
            title="No profile saved yet"
            description="Paste your LinkedIn profile text to get an SEO score, recruiter visibility score, and section-by-section suggestions."
            action={
              <Button asChild size="sm">
                <Link href="/linkedin">Add LinkedIn profile</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : !latestAnalysis ? (
          <EmptyState
            icon={IdCard}
            title="Not analyzed yet"
            description="Run a LinkedIn SEO analysis to see your score."
            action={
              <Button asChild size="sm">
                <Link href="/linkedin">Run analysis</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
              {latestAnalysis.seoScore !== null && (
                <ScoreRing score={latestAnalysis.seoScore} label="LinkedIn SEO Score" size="sm" />
              )}
              {latestAnalysis.recruiterVisibilityScore !== null && (
                <ScoreRing
                  score={latestAnalysis.recruiterVisibilityScore}
                  label="Recruiter Visibility Score"
                  size="sm"
                />
              )}
              {latestAnalysis.seoScore === null && latestAnalysis.recruiterVisibilityScore === null && (
                <p className="text-muted-foreground text-sm">
                  Your last analysis didn&apos;t complete — try re-running it.
                </p>
              )}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-auto">
              <Link href="/linkedin">View full breakdown</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
