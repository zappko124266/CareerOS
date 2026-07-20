"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { runApplicationReviewAction } from "@/actions/application-studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";

import { ReadinessBreakdown } from "./readiness-breakdown";

type ReviewResult = ApplicationReviewOutput & { id: string; createdAt: Date };

function FindingList({
  title,
  items,
}: {
  title: string;
  items: { point: string; why: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm">
            <p className="font-medium">{item.point}</p>
            <p className="text-muted-foreground text-xs">{item.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** AI Application Review — analyzes resume, cover letter, email, and job
 * description together and returns a transparent readiness breakdown plus
 * qualitative findings, each with a "why". Triggered on demand (not
 * automatically), and entitlement-gated in the Server Action before the
 * AI Router is ever called. */
export function ApplicationReviewPanel({
  opportunityId,
  initialReview,
}: {
  opportunityId: string;
  initialReview: ReviewResult | null;
}) {
  const [review, setReview] = useState(initialReview);
  const { run, isPending, isSlow, error } = useAsyncAction(runApplicationReviewAction);

  async function handleRun() {
    const result = await run(opportunityId);
    if (result) setReview(result);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">AI Application Review</h2>
            <p className="text-muted-foreground text-sm">
              Analyzes your resume, cover letter, email, and this job description together —
              from a recruiter&apos;s perspective and an ATS perspective. Every score is an AI
              estimate with an explanation, never a guaranteed outcome.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {isPending && isSlow && (
            <p className="text-muted-foreground text-sm">
              Still working — this can take up to a minute or two.
            </p>
          )}
          <Button onClick={handleRun} disabled={isPending} className="w-fit">
            <Sparkles />
            {isPending ? "Reviewing…" : review ? "Run review again" : "Run review"}
          </Button>
          {review && (
            <p className="text-muted-foreground text-xs">
              Last run {formatRelativeTime(new Date(review.createdAt))}
            </p>
          )}
        </CardContent>
      </Card>

      {!review ? (
        <EmptyState
          title="No review yet"
          description="Run a review above to see your application's readiness breakdown."
          className="py-12"
        />
      ) : (
        <>
          <Card>
            <CardContent>
              <ReadinessBreakdown
                overallReadiness={review.overallReadiness}
                factors={review.factors}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <FindingList title="Strengths" items={review.strengths} />
              <FindingList title="Weaknesses" items={review.weaknesses} />
              <FindingList title="Suggestions" items={review.suggestions} />

              {review.missingKeywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Missing keywords</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {review.missingKeywords.join(", ")}
                  </p>
                </div>
              )}

              {review.missingSkills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Missing skills</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {review.missingSkills.map((item, index) => (
                      <li key={index} className="text-sm">
                        <p className="font-medium">{item.skill}</p>
                        <p className="text-muted-foreground text-xs">{item.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold">Recruiter perspective</h3>
                <p className="text-muted-foreground mt-1 text-sm">{review.recruiterPerspective}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">ATS perspective</h3>
                <p className="text-muted-foreground mt-1 text-sm">{review.atsPerspective}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
