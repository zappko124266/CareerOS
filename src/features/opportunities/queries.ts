import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Opportunity } from "@/generated/prisma/client";

export async function listOpportunitiesForUser(
  userId: string,
): Promise<Opportunity[]> {
  return prisma.opportunity.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOpportunityWithNotes(id: string, userId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: { interviewNotes: { orderBy: { createdAt: "desc" } } },
  });

  assertOpportunityOwnership(opportunity, userId);

  return opportunity;
}

/** Every source+sourceId pair a user has already saved — used by the
 * Discovery page to mark search results that are already saved instead of
 * offering to save a duplicate. */
export async function getSavedSourceIds(
  userId: string,
): Promise<Set<string>> {
  const rows = await prisma.opportunity.findMany({
    where: { userId },
    select: { source: true, sourceId: true },
  });

  return new Set(rows.map((row) => `${row.source}:${row.sourceId}`));
}

export function assertOpportunityOwnership<
  T extends { userId: string } | null,
>(opportunity: T, userId: string): asserts opportunity is NonNullable<T> {
  if (!opportunity) {
    throw new NotFoundError("That opportunity doesn't exist.");
  }

  if (opportunity.userId !== userId) {
    throw new ForbiddenError("That opportunity doesn't belong to you.");
  }
}

export async function getOwnedOpportunityOrThrow(
  id: string,
  userId: string,
): Promise<Opportunity> {
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  assertOpportunityOwnership(opportunity, userId);
  return opportunity;
}

export async function listAccountConnections(userId: string) {
  return prisma.accountConnection.findMany({
    where: { userId },
    orderBy: { provider: "asc" },
  });
}
