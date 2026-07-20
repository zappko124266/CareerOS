import "server-only";

import { getCompanyAggregates } from "@/features/companies/service";
import {
  computeAtsReadiness,
  computeCareerGapReadiness,
  computeCareerGoalAlignment,
  computeCompanyHealth,
  computeRecruiterConnection,
  mergeOpportunityScoreV2Factors,
} from "@/features/discovery/ranking";
import type { JobMatchFactors, OpportunityScoreV2Factors } from "@/features/discovery/types";
import { prisma } from "@/lib/prisma";

import { getOwnedOpportunityOrThrow } from "./queries";

/**
 * Module 12 — Career Opportunity Score V2 for one already-*saved*
 * opportunity. See `OpportunityScoreV2Factors`'s doc comment
 * (`features/discovery/types.ts`) for why this only extends the existing
 * `JobMatchFactors` with 3 real factors rather than the full wishlist.
 */
export async function computeOpportunityScoreV2(
  opportunityId: string,
  userId: string,
): Promise<{ factors: OpportunityScoreV2Factors; overallScore: number }> {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);

  const [discoveredListing, careerGoal, connectedRecruiter, companyAggregates, latestGapAssessment, latestResumeAnalysis] =
    await Promise.all([
      prisma.discoveredListing.findUnique({ where: { savedOpportunityId: opportunityId } }),
      prisma.careerGoal.findUnique({ where: { userId } }),
      opportunity.companyId
        ? prisma.recruiter.findFirst({
            where: { userId, companyId: opportunity.companyId, interactions: { some: {} } },
          })
        : null,
      opportunity.companyId ? getCompanyAggregates(opportunity.companyId) : null,
      prisma.experienceGapAssessment.findFirst({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
      }),
      opportunity.resumeId
        ? prisma.resumeAnalysis.findFirst({
            where: { resumeId: opportunity.resumeId },
            orderBy: { createdAt: "desc" },
          })
        : null,
    ]);

  const baseFactors = (discoveredListing?.matchFactors as unknown as JobMatchFactors | null) ?? null;

  const careerGoalAlignment = computeCareerGoalAlignment(
    opportunity,
    careerGoal
      ? {
          targetRole: careerGoal.targetRole,
          targetCompanies: Array.isArray(careerGoal.targetCompanies)
            ? (careerGoal.targetCompanies as unknown[]).filter((v): v is string => typeof v === "string")
            : [],
          targetSalaryMin: careerGoal.targetSalaryMin,
          targetSalaryMax: careerGoal.targetSalaryMax,
          targetLocation: careerGoal.targetLocation,
        }
      : null,
  );
  const recruiterConnection = computeRecruiterConnection(Boolean(connectedRecruiter));
  const companyHealth = computeCompanyHealth(
    companyAggregates
      ? {
          hiringFrequencyLast90Days: companyAggregates.hiringFrequencyLast90Days,
          totalOpportunities: companyAggregates.totalOpportunities,
        }
      : null,
  );

  const careerGapReadiness = computeCareerGapReadiness(
    latestGapAssessment ? { overallReadiness: latestGapAssessment.overallReadiness } : null,
  );
  const atsReadiness = computeAtsReadiness(
    latestResumeAnalysis ? { overallScore: latestResumeAnalysis.overallScore } : null,
  );

  return mergeOpportunityScoreV2Factors(baseFactors, {
    careerGoalAlignment,
    recruiterConnection,
    companyHealth,
    careerGapReadiness,
    atsReadiness,
  });
}
