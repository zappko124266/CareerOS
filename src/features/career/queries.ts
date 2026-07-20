import "server-only";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getCareerGoal(userId: string) {
  return prisma.careerGoal.findUnique({ where: { userId } });
}

export async function listLearningItems(userId: string) {
  return prisma.learningItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnedLearningItemOrThrow(learningItemId: string, userId: string) {
  const item = await prisma.learningItem.findUnique({ where: { id: learningItemId } });
  if (!item) {
    throw new NotFoundError("That learning item doesn't exist.");
  }
  if (item.userId !== userId) {
    throw new ForbiddenError("That learning item doesn't belong to you.");
  }
  return item;
}
