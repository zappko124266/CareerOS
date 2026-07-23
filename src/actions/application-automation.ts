"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import {
  generateApplicationStrategy,
  generateExperienceGapAssessment,
  generateFollowUpRecommendation,
  recordApplicationSubmission,
  recordFailedSubmission,
} from "@/features/applications/service";
import type { FollowUpRecommendationResult } from "@/features/applications/service";
import type {
  ApplicationStrategyOutput,
  ExperienceGapAssessmentOutput,
} from "@/features/applications/format";
import {
  RecordApplicationSubmissionInputSchema,
  RecordFailedSubmissionInputSchema,
} from "@/features/applications/schema";
import { getConnector } from "@/features/connectors/registry";
import {
  approveApplicationExecution,
  declineApplicationExecution,
  submitApprovedExecution,
} from "@/features/application-engine/execution";
import { getOwnedApplicationExecutionOrThrow } from "@/features/application-engine/queries";
import { DB_SOURCE_TO_PROVIDER } from "@/features/opportunities/types";
import { prisma } from "@/lib/prisma";
import type { ApplicationExecution, ApplicationSubmission, ApprovalPolicy } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("application_automation.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/** Module 2/3 — Smart Application Strategy (which also runs Smart Resume
 * Selection internally). Metered same as other AI Application Studio
 * features. */
export async function generateApplicationStrategyAction(
  opportunityId: string,
): Promise<DataActionResult<ApplicationStrategyOutput>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "APPLICATION_STRATEGY");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free application strategies this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const strategy = await generateApplicationStrategy(opportunityId, user.id);
    await consumeEntitlement(user.id, "APPLICATION_STRATEGY");
    await logAuditEvent("application_strategy.generated", {
      userId: user.id,
      metadata: { opportunityId, confidence: strategy.confidence },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: strategy };
  } catch (error) {
    return toActionError(error, "We couldn't generate an application strategy.");
  }
}

/** Sprint 9, Module 8 — Career Gap Engine for one opportunity. Persists a
 * new `ExperienceGapAssessment` row each run — same metering/audit
 * pattern as the Strategy action above. */
export async function generateExperienceGapAssessmentAction(
  opportunityId: string,
): Promise<DataActionResult<ExperienceGapAssessmentOutput>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "CAREER_GAP_ASSESSMENT");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free career gap assessments this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const assessment = await generateExperienceGapAssessment(opportunityId, user.id);
    await consumeEntitlement(user.id, "CAREER_GAP_ASSESSMENT");
    await logAuditEvent("career_gap_assessment.generated", {
      userId: user.id,
      metadata: { opportunityId, overallReadiness: assessment.overallReadiness },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: assessment };
  } catch (error) {
    return toActionError(error, "We couldn't generate a career gap assessment.");
  }
}

/** Module 9 — AI Follow-up Engine. */
export async function generateFollowUpRecommendationAction(
  opportunityId: string,
): Promise<DataActionResult<FollowUpRecommendationResult>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "FOLLOW_UP_RECOMMENDATION");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free follow-up recommendations this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const recommendation = await generateFollowUpRecommendation(opportunityId, user.id);
    await consumeEntitlement(user.id, "FOLLOW_UP_RECOMMENDATION");
    await logAuditEvent("follow_up.recommendation_generated", {
      userId: user.id,
      metadata: { opportunityId, recommendationType: recommendation.recommendationType },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: recommendation };
  } catch (error) {
    return toActionError(error, "We couldn't generate a follow-up recommendation.");
  }
}

/** Module 7 — Submission Engine. Records that the user completed an
 * application themselves (company career page / email / listing link) and
 * confirmed it back to CareerOS — never an automated submission. Not
 * entitlement-gated: it's a user-confirmed record of their own action, not
 * an AI generation. */
export async function recordApplicationSubmissionAction(
  input: unknown,
): Promise<DataActionResult<ApplicationSubmission>> {
  const user = await verifySession();

  const parsed = RecordApplicationSubmissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That submission wasn't valid." };
  }

  try {
    const submission = await recordApplicationSubmission(
      parsed.data.opportunityId,
      user.id,
      parsed.data,
    );
    await logAuditEvent("application_submission.recorded", {
      userId: user.id,
      metadata: { opportunityId: parsed.data.opportunityId, method: parsed.data.method },
    });
    await logAuditEvent("opportunity.status_changed", {
      userId: user.id,
      metadata: { opportunityId: parsed.data.opportunityId, status: "APPLIED" },
    });
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    revalidatePath("/opportunities");
    return { status: "success", data: submission };
  } catch (error) {
    return toActionError(error, "We couldn't record that submission.");
  }
}

export async function recordFailedSubmissionAction(
  input: unknown,
): Promise<DataActionResult<ApplicationSubmission>> {
  const user = await verifySession();

  const parsed = RecordFailedSubmissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    const submission = await recordFailedSubmission(
      parsed.data.submissionId,
      user.id,
      parsed.data.failureReason,
    );
    await logAuditEvent("application_submission.failed", {
      userId: user.id,
      metadata: { submissionId: parsed.data.submissionId, failureReason: parsed.data.failureReason },
    });
    revalidatePath(`/opportunities/${submission.opportunityId}`);
    return { status: "success", data: submission };
  } catch (error) {
    return toActionError(error, "We couldn't update that submission.");
  }
}

// ---------------------------------------------------------------------------
// Autonomous Application Engine — Human Approval (Sprint 18)
// ---------------------------------------------------------------------------

function isOwnedByExpectedStatus(execution: ApplicationExecution): DataActionResult<never> | null {
  if (execution.status !== "WAITING_APPROVAL") {
    return { status: "error", message: "This application isn't waiting for approval anymore." };
  }
  return null;
}

/** The real Human Approval "yes" — verifies ownership and status, records
 * the approval (`approveApplicationExecution`), then hands off to the
 * *same* Connector Apply + Submission Tracking stages the auto-approved
 * path uses (`submitApprovedExecution`) — no second submission path. */
export async function approveApplicationExecutionAction(
  executionId: string,
): Promise<DataActionResult<{ status: ApplicationExecution["status"] }>> {
  const user = await verifySession();

  try {
    const execution = await getOwnedApplicationExecutionOrThrow(executionId, user.id);
    const statusError = isOwnedByExpectedStatus(execution);
    if (statusError) return statusError;

    const connectorId = DB_SOURCE_TO_PROVIDER[execution.opportunity.source];
    const connector = connectorId ? getConnector(connectorId) : undefined;
    if (!connector) {
      return { status: "error", message: "No connector is available to submit this application." };
    }

    await approveApplicationExecution(execution);
    await logAuditEvent("application_execution.approved", {
      userId: user.id,
      metadata: { executionId, opportunityId: execution.opportunityId },
    });

    const questionnaireAnswers = (execution.questionnaireAnswers ?? []) as {
      questionId: string;
      question: string;
      suggestedAnswer: string;
    }[];

    const result = await submitApprovedExecution(
      execution.opportunity,
      connector,
      execution.resumeVersionId,
      execution.coverLetterDocumentId,
      questionnaireAnswers,
    );

    revalidatePath("/applications");
    revalidatePath(`/opportunities/${execution.opportunityId}`);
    return { status: "success", data: { status: result.status } };
  } catch (error) {
    return toActionError(error, "We couldn't approve that application.");
  }
}

/** The real Human Approval "no." */
export async function declineApplicationExecutionAction(
  executionId: string,
): Promise<DataActionResult<{ status: ApplicationExecution["status"] }>> {
  const user = await verifySession();

  try {
    const execution = await getOwnedApplicationExecutionOrThrow(executionId, user.id);
    const statusError = isOwnedByExpectedStatus(execution);
    if (statusError) return statusError;

    const updated = await declineApplicationExecution(execution.opportunityId);
    await logAuditEvent("application_execution.declined", {
      userId: user.id,
      metadata: { executionId, opportunityId: execution.opportunityId },
    });

    revalidatePath("/applications");
    return { status: "success", data: { status: updated.status } };
  } catch (error) {
    return toActionError(error, "We couldn't decline that application.");
  }
}

/** Human Approval's configurable policy (`Profile.applicationApprovalPolicy`) —
 * "Always Ask" / "Ask For High Priority" / "Auto Apply Low Risk" / "Never
 * Auto Apply." */
export async function updateApprovalPolicyAction(
  policy: ApprovalPolicy,
): Promise<DataActionResult<{ policy: ApprovalPolicy }>> {
  const user = await verifySession();

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: { applicationApprovalPolicy: policy },
    });
    await logAuditEvent("application_approval_policy.updated", {
      userId: user.id,
      metadata: { policy },
    });
    revalidatePath("/settings");
    revalidatePath("/applications");
    return { status: "success", data: { policy } };
  } catch (error) {
    return toActionError(error, "We couldn't update your approval policy.");
  }
}
