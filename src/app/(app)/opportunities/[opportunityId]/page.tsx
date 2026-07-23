import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationWorkspace } from "@/components/opportunities/application-workspace";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { buildOpportunityIntelligence, type OpportunityIntelligenceContext } from "@/features/opportunities/intelligence";
import { computeOpportunityScoreV2 } from "@/features/opportunities/score";
import { getResumeMatchProfile } from "@/features/opportunities/service";
import { getOpportunityWithNotes } from "@/features/opportunities/queries";
import { OpportunitySkillsSchema } from "@/features/opportunities/schema";
import { listResumesForUser, listResumeVersionsForOpportunity } from "@/features/resume/queries";
import { ResumeDataSchema } from "@/features/resume/schema";
import {
  getCompanySnapshot,
  getLatestApplicationReview,
  getLatestApplicationStrategy,
  getLatestExperienceGapAssessment,
  getLatestFollowUpRecommendation,
  listApplicationDocuments,
  listApplicationReviews,
  listApplicationSubmissions,
} from "@/features/applications/queries";
import {
  toExperienceGapAssessmentOutput,
  toReviewOutput,
  toStrategyOutput,
} from "@/features/applications/format";
import { ensureOpportunityCompanyId } from "@/features/companies/service";
import { getCareerGoal } from "@/features/career/queries";
import { listInterviewsForOpportunity, getOfferForOpportunity } from "@/features/interviews/queries";
import { buildInterviewBrief } from "@/features/interviews/intelligence/brief";
import { estimateOfferProbability } from "@/features/interviews/intelligence/offer-probability";
import { buildInterviewPrepTasks } from "@/features/interviews/intelligence/planner-tasks";
import { buildInterviewStageProgress } from "@/features/interviews/intelligence/stage-tracker";
import type { InterviewOperatingSystemBundle } from "@/components/opportunities/interview-workspace-panel";
import { listRecruitersForUser } from "@/features/recruiters/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Application Workspace" };

export default async function OpportunityWorkspacePage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const user = await verifySession();

  const opportunity = await getOpportunityWithNotes(opportunityId, user.id).catch(
    () => null,
  );

  if (!opportunity) {
    notFound();
  }

  const companyId = await ensureOpportunityCompanyId(
    opportunity.id,
    opportunity.companyName,
    opportunity.companyId,
  );

  const [
    resumeProfile,
    resumes,
    applicationDocuments,
    companySnapshot,
    latestReview,
    reviews,
    latestStrategy,
    latestFollowUp,
    submissions,
    interviews,
    recruiters,
    offer,
    latestGapAssessment,
    opportunityScore,
    discoveryPreference,
    careerGoal,
    resumeVersions,
  ] = await Promise.all([
    getResumeMatchProfile(user.id),
    listResumesForUser(user.id),
    listApplicationDocuments(opportunityId, user.id),
    getCompanySnapshot(opportunityId, user.id),
    getLatestApplicationReview(opportunityId, user.id),
    listApplicationReviews(opportunityId, user.id),
    getLatestApplicationStrategy(opportunityId, user.id),
    getLatestFollowUpRecommendation(opportunityId, user.id),
    listApplicationSubmissions(opportunityId, user.id),
    listInterviewsForOpportunity(opportunityId, user.id),
    listRecruitersForUser(user.id),
    getOfferForOpportunity(opportunityId),
    getLatestExperienceGapAssessment(opportunityId, user.id),
    computeOpportunityScoreV2(opportunityId, user.id),
    getDiscoveryPreference(user.id),
    getCareerGoal(user.id),
    listResumeVersionsForOpportunity(opportunityId, user.id),
  ]);

  const skills = OpportunitySkillsSchema.safeParse(opportunity.skills);
  const intelligenceContext: OpportunityIntelligenceContext = {
    dreamCompanyNames: new Set(
      ((discoveryPreference?.preferredCompanies as string[]) ?? []).map((name) => name.toLowerCase()),
    ),
    urgency: (discoveryPreference?.availability as OpportunityIntelligenceContext["urgency"]) ?? null,
  };
  const intelligence = buildOpportunityIntelligence(
    {
      title: opportunity.title,
      location: opportunity.location,
      remote: opportunity.remote,
      skills: skills.success ? skills.data : [],
      companyName: opportunity.companyName,
    },
    resumeProfile,
    intelligenceContext,
  );

  const resumeList = resumes.map((resume) => ({ id: resume.id, title: resume.title }));
  const selectedResume = resumeList.find((resume) => resume.id === opportunity.resumeId) ?? null;

  const packageResumeId = opportunity.resumeId ?? latestStrategy?.bestResumeId ?? null;
  const packageResume = resumes.find((resume) => resume.id === packageResumeId) ?? null;
  const packageResumeData = packageResume
    ? ResumeDataSchema.safeParse(packageResume.parsedData)
    : null;

  const gapAssessmentOutput = latestGapAssessment ? toExperienceGapAssessmentOutput(latestGapAssessment) : null;

  // Sprint 20 (Interview Intelligence & Interview Operating System) —
  // every piece below is a pure derivation over data this page already
  // fetched above (Hard Lock: never duplicate a query for a new feature).
  // Computed here (a server component) rather than inside the client
  // `InterviewWorkspacePanel`, since the underlying modules are pure but
  // still import server-only siblings (`interviews/types.ts`) — same
  // "compute server-side, pass plain data down" pattern `intelligence`/
  // `opportunityScore` above already use.
  const currentInterview = interviews[0] ?? null;
  const interviewOS: InterviewOperatingSystemBundle | null = currentInterview
    ? {
        stageProgress: buildInterviewStageProgress(
          currentInterview,
          currentInterview.preps[0]?.confidenceScore ?? null,
        ),
        prepTasks: buildInterviewPrepTasks(
          {
            hasCompanySnapshot: companySnapshot !== null,
            likelyQuestions:
              (currentInterview.preps[0]?.likelyQuestions as unknown as { question: string; category: string }[]) ??
              [],
            weakAnswerFlags:
              (currentInterview.preps[0]?.weakAnswerFlags as unknown as { question: string }[]) ?? [],
            hasTailoredResume: resumeVersions.length > 0 || opportunity.resumeId !== null,
            noteCount: currentInterview.notes.filter((note) => note.documentType === null).length,
            hasOffer: offer !== null,
          },
          opportunity.id,
        ),
        brief: buildInterviewBrief({
          companyName: opportunity.companyName,
          companySnapshot,
          opportunityTitle: opportunity.title,
          opportunityDescription: opportunity.description,
          location: opportunity.location,
          remote: opportunity.remote,
          resumeVersion: packageResume ? { id: packageResume.id, title: packageResume.title } : null,
          gapAssessment: gapAssessmentOutput,
          likelyQuestions:
            (currentInterview.preps[0]?.likelyQuestions as unknown as { question: string; category: string }[]) ??
            [],
          starAnswerSuggestions:
            (currentInterview.preps[0]?.starAnswerSuggestions as unknown as string[]) ?? [],
          salaryMin: opportunity.salaryMin,
          salaryMax: opportunity.salaryMax,
          salaryCurrency: opportunity.salaryCurrency,
          recruiter: currentInterview.recruiter,
          documentNotes: currentInterview.notes.map((note) => ({
            documentType: note.documentType,
            documentUrl: note.documentUrl,
            note: note.note,
          })),
        }),
        offerProbability: estimateOfferProbability({
          stage: currentInterview.stage,
          matchScore: opportunityScore.overallScore,
          hasCompanyIntelligence: companySnapshot !== null,
          feedbackAnalysis: currentInterview.feedbackAnalysis as unknown as {
            strengths: string[];
            weaknesses: string[];
          } | null,
          daysWaiting: buildInterviewStageProgress(currentInterview, null).daysWaiting,
          historicalOfferRate: null,
        }),
      }
    : null;

  return (
    <ApplicationWorkspace
      opportunity={opportunity}
      intelligence={intelligence}
      opportunityScore={opportunityScore}
      resumes={resumeList}
      selectedResume={selectedResume}
      applicationDocuments={applicationDocuments}
      companySnapshot={companySnapshot}
      latestReview={latestReview ? toReviewOutput(latestReview) : null}
      reviews={reviews.map(toReviewOutput)}
      latestStrategy={latestStrategy ? toStrategyOutput(latestStrategy) : null}
      latestFollowUp={latestFollowUp}
      submissions={submissions}
      packageResumeTitle={packageResume?.title ?? null}
      packageResumeData={packageResumeData?.success ? packageResumeData.data : null}
      interviews={interviews}
      recruiters={recruiters}
      offer={offer}
      companyId={companyId}
      latestGapAssessment={gapAssessmentOutput}
      interviewOS={interviewOS}
      resumeVersions={resumeVersions}
      latestResumeId={resumes[0]?.id ?? null}
      name={user.fullName ?? ""}
      targetRole={careerGoal?.targetRole ?? null}
    />
  );
}
