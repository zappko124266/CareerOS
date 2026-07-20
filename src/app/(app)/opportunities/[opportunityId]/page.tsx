import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationWorkspace } from "@/components/opportunities/application-workspace";
import { computeMatch } from "@/features/opportunities/match";
import { getResumeMatchProfile } from "@/features/opportunities/service";
import { getOpportunityWithNotes } from "@/features/opportunities/queries";
import { OpportunitySkillsSchema } from "@/features/opportunities/schema";
import { listResumesForUser } from "@/features/resume/queries";
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
import { listInterviewsForOpportunity, getOfferForOpportunity } from "@/features/interviews/queries";
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
  ]);

  const skills = OpportunitySkillsSchema.safeParse(opportunity.skills);
  const match = computeMatch(
    {
      title: opportunity.title,
      location: opportunity.location,
      remote: opportunity.remote,
      skills: skills.success ? skills.data : [],
    },
    resumeProfile,
  );

  const resumeList = resumes.map((resume) => ({ id: resume.id, title: resume.title }));
  const selectedResume = resumeList.find((resume) => resume.id === opportunity.resumeId) ?? null;

  const packageResumeId = opportunity.resumeId ?? latestStrategy?.bestResumeId ?? null;
  const packageResume = resumes.find((resume) => resume.id === packageResumeId) ?? null;
  const packageResumeData = packageResume
    ? ResumeDataSchema.safeParse(packageResume.parsedData)
    : null;

  return (
    <ApplicationWorkspace
      opportunity={opportunity}
      match={match}
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
      latestGapAssessment={
        latestGapAssessment ? toExperienceGapAssessmentOutput(latestGapAssessment) : null
      }
    />
  );
}
