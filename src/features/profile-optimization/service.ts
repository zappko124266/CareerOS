import "server-only";

import { computeOpportunityScoreV2 } from "@/features/opportunities/score";
import { STATUS_OFF_PATH } from "@/features/opportunities/types";
import { getLatestLinkedInAnalysis } from "@/features/linkedin-profile/queries";
import type { RankingFactor } from "@/features/discovery/types";
import { prisma } from "@/lib/prisma";

export interface ProfileOptimizationSummary {
  resumeScore: RankingFactor;
  linkedInScore: RankingFactor;
  careerGapScore: RankingFactor;
  opportunityScore: RankingFactor;
  applicationReadiness: RankingFactor;
}

const unavailable = (explanation: string): RankingFactor => ({
  score: 0,
  explanation,
  available: false,
});

/**
 * Sprint 10, Module 7 — Profile Optimization Dashboard's aggregation.
 * Every number here is read from an already-persisted, already-computed
 * score elsewhere in the app (Resume ATS analysis, LinkedIn SEO
 * Intelligence, Career Gap Engine, Opportunity Score V2, Application
 * Review) — this function computes nothing new, no AI call of its own.
 *
 * The sprint brief lists 7 scores (Resume, LinkedIn, ATS, SEO, Career
 * Gap, Opportunity, Application Readiness); this returns 5. "ATS Score"
 * and "Resume Score" are the same underlying `ResumeAnalysis.overallScore`
 * in this codebase (confirmed during this sprint's self-review — there's
 * no second, different ATS metric), and "SEO Score" for LinkedIn is the
 * same `LinkedInAnalysis.seoScore` already surfaced as part of the
 * LinkedIn factor. Showing the identical number twice under two labels
 * would be presentational padding, not a second real signal — so they're
 * consolidated here rather than duplicated.
 */
export async function getProfileOptimizationSummary(
  userId: string,
): Promise<ProfileOptimizationSummary> {
  const [latestResumeAnalysis, latestLinkedInAnalysis, latestGapAssessment, latestReview, activeOpportunity] =
    await Promise.all([
      prisma.resumeAnalysis.findFirst({
        where: { resume: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      getLatestLinkedInAnalysis(userId),
      prisma.experienceGapAssessment.findFirst({
        where: { opportunity: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.applicationReview.findFirst({
        where: { opportunity: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.opportunity.findFirst({
        where: { userId, status: { notIn: STATUS_OFF_PATH } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const resumeScore: RankingFactor = latestResumeAnalysis
    ? {
        score: latestResumeAnalysis.overallScore,
        explanation: "Your latest resume ATS analysis score.",
        available: true,
      }
    : unavailable("Run a resume ATS analysis to see this.");

  const linkedInSubScores = [
    latestLinkedInAnalysis?.seoScore,
    latestLinkedInAnalysis?.recruiterVisibilityScore,
  ].filter((score): score is number => typeof score === "number");
  const linkedInScore: RankingFactor =
    linkedInSubScores.length > 0
      ? {
          score: Math.round(linkedInSubScores.reduce((sum, score) => sum + score, 0) / linkedInSubScores.length),
          explanation: "Average of your latest LinkedIn SEO score and recruiter visibility score.",
          available: true,
        }
      : unavailable("Run a LinkedIn analysis to see this.");

  const careerGapScore: RankingFactor = latestGapAssessment
    ? {
        score: latestGapAssessment.overallReadiness,
        explanation: "Your most recent career gap assessment's overall readiness.",
        available: true,
      }
    : unavailable("Run a career gap analysis on a saved opportunity to see this.");

  const applicationReadiness: RankingFactor = latestReview
    ? {
        score: latestReview.readinessScore,
        explanation: "Your most recent application review's readiness score.",
        available: true,
      }
    : unavailable("Run an application review on a saved opportunity to see this.");

  let opportunityScore: RankingFactor = unavailable(
    "Save an active opportunity to see this.",
  );
  if (activeOpportunity) {
    const result = await computeOpportunityScoreV2(activeOpportunity.id, userId);
    opportunityScore = {
      score: result.overallScore,
      explanation: `Opportunity Score for your most recently active saved opportunity (${activeOpportunity.title} at ${activeOpportunity.companyName}).`,
      available: true,
    };
  }

  return { resumeScore, linkedInScore, careerGapScore, opportunityScore, applicationReadiness };
}
