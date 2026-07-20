"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { generateAndPersistCareerHealth } from "@/features/career/health";
import {
  createLearningItem,
  deleteLearningItem,
  updateCareerGoal,
  updateLearningItemStatus,
} from "@/features/career/service";
import {
  CreateLearningItemInputSchema,
  DeleteLearningItemInputSchema,
  UpdateCareerGoalInputSchema,
  UpdateLearningItemInputSchema,
} from "@/features/career/schema";
import type {
  CareerGoal,
  CareerHealthScore,
  LearningItem,
} from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("career.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function updateCareerGoalAction(
  input: unknown,
): Promise<DataActionResult<CareerGoal>> {
  const user = await verifySession();

  const parsed = UpdateCareerGoalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That goal wasn't valid." };
  }

  try {
    const goal = await updateCareerGoal(user.id, parsed.data);
    await logAuditEvent("career_goal.updated", { userId: user.id });
    revalidatePath("/dashboard");
    return { status: "success", data: goal };
  } catch (error) {
    return toActionError(error, "We couldn't save that career goal.");
  }
}

export async function createLearningItemAction(
  input: unknown,
): Promise<DataActionResult<LearningItem>> {
  const user = await verifySession();

  const parsed = CreateLearningItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That learning item wasn't valid." };
  }

  try {
    const item = await createLearningItem(user.id, parsed.data);
    await logAuditEvent("learning_item.created", {
      userId: user.id,
      metadata: { learningItemId: item.id },
    });
    revalidatePath("/dashboard");
    return { status: "success", data: item };
  } catch (error) {
    return toActionError(error, "We couldn't add that learning item.");
  }
}

export async function updateLearningItemStatusAction(
  input: unknown,
): Promise<DataActionResult<LearningItem>> {
  const user = await verifySession();

  const parsed = UpdateLearningItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That update wasn't valid." };
  }

  try {
    const item = await updateLearningItemStatus(user.id, parsed.data.learningItemId, parsed.data.status);
    await logAuditEvent("learning_item.updated", {
      userId: user.id,
      metadata: { learningItemId: item.id, status: parsed.data.status },
    });
    revalidatePath("/dashboard");
    return { status: "success", data: item };
  } catch (error) {
    return toActionError(error, "We couldn't update that learning item.");
  }
}

export async function deleteLearningItemAction(
  input: unknown,
): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  const parsed = DeleteLearningItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteLearningItem(user.id, parsed.data.learningItemId);
    await logAuditEvent("learning_item.deleted", {
      userId: user.id,
      metadata: { learningItemId: parsed.data.learningItemId },
    });
    revalidatePath("/dashboard");
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that learning item.");
  }
}

export async function generateCareerHealthAction(): Promise<DataActionResult<CareerHealthScore>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "CAREER_HEALTH_SCORE");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free Career Health checks this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const score = await generateAndPersistCareerHealth(user.id);
    await consumeEntitlement(user.id, "CAREER_HEALTH_SCORE");
    await logAuditEvent("career_health_score.generated", {
      userId: user.id,
      metadata: { overallScore: score.overallScore },
    });
    revalidatePath("/dashboard");
    return { status: "success", data: score };
  } catch (error) {
    return toActionError(error, "We couldn't compute your Career Health score right now.");
  }
}
