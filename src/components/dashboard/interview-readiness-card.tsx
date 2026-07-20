import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/dashboard/score-ring";

export interface LatestInterviewPrepSummary {
  confidenceScore: number;
  opportunityId: string;
  roleTitle: string;
  companyName: string;
}

/** Replaces the old "Interview Pipeline — isn't built yet" roadmap
 * placeholder — the Interview Workspace (stage tracking + AI Coach) is
 * real as of this sprint. Shows the most recent `InterviewPrep`
 * confidence score across every active interview, a real persisted
 * signal, not an estimate. */
export function InterviewReadinessCard({ latest }: { latest: LatestInterviewPrepSummary | null }) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="text-muted-foreground size-4" />
          Interview Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!latest ? (
          <EmptyState
            icon={MessagesSquare}
            title="No interview prep yet"
            description="Start an interview pipeline on an active application to get AI Coach prep."
            action={
              <Button asChild size="sm">
                <Link href="/opportunities">View opportunities</Link>
              </Button>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={latest.confidenceScore} label="Interview Readiness" />
              <p className="text-muted-foreground text-sm">
                {latest.roleTitle} at {latest.companyName}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="mt-auto">
              <Link href={`/opportunities/${latest.opportunityId}`}>Open interview workspace</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
