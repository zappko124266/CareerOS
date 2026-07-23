import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { ApprovalPolicy } from "@/generated/prisma/client";

/** One query, reused by both `execution.ts` (per-run) and the dashboard —
 * never re-derived from `UserDTO` (which deliberately doesn't carry this
 * field, keeping the widely-used auth DTO unchanged for this sprint). */
export async function getApprovalPolicyForUser(userId: string): Promise<ApprovalPolicy> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { applicationApprovalPolicy: true },
  });
  return profile?.applicationApprovalPolicy ?? "ALWAYS_ASK";
}

/** One query, reused by Career Brain — every downstream field (today's
 * applications, waiting approval, submitted, failed, connector
 * availability) is a pure filter/count over this same result set, never
 * a second query per bullet. */
export async function listApplicationExecutionsForUser(userId: string, limit = 100) {
  return prisma.applicationExecution.findMany({
    where: { opportunity: { userId } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { opportunity: { select: { id: true, title: true, companyName: true } } },
  });
}

export async function getOwnedApplicationExecutionOrThrow(executionId: string, userId: string) {
  const execution = await prisma.applicationExecution.findUnique({
    where: { id: executionId },
    include: { opportunity: true },
  });

  if (!execution) throw new NotFoundError("That application execution doesn't exist.");
  if (execution.opportunity.userId !== userId) throw new ForbiddenError("That application execution doesn't belong to you.");

  return execution;
}
