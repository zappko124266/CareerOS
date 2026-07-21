import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wand2 } from "lucide-react";
import { z } from "zod";

import { AtsScorePanel } from "@/components/resume/ats-score-panel";
import { DeleteResumeButton } from "@/components/resume/delete-resume-button";
import { OptimizationSuggestionsList } from "@/components/resume/optimization-suggestions-list";
import { RescoreForm } from "@/components/resume/rescore-form";
import { ResumeContentPreview } from "@/components/resume/resume-content-preview";
import { ResumeStatusBadge } from "@/components/resume/resume-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCareerGoal } from "@/features/career/queries";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { buildLocationSummary } from "@/features/discovery/types";
import { getResumeWithAnalyses } from "@/features/resume/queries";
import {
  AtsScoreBreakdownSchema,
  OptimizationSuggestionSchema,
  ResumeDataSchema,
} from "@/features/resume/schema";
import { computeActionVerbUsage, computeReadability } from "@/features/resume/seo";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { resumeId } = await params;
  const user = await verifySession();
  const [resume, careerGoal, discoveryPreference] = await Promise.all([
    getResumeWithAnalyses(resumeId, user.id).catch(() => null),
    getCareerGoal(user.id),
    getDiscoveryPreference(user.id),
  ]);

  if (!resume) {
    notFound();
  }

  // Sprint 1.5 (Personalization) — reuses the same onboarding data the
  // Coach/Dashboard read, just to frame the *existing* ATS analysis
  // copy; the scoring itself is unchanged.
  const targetRole = careerGoal?.targetRole ?? null;
  const locationSummary = discoveryPreference
    ? buildLocationSummary({
        countries: discoveryPreference.countries as string[],
        states: discoveryPreference.states as string[],
        cities: discoveryPreference.cities as string[],
        remote: discoveryPreference.remote,
        hybrid: discoveryPreference.hybrid,
        onsite: discoveryPreference.onsite,
        openToRelocation: discoveryPreference.openToRelocation,
      })
    : null;
  const analysisContext = [targetRole, locationSummary].filter(Boolean).join(" — ");

  const latestAnalysis = resume.analyses[0];
  const parsedContent = resume.parsedData
    ? ResumeDataSchema.safeParse(resume.parsedData)
    : null;
  const actionVerbUsage = parsedContent?.success
    ? computeActionVerbUsage(parsedContent.data)
    : { score: 0, totalBullets: 0, weakBullets: [] };
  const readability = parsedContent?.success
    ? computeReadability(parsedContent.data)
    : { score: 0, averageWordsPerBullet: 0 };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight wrap-break-word">
              {resume.title}
            </h1>
            <ResumeStatusBadge status={resume.status} />
          </div>
          <p className="text-muted-foreground text-sm wrap-break-word">
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
          <Card className="bg-foreground text-background">
            <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">Resume Studio</p>
                <p className="text-background/70 text-sm">
                  Edit, tailor to a job, compare versions, and export as PDF or DOCX.
                </p>
              </div>
              <Button
                asChild
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90 w-full sm:w-auto"
              >
                <Link href={`/resume/${resume.id}/studio`}>
                  <Wand2 />
                  Open Resume Studio
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ATS analysis</CardTitle>
              {analysisContext && (
                <p className="text-muted-foreground text-sm">
                  Reviewed with {analysisContext} in mind.
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {latestAnalysis ? (
                <AtsScorePanel
                  overallScore={latestAnalysis.overallScore}
                  breakdown={AtsScoreBreakdownSchema.parse(
                    latestAnalysis.breakdown,
                  )}
                  actionVerbUsage={actionVerbUsage}
                  readability={readability}
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
