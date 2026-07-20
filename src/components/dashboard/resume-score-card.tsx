import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/dashboard/score-ring";
import type { ResumeAnalysis } from "@/generated/prisma/client";

export function ResumeScoreCard({
  resumeId,
  latestAnalysis,
  historyCount,
}: {
  resumeId: string | null;
  latestAnalysis: ResumeAnalysis | null;
  historyCount: number;
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" />
          Resume Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!resumeId ? (
          <EmptyState
            icon={FileText}
            title="No resume yet"
            description="Upload a resume to get an ATS score and a full breakdown."
            action={
              <Button asChild size="sm">
                <Link href="/resume">Upload resume</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : !latestAnalysis ? (
          <EmptyState
            icon={FileText}
            title="Not analyzed yet"
            description="Run an ATS analysis on your latest resume to see a score."
            action={
              <Button asChild size="sm">
                <Link href={`/resume/${resumeId}`}>Run analysis</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={latestAnalysis.overallScore} label="Resume Score" />
              <p className="text-muted-foreground text-sm">
                {historyCount > 1
                  ? `Improved across ${historyCount} analyses.`
                  : "Your latest ATS analysis."}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="mt-auto">
              <Link href={`/resume/${resumeId}`}>View full breakdown</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
