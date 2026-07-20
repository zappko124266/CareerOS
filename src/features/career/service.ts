import "server-only";

import { prisma } from "@/lib/prisma";

import { getOwnedLearningItemOrThrow } from "./queries";
import type {
  CreateLearningItemInput,
  LearningItemStatus,
  UpdateCareerGoalInput,
} from "./types";

/** One active goal per user — same 1:1-upsert convention as
 * `DiscoveryPreference`. Entirely user-entered. */
export async function updateCareerGoal(userId: string, input: UpdateCareerGoalInput) {
  return prisma.careerGoal.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}

export async function createLearningItem(userId: string, input: CreateLearningItemInput) {
  return prisma.learningItem.create({
    data: { userId, skillOrTopic: input.skillOrTopic, sourceUrl: input.sourceUrl },
  });
}

/** Always user-entered, even when a `LearningItem` originated from a
 * skill-gap suggestion — CareerOS never marks something "completed" on
 * its own. */
export async function updateLearningItemStatus(
  userId: string,
  learningItemId: string,
  status: LearningItemStatus,
) {
  await getOwnedLearningItemOrThrow(learningItemId, userId);
  return prisma.learningItem.update({ where: { id: learningItemId }, data: { status } });
}

export async function deleteLearningItem(userId: string, learningItemId: string): Promise<void> {
  await getOwnedLearningItemOrThrow(learningItemId, userId);
  await prisma.learningItem.delete({ where: { id: learningItemId } });
}
