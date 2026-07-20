"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import {
  addInterviewNote,
  compareOffers,
  createInterview,
  deleteOffer,
  generateAnswerFeedback,
  generateInterviewPrep,
  updateInterview,
  updateInterviewStage,
  upsertOffer,
} from "@/features/interviews/service";
import {
  AddInterviewNoteInputSchema,
  CompareOffersInputSchema,
  CreateInterviewInputSchema,
  DeleteOfferInputSchema,
  GenerateAnswerFeedbackInputSchema,
  GenerateInterviewPrepInputSchema,
  UpdateInterviewInputSchema,
  UpdateInterviewStageInputSchema,
  UpsertOfferInputSchema,
} from "@/features/interviews/schema";
import type { OfferComparisonResult } from "@/features/interviews/types";
import type {
  Interview,
  InterviewNote,
  InterviewPrep,
  Offer,
} from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("interviews.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function createInterviewAction(
  input: unknown,
): Promise<DataActionResult<Interview>> {
  const user = await verifySession();

  const parsed = CreateInterviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That interview wasn't valid." };
  }

  try {
    const interview = await createInterview(user.id, parsed.data);
    await logAuditEvent("interview.created", {
      userId: user.id,
      metadata: { interviewId: interview.id, opportunityId: parsed.data.opportunityId },
    });
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: interview };
  } catch (error) {
    return toActionError(error, "We couldn't create that interview.");
  }
}

export async function updateInterviewStageAction(
  input: unknown,
): Promise<DataActionResult<Interview>> {
  const user = await verifySession();

  const parsed = UpdateInterviewStageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That stage wasn't valid." };
  }

  try {
    const interview = await updateInterviewStage(user.id, parsed.data.interviewId, parsed.data.stage);
    await logAuditEvent("interview.stage_changed", {
      userId: user.id,
      metadata: { interviewId: interview.id, stage: parsed.data.stage },
    });
    revalidatePath(`/opportunities/${interview.opportunityId}`);
    return { status: "success", data: interview };
  } catch (error) {
    return toActionError(error, "We couldn't update that interview stage.");
  }
}

export async function updateInterviewAction(
  input: unknown,
): Promise<DataActionResult<Interview>> {
  const user = await verifySession();

  const parsed = UpdateInterviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That update wasn't valid." };
  }

  try {
    const interview = await updateInterview(user.id, parsed.data);
    await logAuditEvent("interview.feedback_updated", {
      userId: user.id,
      metadata: { interviewId: interview.id },
    });
    revalidatePath(`/opportunities/${interview.opportunityId}`);
    return { status: "success", data: interview };
  } catch (error) {
    return toActionError(error, "We couldn't update that interview.");
  }
}

export async function generateInterviewPrepAction(
  input: unknown,
): Promise<DataActionResult<InterviewPrep>> {
  const user = await verifySession();

  const parsed = GenerateInterviewPrepInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  const entitlement = await checkEntitlement(user.id, "INTERVIEW_PREP");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free interview coach runs this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const prep = await generateInterviewPrep(user.id, parsed.data.interviewId, parsed.data.interviewType);
    await consumeEntitlement(user.id, "INTERVIEW_PREP");
    await logAuditEvent("interview_prep.generated", {
      userId: user.id,
      metadata: { interviewId: parsed.data.interviewId, confidenceScore: prep.confidenceScore },
    });
    return { status: "success", data: prep };
  } catch (error) {
    return toActionError(error, "We couldn't generate interview prep right now.");
  }
}

export async function generateAnswerFeedbackAction(
  input: unknown,
): Promise<DataActionResult<InterviewPrep>> {
  const user = await verifySession();

  const parsed = GenerateAnswerFeedbackInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That answer wasn't valid." };
  }

  const entitlement = await checkEntitlement(user.id, "INTERVIEW_PREP");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free interview coach runs this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const prep = await generateAnswerFeedback(
      user.id,
      parsed.data.interviewPrepId,
      parsed.data.question,
      parsed.data.userAnswer,
    );
    await consumeEntitlement(user.id, "INTERVIEW_PREP");
    await logAuditEvent("interview_answer_feedback.generated", {
      userId: user.id,
      metadata: { interviewPrepId: parsed.data.interviewPrepId },
    });
    return { status: "success", data: prep };
  } catch (error) {
    return toActionError(error, "We couldn't critique that answer right now.");
  }
}

export async function addInterviewNoteAction(
  input: unknown,
): Promise<DataActionResult<InterviewNote>> {
  const user = await verifySession();

  const parsed = AddInterviewNoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That note wasn't valid." };
  }

  try {
    const note = await addInterviewNote(user.id, parsed.data);
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: note };
  } catch (error) {
    return toActionError(error, "We couldn't save that note.");
  }
}

export async function upsertOfferAction(
  input: unknown,
): Promise<DataActionResult<Offer>> {
  const user = await verifySession();

  const parsed = UpsertOfferInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That offer wasn't valid." };
  }

  try {
    const offer = await upsertOffer(user.id, parsed.data);
    await logAuditEvent("offer.created", {
      userId: user.id,
      metadata: { opportunityId: parsed.data.opportunityId },
    });
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: offer };
  } catch (error) {
    return toActionError(error, "We couldn't save that offer.");
  }
}

export async function deleteOfferAction(
  input: unknown,
): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  const parsed = DeleteOfferInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await deleteOffer(user.id, parsed.data.opportunityId);
    await logAuditEvent("offer.deleted", {
      userId: user.id,
      metadata: { opportunityId: parsed.data.opportunityId },
    });
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't remove that offer.");
  }
}

export async function compareOffersAction(
  input: unknown,
): Promise<DataActionResult<OfferComparisonResult[]>> {
  const user = await verifySession();

  const parsed = CompareOffersInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Select at least 2 opportunities to compare." };
  }

  const entitlement = await checkEntitlement(user.id, "OFFER_COMPARISON");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free offer comparisons this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const results = await compareOffers(user.id, parsed.data.opportunityIds);
    await consumeEntitlement(user.id, "OFFER_COMPARISON");
    await logAuditEvent("offer_comparison.generated", {
      userId: user.id,
      metadata: { opportunityIds: parsed.data.opportunityIds },
    });
    return { status: "success", data: results };
  } catch (error) {
    return toActionError(error, "We couldn't compare those offers.");
  }
}
