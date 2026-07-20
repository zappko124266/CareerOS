import "server-only";

import { computeApplicationAnalytics } from "@/features/analytics/service";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { CareerHealthScore, Prisma } from "@/generated/prisma/client";

import type { CareerHealthFactor, CareerHealthResultV2 } from "./types";

const NOT_AVAILABLE = (reason: string): CareerHealthFactor => ({ score: null, explanation: reason });

/**
 * Module 11 — Career Health Engine. `overallScore` is always this
 * function's own average of whichever factors are actually available —
 * never a number the AI reports directly, same discipline as
 * `overallReadiness` (Application Studio) and `overallScore`
 * (`features/discovery/ranking.ts`). Every sub-factor is sourced from
 * data CareerOS already has persisted; this function never itself calls
 * the AI Router, so running it never costs an extra model call beyond
 * whatever generated the underlying signals (resume ATS analysis,
 * Interview Coach, Salary Intelligence, Company Research) — see
 * `features/dashboard/career-health.ts`'s original doc comment, which
 * this is the "future sprint" it anticipated.
 */
export async function computeCareerHealthV2(userId: string): Promise<CareerHealthResultV2> {
  const [latestResumeAnalysis, latestInterviewPrep, learningItems, careerGoal, latestSalaryEstimate, analytics, activeOpportunities] =
    await Promise.all([
      prisma.resumeAnalysis.findFirst({
        where: { resume: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interviewPrep.findFirst({
        where: { interview: { opportunity: { userId } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.learningItem.findMany({ where: { userId } }),
      prisma.careerGoal.findUnique({ where: { userId } }),
      prisma.salaryEstimate.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      computeApplicationAnalytics(userId),
      prisma.opportunity.findMany({
        where: { userId, status: { notIn: ["DISCOVERED", "ARCHIVED"] } },
        select: { companyId: true },
      }),
    ]);

  const resumeQuality: CareerHealthFactor = latestResumeAnalysis
    ? { score: latestResumeAnalysis.overallScore, explanation: "From your latest resume ATS analysis." }
    : NOT_AVAILABLE("Upload and analyze a resume to populate this factor.");

  const interviewReadiness: CareerHealthFactor = latestInterviewPrep
    ? { score: latestInterviewPrep.confidenceScore, explanation: "From your most recent AI Interview Coach session." }
    : NOT_AVAILABLE("Generate interview prep for an active application to populate this factor.");

  // No persisted LinkedIn analysis exists yet — the dashboard's LinkedIn
  // card is ephemeral (see `## Dashboard`) — so this stays honestly
  // unavailable rather than a stale or guessed number.
  const linkedinQuality: CareerHealthFactor = NOT_AVAILABLE(
    "LinkedIn visibility results aren't persisted yet — this factor isn't available.",
  );

  const learningTotal = learningItems.length;
  const learningCompleted = learningItems.filter((item) => item.status === "COMPLETED").length;
  const skillReadiness: CareerHealthFactor =
    learningTotal > 0
      ? {
          score: Math.round((learningCompleted / learningTotal) * 100),
          explanation: `${learningCompleted} of ${learningTotal} tracked learning goals completed.`,
        }
      : NOT_AVAILABLE("Track a learning goal to populate this factor.");

  const marketReadiness: CareerHealthFactor =
    analytics.totalApplications > 0
      ? {
          score: analytics.responseRate,
          explanation: `${analytics.responseRate}% of your applications have gotten a response.`,
        }
      : NOT_AVAILABLE("Apply to at least one opportunity to populate this factor.");

  const companiesWithResearch = await prisma.company.count({
    where: {
      id: { in: activeOpportunities.map((o) => o.companyId).filter((id): id is string => Boolean(id)) },
      aiSummary: { not: null },
    },
  });
  const activeCompanyCount = new Set(
    activeOpportunities.map((o) => o.companyId).filter((id): id is string => Boolean(id)),
  ).size;
  const companyReadiness: CareerHealthFactor =
    activeCompanyCount > 0
      ? {
          score: Math.round((companiesWithResearch / activeCompanyCount) * 100),
          explanation: `Company Research generated for ${companiesWithResearch} of ${activeCompanyCount} companies you're actively engaging with.`,
        }
      : NOT_AVAILABLE("Save an active opportunity to populate this factor.");

  const growthReadiness: CareerHealthFactor =
    careerGoal || learningTotal > 0
      ? {
          score: Math.round(
            (careerGoal ? 50 : 0) + (learningTotal > 0 ? 25 : 0) + (learningTotal > 0 ? (learningCompleted / learningTotal) * 25 : 0),
          ),
          explanation: careerGoal
            ? "Based on your set career goal and learning activity."
            : "Based on your learning activity — set a career goal to strengthen this factor.",
        }
      : NOT_AVAILABLE("Set a career goal or track a learning item to populate this factor.");

  // `latestSalaryEstimate` isn't scored directly into a factor above (a
  // free-text percentile can't be turned into a reliable 0-100 number
  // without guessing) — it's surfaced to the caller separately if needed,
  // kept out of the composite rather than faking a score from it.
  void latestSalaryEstimate;

  const factors = {
    interviewReadiness,
    resumeQuality,
    linkedinQuality,
    skillReadiness,
    marketReadiness,
    companyReadiness,
    growthReadiness,
  };

  const availableScores = Object.values(factors)
    .filter((factor): factor is { score: number; explanation: string } => factor.score !== null);

  if (availableScores.length === 0) {
    throw new ValidationError(
      "Not enough data yet to compute a Career Health score — upload a resume or start applying to unlock this.",
    );
  }

  const overallScore = Math.round(
    availableScores.reduce((sum, factor) => sum + factor.score, 0) / availableScores.length,
  );

  return { overallScore, ...factors };
}

export async function generateAndPersistCareerHealth(userId: string): Promise<CareerHealthScore> {
  const result = await computeCareerHealthV2(userId);

  const factorsExplanation = Object.fromEntries(
    (
      [
        "interviewReadiness",
        "resumeQuality",
        "linkedinQuality",
        "skillReadiness",
        "marketReadiness",
        "companyReadiness",
        "growthReadiness",
      ] as const
    ).map((key) => [key, result[key].explanation]),
  );

  return prisma.careerHealthScore.create({
    data: {
      userId,
      overallScore: result.overallScore,
      interviewReadiness: result.interviewReadiness.score,
      resumeQuality: result.resumeQuality.score,
      linkedinQuality: result.linkedinQuality.score,
      skillReadiness: result.skillReadiness.score,
      marketReadiness: result.marketReadiness.score,
      companyReadiness: result.companyReadiness.score,
      growthReadiness: result.growthReadiness.score,
      factorsExplanation: factorsExplanation as unknown as Prisma.InputJsonValue,
    },
  });
}
