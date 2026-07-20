import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Recruiter } from "@/generated/prisma/client";

export function assertRecruiterOwnership<T extends { userId: string } | null>(
  recruiter: T,
  userId: string,
): asserts recruiter is NonNullable<T> {
  if (!recruiter) {
    throw new NotFoundError("That recruiter doesn't exist.");
  }
  if (recruiter.userId !== userId) {
    throw new ForbiddenError("That recruiter doesn't belong to you.");
  }
}

export async function getOwnedRecruiterOrThrow(
  recruiterId: string,
  userId: string,
): Promise<Recruiter> {
  const recruiter = await prisma.recruiter.findUnique({ where: { id: recruiterId } });
  assertRecruiterOwnership(recruiter, userId);
  return recruiter;
}

export async function listRecruitersForUser(userId: string) {
  return prisma.recruiter.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      interactions: { orderBy: { occurredAt: "desc" }, take: 1 },
      _count: { select: { interactions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRecruiterWithInteractions(recruiterId: string, userId: string) {
  const recruiter = await prisma.recruiter.findUnique({
    where: { id: recruiterId },
    include: {
      company: { select: { id: true, name: true } },
      interactions: { orderBy: { occurredAt: "desc" } },
    },
  });
  assertRecruiterOwnership(recruiter, userId);
  return recruiter;
}

/** A `RecruiterInteraction` has no direct `userId` — ownership is checked
 * by joining through its parent `Recruiter`, same convention as
 * `ApplicationDocument`/`ResumeVersion` elsewhere in this codebase. */
export async function getOwnedInteractionOrThrow(interactionId: string, userId: string) {
  const interaction = await prisma.recruiterInteraction.findUnique({
    where: { id: interactionId },
    include: { recruiter: true },
  });

  if (!interaction) {
    throw new NotFoundError("That interaction doesn't exist.");
  }
  if (interaction.recruiter.userId !== userId) {
    throw new ForbiddenError("That interaction doesn't belong to you.");
  }

  return interaction;
}
