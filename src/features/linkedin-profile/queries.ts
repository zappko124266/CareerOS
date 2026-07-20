import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function getLinkedInProfile(userId: string) {
  return prisma.linkedInProfile.findUnique({ where: { userId } });
}

export async function getOwnedLinkedInProfileOrThrow(profileId: string, userId: string) {
  const profile = await prisma.linkedInProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new NotFoundError("That LinkedIn profile doesn't exist.");
  if (profile.userId !== userId) throw new ForbiddenError("That LinkedIn profile doesn't belong to you.");
  return profile;
}

export async function listLinkedInProfileVersions(userId: string) {
  const profile = await getLinkedInProfile(userId);
  if (!profile) return [];
  return prisma.linkedInProfileVersion.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedLinkedInProfileVersionOrThrow(versionId: string, userId: string) {
  const version = await prisma.linkedInProfileVersion.findUnique({
    where: { id: versionId },
    include: { profile: true },
  });
  if (!version) throw new NotFoundError("That LinkedIn profile version doesn't exist.");
  if (version.profile.userId !== userId) {
    throw new ForbiddenError("That LinkedIn profile version doesn't belong to you.");
  }
  return version;
}

export async function getLatestLinkedInAnalysis(userId: string) {
  const profile = await getLinkedInProfile(userId);
  if (!profile) return null;
  return prisma.linkedInAnalysis.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
}
