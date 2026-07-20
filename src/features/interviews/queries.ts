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
