import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertOpportunityOwnership } from "@/features/opportunities/queries";

/** An `ApplicationDocument` has no `userId` of its own — ownership is
 * always checked by joining through its `Opportunity`, same convention as
 * `ResumeVersion` (no direct `userId`, checked via its `Resume`). */
export async function getOwnedApplicationDocumentOrThrow(
  documentId: string,
  userId: string,
) {
  const document = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
    include: { opportunity: true },
  });

  if (!document) {
    throw new NotFoundError("That document doesn't exist.");
  }
  if (document.opportunity.userId !== userId) {
    throw new ForbiddenError("That document doesn't belong to you.");
  }

  return document;
}

export async function getOwnedApplicationDocumentVersionOrThrow(
  versionId: string,
  userId: string,
) {
  const version = await prisma.applicationDocumentVersion.findUnique({
    where: { id: versionId },
    include: { document: { include: { opportunity: true } } },
  });

  if (!version) {
    throw new NotFoundError("That version doesn't exist.");
  }
  if (version.document.opportunity.userId !== userId) {
    throw new ForbiddenError("That version doesn't belong to you.");
  }

  return version;
}

export async function listApplicationDocuments(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.applicationDocument.findMany({
    where: { opportunityId },
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
  });
}

export async function listApplicationDocumentVersions(
  documentId: string,
  userId: string,
) {
  await getOwnedApplicationDocumentOrThrow(documentId, userId);

  return prisma.applicationDocumentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanySnapshot(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.companySnapshot.findUnique({ where: { opportunityId } });
}

export async function getLatestApplicationReview(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.applicationReview.findFirst({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listApplicationReviews(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.applicationReview.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestApplicationStrategy(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.applicationStrategy.findFirst({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

/** Sprint 9, Module 7/8 — most recent `ExperienceGapAssessment` for an
 * opportunity, if any has been generated yet. */
export async function getLatestExperienceGapAssessment(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.experienceGapAssessment.findFirst({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestFollowUpRecommendation(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.followUpRecommendation.findFirst({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listFollowUpRecommendations(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.followUpRecommendation.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listApplicationSubmissions(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  assertOpportunityOwnership(opportunity, userId);

  return prisma.applicationSubmission.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedApplicationSubmissionOrThrow(submissionId: string, userId: string) {
  const submission = await prisma.applicationSubmission.findUnique({
    where: { id: submissionId },
    include: { opportunity: true },
  });

  if (!submission) {
    throw new NotFoundError("That submission doesn't exist.");
  }
  if (submission.opportunity.userId !== userId) {
    throw new ForbiddenError("That submission doesn't belong to you.");
  }

  return submission;
}

/** Opportunities actively awaiting a response — past `APPLIED` but not
 * yet at a resolved/terminal status (offer, rejection, withdrawal, etc.),
 * where the status hasn't moved in at least a day. */
const ACTIVE_APPLIED_STATUSES = [
  "APPLIED",
  "APPLICATION_VIEWED",
  "RECRUITER_CONTACT",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
] as const;

const FOLLOW_UP_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const MIN_STATUS_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Module 12 — Background Automation's source of "who's due for a
 * follow-up recommendation": an active (non-terminal) applied opportunity
 * whose status hasn't changed in the last day, and which either has no
 * `FollowUpRecommendation` yet or hasn't had one generated in the last 3
 * days — so the cron never re-recommends on every run. Overfetches
 * candidates by `limit * 5` since the cooldown check is "no recent
 * related row," which doesn't map to a single `WHERE` clause on
 * `Opportunity` directly.
 *
 * The cooldown check itself is one batched query (which candidate IDs
 * have a `FollowUpRecommendation` newer than the cooldown window),
 * not one `findFirst` per candidate — this was an N+1 (up to `limit * 5`
 * sequential queries) fixed to 2 total queries.
 */
export async function listOpportunitiesDueForFollowUp(
  now: Date,
  limit: number,
): Promise<{ opportunityId: string; userId: string }[]> {
  const candidates = await prisma.opportunity.findMany({
    where: {
      status: { in: [...ACTIVE_APPLIED_STATUSES] },
      updatedAt: { lte: new Date(now.getTime() - MIN_STATUS_AGE_MS) },
    },
    orderBy: { updatedAt: "asc" },
    take: limit * 5,
    select: { id: true, userId: true },
  });

  if (candidates.length === 0) return [];

  const recentlyRecommended = await prisma.followUpRecommendation.findMany({
    where: {
      opportunityId: { in: candidates.map((candidate) => candidate.id) },
      createdAt: { gte: new Date(now.getTime() - FOLLOW_UP_COOLDOWN_MS) },
    },
    select: { opportunityId: true },
    distinct: ["opportunityId"],
  });
  const recentlyRecommendedIds = new Set(recentlyRecommended.map((row) => row.opportunityId));

  return candidates
    .filter((candidate) => !recentlyRecommendedIds.has(candidate.id))
    .slice(0, limit)
    .map((candidate) => ({ opportunityId: candidate.id, userId: candidate.userId }));
}

/** Sprint 13 (Career Identity), Document Vault — every `ApplicationDocument`
 * across every one of the user's opportunities, joined through
 * `Opportunity` the same way `getOwnedApplicationDocumentOrThrow` checks
 * ownership (no direct `userId` on this model). `listApplicationDocuments`
 * stays per-opportunity for the workspace's Documents tab; this is the
 * first cross-opportunity read. */
export async function listAllApplicationDocumentsForUser(userId: string) {
  return prisma.applicationDocument.findMany({
    where: { opportunity: { userId } },
    include: { opportunity: { select: { id: true, title: true, companyName: true } } },
    orderBy: { updatedAt: "desc" },
  });
}
