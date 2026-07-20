"use server";

import { revalidatePath } from "next/cache";

import { verifyRole } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import {
  deleteEntitlementOverride,
  upsertEntitlementOverride,
} from "@/features/entitlements/queries";
import {
  RemoveEntitlementOverrideInputSchema,
  SetEntitlementOverrideInputSchema,
} from "@/features/entitlements/schema";
import { recordFailedSubmission } from "@/features/applications/service";
import type { ApplicationSubmission, EntitlementOverride } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("admin.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/** Module 11 — Manual Entitlement Override. Every override is itself
 * audited (`createdByUserId` on the row, plus this `AuditLog` entry) so
 * an admin overriding a user's limits is never a silent action. */
export async function setEntitlementOverrideAction(
  input: unknown,
): Promise<DataActionResult<EntitlementOverride>> {
  const admin = await verifyRole([...ADMIN_ROLES]);

  const parsed = SetEntitlementOverrideInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That override wasn't valid." };
  }

  try {
    const override = await upsertEntitlementOverride(parsed.data, admin.id);
    await logAuditEvent("entitlement_override.set", {
      userId: admin.id,
      metadata: {
        targetUserId: parsed.data.userId,
        feature: parsed.data.feature,
        customLimit: parsed.data.customLimit,
        reason: parsed.data.reason,
      },
    });
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return { status: "success", data: override };
  } catch (error) {
    return toActionError(error, "We couldn't set that override.");
  }
}

export async function removeEntitlementOverrideAction(
  input: unknown,
): Promise<DataActionResult<{ removed: true }>> {
  const admin = await verifyRole([...ADMIN_ROLES]);

  const parsed = RemoveEntitlementOverrideInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteEntitlementOverride(parsed.data.userId, parsed.data.feature);
    await logAuditEvent("entitlement_override.removed", {
      userId: admin.id,
      metadata: { targetUserId: parsed.data.userId, feature: parsed.data.feature },
    });
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return { status: "success", data: { removed: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that override.");
  }
}

/** Module 11's "Failure Queue" / "Retry Queue" management — an admin
 * marking a stuck `PENDING` submission as failed so it's visible for the
 * user to retry themselves. Reuses the same `recordFailedSubmission`
 * domain function a user's own retry flow would use. */
export async function adminMarkSubmissionFailedAction(input: {
  submissionId: string;
  userId: string;
  failureReason: string;
}): Promise<DataActionResult<ApplicationSubmission>> {
  await verifyRole([...ADMIN_ROLES]);

  try {
    const submission = await recordFailedSubmission(
      input.submissionId,
      input.userId,
      input.failureReason,
    );
    await logAuditEvent("application_submission.failed", {
      userId: input.userId,
      metadata: { submissionId: input.submissionId, failureReason: input.failureReason, markedByAdmin: true },
    });
    revalidatePath("/admin");
    return { status: "success", data: submission };
  } catch (error) {
    return toActionError(error, "We couldn't update that submission.");
  }
}
