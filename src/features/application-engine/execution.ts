import "server-only";

import { recordAutomatedApplicationSubmission } from "@/features/applications/service";
import { exponentialBackoff, withRetry } from "@/features/automation/policies";
import type { JobConnector } from "@/features/connectors/contracts";
import { clientEnv } from "@/lib/env.client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getLatestParsedResume } from "@/features/resume/queries";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import type { ApplicationExecution, ApplicationExecutionStatus, ApprovalPolicy, Opportunity, Prisma } from "@/generated/prisma/client";

import { evaluateApprovalPolicy } from "./approval-policy";
import { validateConnectorCapabilities } from "./connector-capabilities";
import { selectOrGenerateCoverLetter } from "./cover-letter";
import type { ApplicationDecision } from "./decision-engine";
import { planQuestionnaire } from "./questionnaire";
import type { QueuedQuestionnaireAnswer } from "./questionnaire";
import { selectOrTailorResumeVersion } from "./resume-selection";
import { attemptConnectorSubmission } from "./submission";

const SUBMISSION_RETRY_POLICY = { maxAttempts: 2, backoffMs: exponentialBackoff(2000) };

export interface ApplicationExecutionRunResult {
  status: ApplicationExecutionStatus;
}

/**
 * One upsert per real status transition — the only writer of
 * `ApplicationExecution`, mirroring `Interview.stageHistory`'s exact
 * append-only convention (`transitionInterviewStage`/
 * `transitionMeetingStatus`). One row per opportunity (`@@unique`): a
 * re-run always updates the *same* row rather than creating a duplicate,
 * so `statusHistory` accumulates the row's full real lifecycle.
 */
async function persistStatus(
  opportunityId: string,
  status: ApplicationExecutionStatus,
  reason: string,
  data: Partial<Prisma.ApplicationExecutionUncheckedCreateInput> = {},
): Promise<ApplicationExecution> {
  const existing = await prisma.applicationExecution.findUnique({ where: { opportunityId } });
  const history = (existing?.statusHistory as { status: string; changedAt: string }[]) ?? [];
  const statusHistory = [...history, { status, changedAt: new Date().toISOString() }] as unknown as Prisma.InputJsonValue;

  return prisma.applicationExecution.upsert({
    where: { opportunityId },
    create: {
      opportunityId,
      status,
      statusHistory,
      executionReason: reason,
      approvalPolicySnapshot: (data.approvalPolicySnapshot as ApprovalPolicy) ?? "ALWAYS_ASK",
      ...data,
    },
    update: { status, statusHistory, executionReason: reason, ...data },
  });
}

/**
 * The Autonomous Application Engine's per-opportunity execution walker —
 * Sprint 18's one pipeline: Connector Capability Check → Resume Selection
 * → Resume Tailoring → Cover Letter → Questionnaire Preparation →
 * Approval Decision → Connector Apply → Submission Tracking. Called by
 * `application-orchestrator.ts` for every candidate that already passed
 * the Decision Engine + AI review — never a second entry point, never
 * called directly by anything else.
 *
 * Every stage before the capability check is real regardless of connector
 * state; every stage after it is real code that has never actually run
 * end-to-end in this codebase, because `validateConnectorCapabilities`
 * has never once returned `ok: true` — no registered connector supports
 * Easy Apply (Hard Lock: "If a connector cannot officially apply, the
 * engine must stop at 'Manual Review Required'"). That's exactly what
 * every real run of this function does today.
 */
export async function runApplicationExecution(
  row: PriorityQueueRow,
  decision: ApplicationDecision,
  userId: string,
  approvalPolicy: ApprovalPolicy,
): Promise<ApplicationExecutionRunResult> {
  const { opportunity } = row;

  await persistStatus(opportunity.id, "STARTED", "Autonomous Application Engine began evaluating this opportunity.", {
    approvalPolicySnapshot: approvalPolicy,
  });

  const customQuestions = (opportunity.customQuestions as unknown as { answer: string }[]) ?? [];
  const needsQuestionnaire = customQuestions.some((question) => !question.answer.trim());

  const capability = await validateConnectorCapabilities(opportunity, userId, { needsQuestionnaire });
  const capabilityReason = capability.reasons.join(" ");

  if (!capability.ok) {
    await persistStatus(opportunity.id, "MANUAL_REQUIRED", capabilityReason, {
      connectorId: capability.connector?.id ?? null,
      approvalPolicySnapshot: approvalPolicy,
      requiresApproval: true,
    });
    return { status: "MANUAL_REQUIRED" };
  }

  await persistStatus(opportunity.id, "VALIDATED", capabilityReason, {
    connectorId: capability.connector!.id,
    connectorProvider: capability.connection ? capability.connection.provider : null,
    approvalPolicySnapshot: approvalPolicy,
  });

  const resume = await getLatestParsedResume(userId);
  if (!resume?.rawText) {
    await persistStatus(opportunity.id, "MANUAL_REQUIRED", "No parsed resume on file to apply with.", {
      approvalPolicySnapshot: approvalPolicy,
      requiresApproval: true,
    });
    return { status: "MANUAL_REQUIRED" };
  }

  const [resumeSelection, coverLetter, questionnaireAnswers] = await Promise.all([
    selectOrTailorResumeVersion(opportunity, userId),
    selectOrGenerateCoverLetter(opportunity, resume.rawText),
    needsQuestionnaire ? planQuestionnaire(opportunity, resume.rawText) : Promise.resolve([]),
  ]);

  const approval = evaluateApprovalPolicy({ policy: approvalPolicy, tier: decision.tier, capabilityOk: capability.ok });

  if (approval.requiresApproval) {
    await persistStatus(opportunity.id, "WAITING_APPROVAL", approval.reason, {
      resumeVersionId: resumeSelection.resumeVersionId,
      coverLetterDocumentId: coverLetter.documentId,
      questionnaireAnswers: questionnaireAnswers as unknown as Prisma.InputJsonValue,
      approvalPolicySnapshot: approvalPolicy,
      requiresApproval: true,
    });
    return { status: "WAITING_APPROVAL" };
  }

  await persistStatus(opportunity.id, "APPROVED", approval.reason, {
    resumeVersionId: resumeSelection.resumeVersionId,
    coverLetterDocumentId: coverLetter.documentId,
    questionnaireAnswers: questionnaireAnswers as unknown as Prisma.InputJsonValue,
    approvalPolicySnapshot: approvalPolicy,
    requiresApproval: false,
    approvedAt: new Date(),
    approvedBy: "POLICY",
  });

  return submitApprovedExecution(opportunity, capability.connector!, resumeSelection.resumeVersionId, coverLetter.documentId, questionnaireAnswers);
}

/** Records that a human declined a `WAITING_APPROVAL` execution — real
 * Human Approval, the negative case. `BLOCKED` (not `MANUAL_REQUIRED`)
 * since the reason it isn't proceeding is a real user decision, not a
 * capability gap. Called only by `declineApplicationExecutionAction`
 * (`actions/application-automation.ts`). */
export async function declineApplicationExecution(opportunityId: string): Promise<ApplicationExecution> {
  return persistStatus(opportunityId, "BLOCKED", "Declined by user.");
}

/** Records the real human-approval decision itself before handing off to
 * `submitApprovedExecution` — called only by
 * `approveApplicationExecutionAction`. */
export async function approveApplicationExecution(execution: ApplicationExecution): Promise<void> {
  await persistStatus(execution.opportunityId, "APPROVED", "Approved by user.", {
    requiresApproval: false,
    approvedAt: new Date(),
    approvedBy: "USER",
  });
}

/**
 * The Connector Apply + Submission Tracking stages — shared by the
 * auto-approved path above and by `approveApplicationExecutionAction`
 * (`actions/application-automation.ts`) when a human clicks Approve on a
 * `WAITING_APPROVAL` execution. Retries via the Automation Engine's own
 * `withRetry`/`exponentialBackoff` (`features/automation/policies.ts`) —
 * no second retry implementation, per this sprint's explicit rule.
 *
 * Real, disclosed gap: `resumeFileUrl` is built from this app's own
 * authenticated PDF export route — it has never been verified against a
 * real external connector, since none exists to receive it. A real
 * Easy-Apply connector may need a signed/public URL instead of this
 * app's session-authenticated one; that's real follow-up work for
 * whoever registers the first one, not something fabricated as "solved"
 * here.
 */
export async function submitApprovedExecution(
  opportunity: Opportunity,
  connector: JobConnector,
  resumeVersionId: string | null,
  coverLetterDocumentId: string | null,
  questionnaireAnswers: QueuedQuestionnaireAnswer[],
): Promise<ApplicationExecutionRunResult> {
  const resumeVersion = resumeVersionId
    ? await prisma.resumeVersion.findUnique({ where: { id: resumeVersionId }, select: { resumeId: true } })
    : null;
  const resumeFileUrl = resumeVersion
    ? `${clientEnv.NEXT_PUBLIC_APP_URL}/resume/${resumeVersion.resumeId}/export/pdf`
    : "";

  const coverLetterDocument = coverLetterDocumentId
    ? await prisma.applicationDocument.findUnique({ where: { id: coverLetterDocumentId }, select: { content: true } })
    : null;

  const answers = Object.fromEntries(questionnaireAnswers.map((answer) => [answer.questionId, answer.suggestedAnswer]));

  try {
    const attempt = await withRetry(
      () => attemptConnectorSubmission(connector, opportunity, resumeFileUrl, coverLetterDocument?.content ?? null, answers),
      SUBMISSION_RETRY_POLICY,
    );

    if (!attempt.success) {
      await persistStatus(opportunity.id, "FAILED", attempt.failureReason ?? "Submission failed.", {
        failureReason: attempt.failureReason,
      });
      return { status: "FAILED" };
    }

    // Two distinct, real transitions — SUBMITTED the moment the connector
    // confirms, COMPLETED once CareerOS finishes its own bookkeeping
    // (`ApplicationSubmission`, opportunity status). Both timestamps are
    // real, not simultaneous by construction.
    await persistStatus(opportunity.id, "SUBMITTED", "Connector confirmed the submission.", {
      submittedAt: new Date(),
    });

    const submission = await recordAutomatedApplicationSubmission({
      opportunityId: opportunity.id,
      resumeVersionId,
      coverLetterDocumentId,
      externalApplicationId: attempt.externalApplicationId,
    });

    await persistStatus(opportunity.id, "COMPLETED", "Application submitted successfully.", {
      applicationSubmissionId: submission.id,
      submittedAt: new Date(),
      completedAt: new Date(),
    });
    return { status: "COMPLETED" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("application_engine.submission_failed", { opportunityId: opportunity.id, message });
    await persistStatus(opportunity.id, "FAILED", message, { failureReason: message });
    return { status: "FAILED" };
  }
}
