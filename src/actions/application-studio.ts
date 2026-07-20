"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import {
  archiveApplicationDocument,
  createApplicationDocument,
  createApplicationDocumentVersion,
  deleteApplicationDocument,
  duplicateApplicationDocument,
  generateCompanySnapshot,
  restoreApplicationDocumentVersion,
  reviseApplicationDocument,
  runApplicationReview,
  saveApplicationDocumentDraft,
  unarchiveApplicationDocument,
} from "@/features/applications/service";
import { listApplicationDocumentVersions } from "@/features/applications/queries";
import {
  CreateApplicationDocumentVersionInputSchema,
  GenerateApplicationDocumentInputSchema,
  ReviseApplicationDocumentInputSchema,
  SaveApplicationDocumentDraftInputSchema,
} from "@/features/applications/schema";
import type {
  ApplicationDocument,
  ApplicationDocumentVersion,
  ApplicationReview,
  CompanySnapshot,
} from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";
import type { DataActionResult } from "@/types/action";

function toActionError(
  error: unknown,
  fallbackMessage: string,
): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("application_studio.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function generateApplicationDocumentAction(
  input: unknown,
): Promise<DataActionResult<ApplicationDocument>> {
  const user = await verifySession();

  const parsed = GenerateApplicationDocumentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  const entitlement = await checkEntitlement(user.id, "APPLICATION_DOCUMENT_GENERATION");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free AI document generations this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const document = await createApplicationDocument(parsed.data.opportunityId, user.id, {
      kind: parsed.data.kind,
      subtype: parsed.data.subtype,
      audience: parsed.data.audience,
      tone: parsed.data.tone,
      length: parsed.data.length,
    });

    await consumeEntitlement(user.id, "APPLICATION_DOCUMENT_GENERATION");
    await logAuditEvent("application_document.generated", {
      userId: user.id,
      metadata: { opportunityId: parsed.data.opportunityId, documentId: document.id, kind: document.kind },
    });
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: document };
  } catch (error) {
    return toActionError(error, "We couldn't generate that document.");
  }
}

export async function reviseApplicationDocumentAction(
  input: unknown,
): Promise<DataActionResult<ApplicationDocument>> {
  const user = await verifySession();

  const parsed = ReviseApplicationDocumentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  const entitlement = await checkEntitlement(user.id, "APPLICATION_DOCUMENT_GENERATION");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free AI document generations this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const document = await reviseApplicationDocument(
      parsed.data.documentId,
      user.id,
      parsed.data.action,
      parsed.data.tone,
    );

    await consumeEntitlement(user.id, "APPLICATION_DOCUMENT_GENERATION");
    await logAuditEvent("application_document.revised", {
      userId: user.id,
      metadata: { documentId: document.id, action: parsed.data.action },
    });
    revalidatePath(`/opportunities/${document.opportunityId}`);
    return { status: "success", data: document };
  } catch (error) {
    return toActionError(error, "We couldn't update that document.");
  }
}

export async function saveApplicationDocumentDraftAction(
  input: unknown,
): Promise<DataActionResult<{ savedAt: string }>> {
  const user = await verifySession();

  const parsed = SaveApplicationDocumentDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That content wasn't valid." };
  }

  try {
    await saveApplicationDocumentDraft(
      parsed.data.documentId,
      user.id,
      parsed.data.content,
      parsed.data.subjectLine,
    );
    return { status: "success", data: { savedAt: new Date().toISOString() } };
  } catch (error) {
    return toActionError(error, "We couldn't save your changes.");
  }
}

export async function listApplicationDocumentVersionsAction(
  documentId: string,
): Promise<DataActionResult<ApplicationDocumentVersion[]>> {
  const user = await verifySession();

  try {
    const versions = await listApplicationDocumentVersions(documentId, user.id);
    return { status: "success", data: versions };
  } catch (error) {
    return toActionError(error, "We couldn't load version history.");
  }
}

export async function createApplicationDocumentVersionAction(
  input: unknown,
): Promise<DataActionResult<ApplicationDocumentVersion>> {
  const user = await verifySession();

  const parsed = CreateApplicationDocumentVersionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Give this version a label." };
  }

  try {
    const version = await createApplicationDocumentVersion(
      parsed.data.documentId,
      user.id,
      parsed.data.label,
    );
    await logAuditEvent("application_document.version_created", {
      userId: user.id,
      metadata: { documentId: parsed.data.documentId, versionId: version.id },
    });
    return { status: "success", data: version };
  } catch (error) {
    return toActionError(error, "We couldn't save that version.");
  }
}

export async function restoreApplicationDocumentVersionAction(
  documentId: string,
  versionId: string,
): Promise<DataActionResult<ApplicationDocument>> {
  const user = await verifySession();

  try {
    const document = await restoreApplicationDocumentVersion(documentId, user.id, versionId);
    await logAuditEvent("application_document.version_restored", {
      userId: user.id,
      metadata: { documentId, versionId },
    });
    revalidatePath(`/opportunities/${document.opportunityId}`);
    return { status: "success", data: document };
  } catch (error) {
    return toActionError(error, "We couldn't restore that version.");
  }
}

export async function duplicateApplicationDocumentAction(
  documentId: string,
): Promise<DataActionResult<ApplicationDocument>> {
  const user = await verifySession();

  try {
    const document = await duplicateApplicationDocument(documentId, user.id);
    await logAuditEvent("application_document.duplicated", {
      userId: user.id,
      metadata: { sourceDocumentId: documentId, newDocumentId: document.id },
    });
    revalidatePath(`/opportunities/${document.opportunityId}`);
    return { status: "success", data: document };
  } catch (error) {
    return toActionError(error, "We couldn't duplicate that document.");
  }
}

export async function archiveApplicationDocumentAction(
  documentId: string,
  archived: boolean,
): Promise<DataActionResult<ApplicationDocument>> {
  const user = await verifySession();

  try {
    const document = archived
      ? await archiveApplicationDocument(documentId, user.id)
      : await unarchiveApplicationDocument(documentId, user.id);
    await logAuditEvent("application_document.archived", {
      userId: user.id,
      metadata: { documentId, archived },
    });
    revalidatePath(`/opportunities/${document.opportunityId}`);
    return { status: "success", data: document };
  } catch (error) {
    return toActionError(error, "We couldn't update that document.");
  }
}

export async function deleteApplicationDocumentAction(
  documentId: string,
  opportunityId: string,
): Promise<DataActionResult<{ deleted: true }>> {
  const user = await verifySession();

  try {
    await deleteApplicationDocument(documentId, user.id);
    await logAuditEvent("application_document.deleted", {
      userId: user.id,
      metadata: { documentId },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: { deleted: true } };
  } catch (error) {
    return toActionError(error, "We couldn't delete that document.");
  }
}

export async function generateCompanySnapshotAction(
  opportunityId: string,
): Promise<DataActionResult<CompanySnapshot>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "COMPANY_SNAPSHOT");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free company snapshots this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const snapshot = await generateCompanySnapshot(opportunityId, user.id);
    await consumeEntitlement(user.id, "COMPANY_SNAPSHOT");
    await logAuditEvent("company_snapshot.generated", {
      userId: user.id,
      metadata: { opportunityId },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: snapshot };
  } catch (error) {
    return toActionError(error, "We couldn't generate a company snapshot.");
  }
}

export async function runApplicationReviewAction(
  opportunityId: string,
): Promise<DataActionResult<ApplicationReviewOutput & Pick<ApplicationReview, "id" | "createdAt">>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "APPLICATION_REVIEW");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free application reviews this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const review = await runApplicationReview(opportunityId, user.id);
    await consumeEntitlement(user.id, "APPLICATION_REVIEW");
    await logAuditEvent("application_review.generated", {
      userId: user.id,
      metadata: { opportunityId, readinessScore: review.overallReadiness },
    });
    revalidatePath(`/opportunities/${opportunityId}`);
    return { status: "success", data: review };
  } catch (error) {
    return toActionError(error, "We couldn't run that review.");
  }
}
