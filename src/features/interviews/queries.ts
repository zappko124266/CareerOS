import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/** `Interview` has no direct `userId` — ownership is checked by joining
 * through its parent `Opportunity`, same convention as
 * `ApplicationDocument`/`ResumeVersion`. */
export async function getOwnedInterviewOrThrow(interviewId: string, userId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { opportunity: true },
  });

  if (!interview) {
    throw new NotFoundError("That interview doesn't exist.");
  }
  if (interview.opportunity.userId !== userId) {
    throw new ForbiddenError("That interview doesn't belong to you.");
  }

  return interview;
}

export async function listInterviewsForOpportunity(opportunityId: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) throw new NotFoundError("That opportunity doesn't exist.");
  if (opportunity.userId !== userId) throw new ForbiddenError("That opportunity doesn't belong to you.");

  return prisma.interview.findMany({
    where: { opportunityId },
    include: {
      recruiter: { select: { id: true, name: true } },
      preps: { orderBy: { createdAt: "desc" }, take: 1 },
      notes: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Every interview across every opportunity this user has — Sprint 3
 * (Career Agent). One query powers several things: the dashboard's
 * Upcoming Interviews widget (filter `scheduledAt` in the future, sort
 * ascending), the Career Inbox timeline (every row with a `scheduledAt`
 * becomes one event), and — Sprint 17 (Calendar Intelligence) — Mission
 * Control's Interview/Calendar card (meeting link, meeting status,
 * conflict flags) and the Autonomous Career Agent's interview-lifecycle
 * signals. The Sprint 17 fields were added to this *same* `select`
 * rather than a second cross-opportunity interview query (Hard Lock 6). */
export async function listInterviewEventsForUser(userId: string) {
  return prisma.interview.findMany({
    where: { opportunity: { userId } },
    select: {
      id: true,
      stage: true,
      /** Sprint 20 (Interview Intelligence) — the same append-only history
       * `transitionInterviewStage` already writes; widening this one
       * `select` (Hard Lock 6) rather than a second cross-opportunity
       * query is what lets Career Memory show real stage transitions
       * (`career-agent/inbox.ts`) and the Stage Tracker compute
       * `daysWaiting` without an extra fetch. */
      stageHistory: true,
      createdAt: true,
      scheduledAt: true,
      roundLabel: true,
      meetingStatus: true,
      meetingStatusHistory: true,
      meetingLink: true,
      meetingPlatform: true,
      timezone: true,
      hasConflict: true,
      conflictNote: true,
      source: true,
      opportunity: { select: { id: true, title: true, companyName: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

/** Most recent `InterviewPrep` across every interview this user has —
 * backs the dashboard's Interview Readiness card. */
export async function getLatestInterviewPrepForUser(userId: string) {
  return prisma.interviewPrep.findFirst({
    where: { interview: { opportunity: { userId } } },
    orderBy: { createdAt: "desc" },
    include: { interview: { include: { opportunity: { select: { id: true, title: true, companyName: true } } } } },
  });
}

export async function getLatestInterviewPrep(interviewId: string) {
  return prisma.interviewPrep.findFirst({
    where: { interviewId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedInterviewPrepOrThrow(interviewPrepId: string, userId: string) {
  const prep = await prisma.interviewPrep.findUnique({
    where: { id: interviewPrepId },
    include: { interview: { include: { opportunity: true } } },
  });

  if (!prep) {
    throw new NotFoundError("That interview prep doesn't exist.");
  }
  if (prep.interview.opportunity.userId !== userId) {
    throw new ForbiddenError("That interview prep doesn't belong to you.");
  }

  return prep;
}

/** Sprint 17 — real existence check only (`opportunityId`s with a real
 * `Offer` row), reused by Career Brain to derive "Offer Pending" vs
 * "Offer Received" (`interviews/intelligence/tracking.ts`'s
 * `deriveInterviewLifecycleLabel`) without a second, per-interview
 * lookup. */
export async function listOfferOpportunityIdsForUser(userId: string): Promise<string[]> {
  const offers = await prisma.offer.findMany({
    where: { opportunity: { userId } },
    select: { opportunityId: true },
  });
  return offers.map((offer) => offer.opportunityId);
}

export async function getOfferForOpportunity(opportunityId: string) {
  return prisma.offer.findUnique({ where: { opportunityId } });
}

export async function listOwnedOffersOrThrow(opportunityIds: string[], userId: string) {
  const opportunities = await prisma.opportunity.findMany({
    where: { id: { in: opportunityIds } },
    include: { offer: true },
  });

  if (opportunities.length !== opportunityIds.length) {
    throw new NotFoundError("One or more of those opportunities doesn't exist.");
  }
  if (opportunities.some((opportunity) => opportunity.userId !== userId)) {
    throw new ForbiddenError("One or more of those opportunities doesn't belong to you.");
  }

  return opportunities;
}
