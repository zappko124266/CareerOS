import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AtsScorePanel } from "@/components/resume/ats-score-panel";
import { DeleteResumeButton } from "@/components/resume/delete-resume-button";
import { OptimizationSuggestionsList } from "@/components/resume/optimization-suggestions-list";
import { RescoreForm } from "@/components/resume/rescore-form";
import { ResumeContentPreview } from "@/components/resume/resume-content-preview";
import { ResumeStatusBadge } from "@/components/resume/resume-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getResumeWithAnalyses } from "@/features/resume/queries";
import {
  AtsScoreBreakdownSchema,
  OptimizationSuggestionSchema,
  ResumeDataSchema,
} from "@/features/resume/schema";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { resumeId } = await params;
  const user = await verifySession();
  const resume = await getResumeWithAnalyses(resumeId, user.id).catch(
    () => null,
  );

  if (!resume) {
    notFound();
  }

  const latestAnalysis = resume.analyses[0];
  const parsedContent = resume.parsedData
    ? ResumeDataSchema.safeParse(resume.parsedData)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {resume.title}
            </h1>
            <ResumeStatusBadge status={resume.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {resume.originalFilename}
          </p>
        </div>
        <DeleteResumeButton resumeId={resume.id} />
      </div>

      {resume.status === "FAILED" && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              We couldn&apos;t parse this resume
              {resume.failureReason ? `: ${resume.failureReason}` : "."}
            </p>
          </CardContent>
        </Card>
      )}

      {resume.status === "PARSING" && (
        <p className="text-muted-foreground text-sm">Parsing your resume…</p>
      )}

      {resume.status === "PARSED" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>ATS analysis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {latestAnalysis ? (
                <AtsScorePanel
                  overallScore={latestAnalysis.overallScore}
                  breakdown={AtsScoreBreakdownSchema.parse(
                    latestAnalysis.breakdown,
                  )}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No analysis yet — run one below.
                </p>
              )}
              <RescoreForm resumeId={resume.id} />
            </CardContent>
          </Card>

          {latestAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <OptimizationSuggestionsList
                  suggestions={z
                    .array(OptimizationSuggestionSchema)
                    .parse(latestAnalysis.suggestions)}
                />
              </CardContent>
            </Card>
          )}

          {parsedContent?.success && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed content</CardTitle>
              </CardHeader>
              <CardContent>
                <ResumeContentPreview data={parsedContent.data} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
