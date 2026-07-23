import "server-only";

import { getOwnedOpportunityOrThrow } from "@/features/opportunities/queries";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import { getOwnedReferralOrThrow, getOwnedRecruiterOrThrow } from "./queries";
import type { CreateReferralInput, UpdateReferralStatusInput } from "./types";

/**
 * Module 5 — Referral Intelligence. "Never fabricate referrals": every
 * `Referral` row here is something the user explicitly created — there
 * is no code path anywhere in this sprint that creates one automatically
 * from Gmail, an interview, or any other signal.
 */
export async function createReferral(userId: string, input: CreateReferralInput) {
  if (input.recruiterId) {
    await getOwnedRecruiterOrThrow(input.recruiterId, userId);
  }
  if (input.opportunityId) {
    await getOwnedOpportunityOrThrow(input.opportunityId, userId);
  }

  return prisma.referral.create({
    data: {
      userId,
      recruiterId: input.recruiterId,
      companyId: input.companyId,
      opportunityId: input.opportunityId,
      notes: input.notes,
      statusHistory: [
        { status: "REQUESTED", changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

/** The one place a `Referral.status` may change — mirrors
 * `transitionInterviewStage`'s append-only discipline exactly, so
 * `statusHistory` (and the Career Memory timeline events
 * `timeline.ts`'s `toRecruiterCareerEvents` derives from it) can never
 * drift out of sync with the current `status`. */
export async function updateReferralStatus(userId: string, input: UpdateReferralStatusInput) {
  const referral = await getOwnedReferralOrThrow(input.referralId, userId);
  const history = (referral.statusHistory ?? []) as Array<{ status: string; changedAt: string }>;

  return prisma.referral.update({
    where: { id: input.referralId },
    data: {
      status: input.status,
      statusHistory: [
        ...history,
        { status: input.status, changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function deleteReferral(userId: string, referralId: string): Promise<void> {
  await getOwnedReferralOrThrow(referralId, userId);
  await prisma.referral.delete({ where: { id: referralId } });
}
