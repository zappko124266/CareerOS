import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Recruiter, Referral } from "@/generated/prisma/client";

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

/** Sprint 21 (Recruiter Intelligence & Networking Operating System) —
 * widened from `take: 1` to the full interaction history in the *same*
 * query (Hard Lock 6: extend, don't add a second query) so both Career
 * Brain's `relationship.ts`/`scoring.ts` derivations and this list page
 * can compute real relationship scores from complete data. Interaction
 * volume per recruiter is small (personal CRM, not a mailbox), so this
 * stays well within one bounded round trip — no `take` cap needed, same
 * judgment call `getRecruiterWithInteractions` below already made. */
export async function listRecruitersForUser(userId: string) {
  return prisma.recruiter.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      interactions: { orderBy: { occurredAt: "desc" } },
      interviews: { select: { id: true, opportunityId: true, stage: true, scheduledAt: true } },
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
      interviews: { select: { id: true, opportunityId: true, stage: true, scheduledAt: true, roundLabel: true } },
    },
  });
  assertRecruiterOwnership(recruiter, userId);
  return recruiter;
}

/** Sprint 21, Module 1/11 — "Connected Opportunities/Applications" for
 * one recruiter's workspace page. Two real link paths, both already
 * existing: `Interview.recruiterId` (Sprint 17) and
 * `RecruiterInteraction.opportunityId` (this model's own original
 * design) — unioned here rather than trusting either alone, since a
 * recruiter can be linked to an opportunity through either path. A
 * single per-recruiter-page query, not part of Career Brain's batch. */
export async function listConnectedOpportunitiesForRecruiter(recruiterId: string, userId: string) {
  const [viaInterviews, viaInteractions] = await Promise.all([
    prisma.interview.findMany({
      where: { recruiterId },
      select: { opportunityId: true },
    }),
    prisma.recruiterInteraction.findMany({
      where: { recruiterId, opportunityId: { not: null } },
      select: { opportunityId: true },
    }),
  ]);

  const opportunityIds = Array.from(
    new Set(
      [...viaInterviews, ...viaInteractions]
        .map((row) => row.opportunityId)
        .filter((id): id is string => id !== null),
    ),
  );
  if (opportunityIds.length === 0) return [];

  return prisma.opportunity.findMany({
    where: { id: { in: opportunityIds }, userId },
    select: {
      id: true,
      title: true,
      companyName: true,
      status: true,
      createdAt: true,
      submissions: { select: { id: true, submittedAt: true, method: true }, orderBy: { submittedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Referrals (Module 5)
// ---------------------------------------------------------------------------

/** One additional query, part of the same batch Career Brain fetches
 * `listRecruitersForUser` in (Module 16: "Maximum one additional
 * recruiter query batch"). */
export async function listReferralsForUser(userId: string): Promise<Referral[]> {
  return prisma.referral.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/** Recruiter workspace page's own scoped query — deliberately not routed
 * through `listReferralsForUser` (which is for Career Brain's batch)
 * since fetching every referral this user has for a single-recruiter
 * page would be wasted work. */
export async function listReferralsForRecruiter(recruiterId: string, userId: string): Promise<Referral[]> {
  return prisma.referral.findMany({
    where: { recruiterId, userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function assertReferralOwnership<T extends { userId: string } | null>(
  referral: T,
  userId: string,
): asserts referral is NonNullable<T> {
  if (!referral) {
    throw new NotFoundError("That referral doesn't exist.");
  }
  if (referral.userId !== userId) {
    throw new ForbiddenError("That referral doesn't belong to you.");
  }
}

export async function getOwnedReferralOrThrow(referralId: string, userId: string): Promise<Referral> {
  const referral = await prisma.referral.findUnique({ where: { id: referralId } });
  assertReferralOwnership(referral, userId);
  return referral;
}

/** Module 13 — Gmail Intelligence reuse. A plain DB read of already
 * classified/stored `GmailCareerEvent` rows (never a Gmail API call —
 * Hard Lock: "no extra Gmail API calls"), matched by email address since
 * `GmailCareerEvent` has no `recruiterId` FK (Hard Lock: no duplicate
 * connector/Gmail logic — matching by the real email string this
 * recruiter was saved with is enough, no schema change needed). */
export async function listGmailEventsForRecruiterEmail(userId: string, email: string) {
  return prisma.gmailCareerEvent.findMany({
    where: {
      userId,
      OR: [{ fromEmail: { equals: email, mode: "insensitive" } }, { recruiterEmail: { equals: email, mode: "insensitive" } }],
    },
    orderBy: { receivedAt: "desc" },
  });
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
