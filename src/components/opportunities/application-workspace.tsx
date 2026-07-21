"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";

import {
  getOpportunityMatchAnalysisAction,
  updateOpportunityChecklistAction,
  updateOpportunityNotesAction,
  updateOpportunityStatusAction,
} from "@/actions/opportunities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { OpportunityIntelligence } from "@/features/opportunities/intelligence";
import type { OpportunityScoreV2Factors } from "@/features/discovery/types";
import { STATUS_LABEL, STATUS_OFF_PATH, STATUS_ORDER } from "@/features/opportunities/types";
import type {
  Checklist,
  OpportunityStatus,
  StatusHistory,
} from "@/features/opportunities/types";
import type {
  ApplicationDocument,
  ApplicationSubmission,
  CompanySnapshot,
  FollowUpRecommendation,
  Offer,
  Opportunity,
  InterviewNote,
  Recruiter,
} from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";
import type {
  ApplicationStrategyOutput,
  ExperienceGapAssessmentOutput,
} from "@/features/applications/format";
import type { ResumeData } from "@/features/resume/schema";
import type { CustomQuestions } from "@/features/opportunities/types";

import { updateOpportunityCustomQuestionsAction } from "@/actions/opportunities";
import { ApplicationAutomationPanel } from "./application-automation-panel";
import { ApplicationPackagePanel } from "./application-package-panel";
import { ApplicationStudio } from "./application-studio/application-studio";
import { CareerGapPanel } from "./career-gap-panel";
import { MatchPanel } from "./match-panel";
import { OpportunityIntelligenceSummary } from "./opportunity-intelligence-summary";
import { OpportunityScoreCard } from "./opportunity-score-card";
import { ChecklistEditor } from "./checklist-editor";
import { CustomQuestionsEditor } from "./custom-questions-editor";
import { DocumentsPanel } from "./documents-panel";
import { InterviewWorkspacePanel } from "./interview-workspace-panel";
import type { InterviewWithRelations } from "./interview-workspace-panel";
import { TimelinePanel } from "./timeline-panel";

type ReviewRow = ApplicationReviewOutput & { id: string; createdAt: Date };

type OpportunityWithNotes = Opportunity & { interviewNotes: InterviewNote[] };

function formatSalary(opportunity: Opportunity) {
  if (!opportunity.salaryMin && !opportunity.salaryMax) return null;
  const currency = opportunity.salaryCurrency ?? "";
  if (opportunity.salaryMin && opportunity.salaryMax) {
    return `${currency}${opportunity.salaryMin.toLocaleString()}–${opportunity.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(opportunity.salaryMin ?? opportunity.salaryMax)!.toLocaleString()}+`;
}

export function ApplicationWorkspace({
  opportunity: initialOpportunity,
  intelligence,
  opportunityScore,
  resumes,
  selectedResume,
  applicationDocuments,
  companySnapshot,
  latestReview,
  reviews,
  latestStrategy,
  latestFollowUp,
  submissions,
  packageResumeTitle,
  packageResumeData,
  interviews,
  recruiters,
  offer,
  companyId,
  latestGapAssessment,
}: {
  opportunity: OpportunityWithNotes;
  intelligence: OpportunityIntelligence;
  opportunityScore: { factors: OpportunityScoreV2Factors; overallScore: number };
  resumes: { id: string; title: string }[];
  selectedResume: { id: string; title: string } | null;
  applicationDocuments: ApplicationDocument[];
  companySnapshot: CompanySnapshot | null;
  latestReview: ReviewRow | null;
  reviews: ReviewRow[];
  latestStrategy: ApplicationStrategyOutput | null;
  latestFollowUp: FollowUpRecommendation | null;
  submissions: ApplicationSubmission[];
  packageResumeTitle: string | null;
  packageResumeData: ResumeData | null;
  interviews: InterviewWithRelations[];
  recruiters: Recruiter[];
  offer: Offer | null;
  companyId: string | null;
  latestGapAssessment: ExperienceGapAssessmentOutput | null;
}) {
  const [opportunity, setOpportunity] = useState(initialOpportunity);
  const statusAction = useAsyncAction(updateOpportunityStatusAction);
  const aiMatch = useAsyncAction(getOpportunityMatchAnalysisAction);

  const skills = Array.isArray(opportunity.skills)
    ? (opportunity.skills as unknown[]).filter(
        (skill): skill is string => typeof skill === "string",
      )
    : [];
  const salary = formatSalary(opportunity);
  const statusHistory = (opportunity.statusHistory as unknown as StatusHistory) ?? [];

  // These mutations return a plain `Opportunity` (no `interviewNotes`
  // relation) — merge into the existing state rather than replacing it
  // wholesale, so the notes list already on screen isn't dropped.
  async function handleStatusChange(status: OpportunityStatus) {
    const updated = await statusAction.run({
      opportunityId: opportunity.id,
      status,
    });
    if (updated) setOpportunity((prev) => ({ ...prev, ...updated }));
  }

  async function handleChecklistChange(checklist: Checklist) {
    const result = await updateOpportunityChecklistAction({
      opportunityId: opportunity.id,
      checklist,
    });
    if (result.status === "success") {
      setOpportunity((prev) => ({ ...prev, ...result.data }));
    }
  }

  async function handleCustomQuestionsChange(customQuestions: CustomQuestions) {
    const result = await updateOpportunityCustomQuestionsAction({
      opportunityId: opportunity.id,
      customQuestions,
    });
    if (result.status === "success") {
      setOpportunity((prev) => ({ ...prev, ...result.data }));
    }
  }

  async function handleNotesChange(input: {
    coverLetter?: string;
    recruiterNotes?: string;
    resumeId?: string | null;
  }) {
    const result = await updateOpportunityNotesAction({
      opportunityId: opportunity.id,
      ...input,
    });
    if (result.status === "success") {
      setOpportunity((prev) => ({ ...prev, ...result.data }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="wrap-break-word text-2xl font-semibold tracking-tight">
                {opportunity.title}
              </h1>
              <p className="text-muted-foreground wrap-break-word">
                {opportunity.companyName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {opportunity.location && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" />
                    {opportunity.location}
                  </span>
                )}
                {opportunity.remote && <Badge variant="secondary">Remote</Badge>}
                {opportunity.employmentType && (
                  <Badge variant="outline">{opportunity.employmentType}</Badge>
                )}
                {salary && <span className="font-medium">{salary}</span>}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Select
                value={opportunity.status}
                onValueChange={(value) =>
                  handleStatusChange(value as OpportunityStatus)
                }
              >
                <SelectTrigger
                  className="w-full sm:w-56"
                  aria-label="Application status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  {STATUS_OFF_PATH.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Self-reported — CareerOS can&apos;t verify employer-side status.
              </p>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-56">
                <a
                  href={opportunity.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original posting
                  <ExternalLink />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <OpportunityIntelligenceSummary intelligence={intelligence} aiResult={aiMatch.result} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="match">Match</TabsTrigger>
          <TabsTrigger value="application-studio">Application Studio</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-sm font-semibold">Overview</h2>
                  <p className="text-muted-foreground mt-2 wrap-break-word whitespace-pre-line text-sm">
                    {opportunity.description || "No description provided."}
                  </p>
                </div>
                {companyId && (
                  <Button asChild size="sm" variant="outline" className="w-fit shrink-0">
                    <Link href={`/opportunities/companies/${companyId}`}>Company intelligence</Link>
                  </Button>
                )}
              </div>
              {skills.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold">Skills</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <OpportunityScoreCard
            factors={opportunityScore.factors}
            overallScore={opportunityScore.overallScore}
          />
          <CareerGapPanel opportunityId={opportunity.id} latestAssessment={latestGapAssessment} />
        </TabsContent>

        <TabsContent value="match">
          <MatchPanel
            deterministic={intelligence.match}
            aiResult={aiMatch.result}
            aiError={aiMatch.error}
            aiPending={aiMatch.isPending}
            aiSlow={aiMatch.isSlow}
            onRunAi={() => aiMatch.run(opportunity.description)}
          />
        </TabsContent>

        <TabsContent value="application-studio">
          <ApplicationStudio
            opportunity={opportunity}
            resume={selectedResume}
            initialDocuments={applicationDocuments}
            companySnapshot={companySnapshot}
            latestReview={latestReview}
            reviews={reviews}
          />
        </TabsContent>

        <TabsContent value="documents" className="flex flex-col gap-4">
          <DocumentsPanel
            opportunity={opportunity}
            resumes={resumes}
            onChangeNotes={handleNotesChange}
          />
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold">Preparation checklist</h2>
              <ChecklistEditor
                checklist={(opportunity.checklist as unknown as Checklist) ?? []}
                onChange={handleChecklistChange}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold">Custom application questions</h2>
              <CustomQuestionsEditor
                customQuestions={(opportunity.customQuestions as unknown as CustomQuestions) ?? []}
                onChange={handleCustomQuestionsChange}
              />
            </CardContent>
          </Card>
          <ApplicationPackagePanel
            selectedResumeTitle={packageResumeTitle}
            selectedResumeData={packageResumeData}
            applicationDocuments={applicationDocuments}
          />
        </TabsContent>

        <TabsContent value="automation">
          <ApplicationAutomationPanel
            opportunity={opportunity}
            applicationDocuments={applicationDocuments}
            latestStrategy={latestStrategy}
            latestFollowUp={latestFollowUp}
            submissions={submissions}
          />
        </TabsContent>

        <TabsContent value="interview">
          <InterviewWorkspacePanel
            opportunityId={opportunity.id}
            interviews={interviews}
            recruiters={recruiters}
            offer={offer}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelinePanel history={statusHistory} notes={opportunity.interviewNotes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
