"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import {
  createRecruiter,
  deleteRecruiter,
  deleteRecruiterInteraction,
  logRecruiterInteraction,
  updateRecruiter,
} from "@/features/recruiters/service";
import { createReferral, deleteReferral, updateReferralStatus } from "@/features/recruiters/referrals";
import {
  CreateReferralInputSchema,
  CreateRecruiterInputSchema,
  DeleteReferralInputSchema,
  DeleteRecruiterInputSchema,
  DeleteRecruiterInteractionInputSchema,
  LogRecruiterInteractionInputSchema,
  UpdateReferralStatusInputSchema,
  UpdateRecruiterInputSchema,
} from "@/features/recruiters/schema";
import type { Recruiter, RecruiterInteraction, Referral } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("recruiters.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function createRecruiterAction(
  input: unknown,
): Promise<DataActionResult<Recruiter>> {
  const user = await verifySession();

  const parsed = CreateRecruiterInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That recruiter wasn't valid." };
  }

  try {
    const recruiter = await createRecruiter(user.id, parsed.data);
    await logAuditEvent("recruiter.created", {
      userId: user.id,
      metadata: { recruiterId: recruiter.id },
    });
    revalidatePath("/recruiters");
    return { status: "success", data: recruiter };
  } catch (error) {
    return toActionError(error, "We couldn't add that recruiter.");
  }
}

export async function updateRecruiterAction(
  input: unknown,
): Promise<DataActionResult<Recruiter>> {
  const user = await verifySession();

  const parsed = UpdateRecruiterInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That recruiter wasn't valid." };
  }

  try {
    const recruiter = await updateRecruiter(user.id, parsed.data);
    await logAuditEvent("recruiter.updated", {
      userId: user.id,
      metadata: { recruiterId: recruiter.id },
    });
    revalidatePath("/recruiters");
    revalidatePath(`/recruiters/${recruiter.id}`);
    return { status: "success", data: recruiter };
  } catch (error) {
    return toActionError(error, "We couldn't update that recruiter.");
  }
}

export async function deleteRecruiterAction(
  input: unknown,
): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  const parsed = DeleteRecruiterInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteRecruiter(user.id, parsed.data.recruiterId);
    await logAuditEvent("recruiter.deleted", {
      userId: user.id,
      metadata: { recruiterId: parsed.data.recruiterId },
    });
    revalidatePath("/recruiters");
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that recruiter.");
  }
}

export async function logRecruiterInteractionAction(
  input: unknown,
): Promise<DataActionResult<RecruiterInteraction>> {
  const user = await verifySession();

  const parsed = LogRecruiterInteractionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That interaction wasn't valid." };
  }

  try {
    const interaction = await logRecruiterInteraction(user.id, parsed.data);
    await logAuditEvent("recruiter_interaction.logged", {
      userId: user.id,
      metadata: { recruiterId: parsed.data.recruiterId, type: parsed.data.type },
    });
    revalidatePath("/recruiters");
    revalidatePath(`/recruiters/${parsed.data.recruiterId}`);
    return { status: "success", data: interaction };
  } catch (error) {
    return toActionError(error, "We couldn't log that interaction.");
  }
}

export async function deleteRecruiterInteractionAction(
  input: unknown,
): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  const parsed = DeleteRecruiterInteractionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteRecruiterInteraction(user.id, parsed.data.interactionId);
    await logAuditEvent("recruiter_interaction.deleted", {
      userId: user.id,
      metadata: { interactionId: parsed.data.interactionId },
    });
    revalidatePath("/recruiters");
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that interaction.");
  }
}

// ---------------------------------------------------------------------------
// Referrals (Sprint 21, Module 5)
// ---------------------------------------------------------------------------

export async function createReferralAction(input: unknown): Promise<DataActionResult<Referral>> {
  const user = await verifySession();

  const parsed = CreateReferralInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That referral wasn't valid." };
  }

  try {
    const referral = await createReferral(user.id, parsed.data);
    await logAuditEvent("referral.created", {
      userId: user.id,
      metadata: { referralId: referral.id, recruiterId: parsed.data.recruiterId },
    });
    revalidatePath("/recruiters");
    if (parsed.data.recruiterId) revalidatePath(`/recruiters/${parsed.data.recruiterId}`);
    return { status: "success", data: referral };
  } catch (error) {
    return toActionError(error, "We couldn't create that referral.");
  }
}

export async function updateReferralStatusAction(input: unknown): Promise<DataActionResult<Referral>> {
  const user = await verifySession();

  const parsed = UpdateReferralStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That status wasn't valid." };
  }

  try {
    const referral = await updateReferralStatus(user.id, parsed.data);
    await logAuditEvent("referral.status_changed", {
      userId: user.id,
      metadata: { referralId: referral.id, status: parsed.data.status },
    });
    revalidatePath("/recruiters");
    if (referral.recruiterId) revalidatePath(`/recruiters/${referral.recruiterId}`);
    return { status: "success", data: referral };
  } catch (error) {
    return toActionError(error, "We couldn't update that referral.");
  }
}

export async function deleteReferralAction(input: unknown): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  const parsed = DeleteReferralInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteReferral(user.id, parsed.data.referralId);
    await logAuditEvent("referral.deleted", {
      userId: user.id,
      metadata: { referralId: parsed.data.referralId },
    });
    revalidatePath("/recruiters");
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that referral.");
  }
}
