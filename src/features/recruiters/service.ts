import "server-only";

import { prisma } from "@/lib/prisma";

import { getOwnedInteractionOrThrow, getOwnedRecruiterOrThrow } from "./queries";
import type {
  CreateRecruiterInput,
  LogRecruiterInteractionInput,
  UpdateRecruiterInput,
} from "./types";

/** Entirely user-entered — see `Recruiter`'s doc comment for why this is
 * per-user rather than the shared `Company` pattern. */
export async function createRecruiter(userId: string, input: CreateRecruiterInput) {
  return prisma.recruiter.create({
    data: {
      userId,
      name: input.name,
      companyId: input.companyId,
      title: input.title,
      linkedinUrl: input.linkedinUrl,
      email: input.email,
      notes: input.notes,
    },
  });
}

export async function updateRecruiter(userId: string, input: UpdateRecruiterInput) {
  await getOwnedRecruiterOrThrow(input.recruiterId, userId);

  return prisma.recruiter.update({
    where: { id: input.recruiterId },
    data: {
      name: input.name,
      companyId: input.companyId,
      title: input.title,
      linkedinUrl: input.linkedinUrl,
      email: input.email,
      notes: input.notes,
    },
  });
}

export async function deleteRecruiter(userId: string, recruiterId: string) {
  await getOwnedRecruiterOrThrow(recruiterId, userId);
  await prisma.recruiter.delete({ where: { id: recruiterId } });
}

/** Module 3 — Recruiter Intelligence. Every interaction is something the
 * user told CareerOS happened; CareerOS has no way to observe a
 * recruiter's actual behavior, so nothing here is ever inferred. */
export async function logRecruiterInteraction(
  userId: string,
  input: LogRecruiterInteractionInput,
) {
  await getOwnedRecruiterOrThrow(input.recruiterId, userId);

  return prisma.recruiterInteraction.create({
    data: {
      recruiterId: input.recruiterId,
      opportunityId: input.opportunityId,
      type: input.type,
      note: input.note,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });
}

export async function deleteRecruiterInteraction(userId: string, interactionId: string) {
  await getOwnedInteractionOrThrow(interactionId, userId);
  await prisma.recruiterInteraction.delete({ where: { id: interactionId } });
}
