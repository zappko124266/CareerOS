import "server-only";

import { researchCompany } from "@/features/career-intelligence/companies";
import { buildRecruiterIntelligenceSummary } from "@/features/recruiters/orchestrator";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Company } from "@/generated/prisma/client";

import { getOwnedCompanyOrThrow, listRecentJobDescriptionsForCompany } from "./queries";
import type { CompanyAggregates, CompanyIntelligence } from "./types";

const MAX_JOB_DESCRIPTIONS_FOR_RESEARCH = 5;

export function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * The one write path into `Company` — global and shared across every
 * user (see the model's own doc comment for the name-collision caveat
 * this implies). `update: {}` deliberately leaves an existing row's
 * `name` casing untouched (first-seen wins) rather than flip-flopping
 * display casing every time a different user saves the same company
 * under slightly different capitalization.
 */
export async function resolveOrCreateCompany(name: string): Promise<Company | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const normalizedName = normalizeCompanyName(trimmedName);

  return prisma.company.upsert({
    where: { normalizedName },
    create: { name: trimmedName, normalizedName },
    update: {},
  });
}

/**
 * Every "Company Intelligence" number that isn't the cached AI summary —
 * computed live from this company's own `Opportunity`/`ApplicationSubmission`/
 * `Interview` rows across every user, never stored redundantly on `Company`
 * itself so it can never go stale. See `Company`'s own doc comment.
 */
export async function getCompanyAggregates(companyId: string): Promise<CompanyAggregates> {
  const opportunities = await prisma.opportunity.findMany({
    where: { companyId },
    select: {
      id: true,
      remote: true,
      location: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      createdAt: true,
    },
  });

  const totalOpportunities = opportunities.length;
  const remoteCount = opportunities.filter((opportunity) => opportunity.remote).length;
  const onsiteCount = totalOpportunities - remoteCount;
  const locations = Array.from(
    new Set(
      opportunities
        .map((opportunity) => opportunity.location)
        .filter((location): location is string => Boolean(location)),
    ),
  );

  const withSalary = opportunities.filter(
    (opportunity) => opportunity.salaryMin != null || opportunity.salaryMax != null,
  );
  const salaryRangeMin = withSalary.length
    ? Math.min(...withSalary.map((o) => o.salaryMin ?? o.salaryMax!))
    : null;
  const salaryRangeMax = withSalary.length
    ? Math.max(...withSalary.map((o) => o.salaryMax ?? o.salaryMin!))
    : null;
  const salaryCurrency = withSalary.find((o) => o.salaryCurrency)?.salaryCurrency ?? null;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const hiringFrequencyLast90Days = opportunities.filter(
    (opportunity) => opportunity.createdAt >= ninetyDaysAgo,
  ).length;

  const opportunityIds = opportunities.map((opportunity) => opportunity.id);

  const submissions = opportunityIds.length
    ? await prisma.applicationSubmission.findMany({
        where: { opportunityId: { in: opportunityIds } },
        select: { method: true },
      })
    : [];
  const applicationMethodCounts: Record<string, number> = {};
  for (const submission of submissions) {
    applicationMethodCounts[submission.method] = (applicationMethodCounts[submission.method] ?? 0) + 1;
  }

  const ratedInterviews = opportunityIds.length
    ? await prisma.interview.findMany({
        where: { opportunityId: { in: opportunityIds }, difficultyRating: { not: null } },
        select: { difficultyRating: true },
      })
    : [];
  const ratings = ratedInterviews
    .map((interview) => interview.difficultyRating)
    .filter((rating): rating is number => rating != null);
  const averageInterviewDifficulty = ratings.length
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
    : null;

  return {
    totalOpportunities,
    remoteCount,
    onsiteCount,
    locations,
    salaryRangeMin,
    salaryRangeMax,
    salaryCurrency,
    hiringFrequencyLast90Days,
    applicationMethodCounts,
    averageInterviewDifficulty,
    interviewDifficultySampleSize: ratings.length,
  };
}

/** Opportunities saved before this sprint have no `companyId` — rather
 * than a mass backfill migration, this resolves/links one lazily the
 * first time a page actually needs it (the Company Intelligence link
 * from an opportunity's Overview tab). Cheap no-op once linked. */
export async function ensureOpportunityCompanyId(
  opportunityId: string,
  companyName: string,
  existingCompanyId: string | null,
): Promise<string | null> {
  if (existingCompanyId) return existingCompanyId;

  const company = await resolveOrCreateCompany(companyName);
  if (!company) return null;

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { companyId: company.id },
  });

  return company.id;
}

/** Sprint 21, Module 14 — `userId` is optional so every existing caller
 * that only needs the shared `company`/`aggregates` data keeps compiling
 * unchanged; the one caller that renders the workspace page passes it to
 * get real, this-user's-own `recruiters` back too. */
export async function getCompanyIntelligence(companyId: string, userId?: string): Promise<CompanyIntelligence> {
  const company = await getOwnedCompanyOrThrow(companyId);
  const [aggregates, recruiters, referrals] = await Promise.all([
    getCompanyAggregates(companyId),
    userId
      ? prisma.recruiter.findMany({
          where: { userId, companyId },
          include: {
            company: { select: { id: true, name: true } },
            interactions: { orderBy: { occurredAt: "desc" } },
            interviews: { select: { id: true, opportunityId: true, stage: true, scheduledAt: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    userId ? prisma.referral.findMany({ where: { userId, companyId } }) : Promise.resolve([]),
  ]);

  const enrichedRecruiters = recruiters.length > 0 ? buildRecruiterIntelligenceSummary(recruiters, referrals).recruiters : [];

  return { company, aggregates, recruiters: enrichedRecruiters };
}

/** Module 7 — Company Research. Grounded ONLY in real job-description
 * text CareerOS has actually stored for this company (never fetched from
 * anywhere external) — see `researchCompany`'s own prompt discipline.
 * Regenerates `Company`'s AI fields in place, same cache convention as
 * `CompanySnapshot`. */
export async function generateCompanyResearch(companyId: string): Promise<Company> {
  const company = await getOwnedCompanyOrThrow(companyId);
  const jobDescriptions = await listRecentJobDescriptionsForCompany(
    companyId,
    MAX_JOB_DESCRIPTIONS_FOR_RESEARCH,
  );

  if (jobDescriptions.length === 0) {
    throw new ValidationError(
      "No job listings on file for this company yet — there's nothing to research from.",
    );
  }

  const result = await researchCompany({ companyName: company.name, jobDescriptions });

  return prisma.company.update({
    where: { id: companyId },
    data: {
      industry: result.industry,
      businessCategory: result.businessCategory,
      sizeEstimate: result.sizeEstimate,
      aiSummary: result.summary,
      aiHighlights: result.highlights,
      aiCaveats: result.caveats,
      aiModel: "ai-router",
    },
  });
}
