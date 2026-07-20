import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Resume } from "@/generated/prisma/client";

export async function listResumesForUser(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResumeWithAnalyses(resumeId: string, userId: string) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { analyses: { orderBy: { createdAt: "desc" } } },
  });

  assertOwnership(resume, userId);

  return resume;
}

/** The user's most recently uploaded resume that finished parsing — the
 * one source of truth every feature (dashboard AI cards, Opportunity
 * match scoring) uses for "the current resume" rather than each querying
 * for it independently. */
export async function getLatestParsedResume(userId: string) {
  return prisma.resume.findFirst({
    where: { userId, status: "PARSED" },
    orderBy: { createdAt: "desc" },
  });
}

/** Throws `NotFoundError`/`ForbiddenError` instead of returning null/undefined,
 * so callers (Server Actions, pages) don't have to repeat the same check. */
export function assertOwnership<T extends { userId: string } | null>(
  resume: T,
  userId: string,
): asserts resume is NonNullable<T> {
  if (!resume) {
    throw new NotFoundError("That resume doesn't exist.");
  }

  if (resume.userId !== userId) {
    throw new ForbiddenError("That resume doesn't belong to you.");
  }
}

export async function getOwnedResumeOrThrow(
  resumeId: string,
  userId: string,
): Promise<Resume> {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  assertOwnership(resume, userId);
  return resume;
}

export async function listResumeVersions(resumeId: string, userId: string) {
  await getOwnedResumeOrThrow(resumeId, userId);
  return prisma.resumeVersion.findMany({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedResumeVersionOrThrow(
  versionId: string,
  resumeId: string,
  userId: string,
) {
  await getOwnedResumeOrThrow(resumeId, userId);

  const version = await prisma.resumeVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.resumeId !== resumeId) {
    throw new NotFoundError("That resume version doesn't exist.");
  }

  return version;
}
