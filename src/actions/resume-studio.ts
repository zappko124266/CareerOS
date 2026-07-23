"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { getOwnedResumeOrThrow } from "@/features/resume/queries";
import {
  createResumeVersion,
  restoreResumeVersion,
  saveResumeDraft,
} from "@/features/resume/service";
import { ResumeDataSchema } from "@/features/resume/schema";
import { tailorResumeAction } from "@/features/career-intelligence/resume/tailoring/actions";
import { analyzeResumeKeywordsAction } from "@/features/career-intelligence/resume/keyword-analysis/actions";
import { analyzeResumeAction } from "@/features/career-intelligence/resume/resume-analysis/actions";
import { analyzeResumeStrengthsAction } from "@/features/career-intelligence/resume/strength-analysis/actions";
import { analyzeResumeWeaknessesAction } from "@/features/career-intelligence/resume/weakness-analysis/actions";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";
import type { ResumeTailoringOutput } from "@/features/career-intelligence/resume/tailoring/types";
import type { ResumeKeywordAnalysisOutput } from "@/features/career-intelligence/resume/keyword-analysis/types";
import type { ResumeAnalysisOutput } from "@/features/career-intelligence/resume/resume-analysis/types";
import type { ResumeStrengthAnalysisOutput } from "@/features/career-intelligence/resume/strength-analysis/types";
import type { ResumeWeaknessAnalysisOutput } from "@/features/career-intelligence/resume/weakness-analysis/types";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import type { Resume, ResumeVersion } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(
  error: unknown,
  fallbackMessage: string,
): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("resume_studio.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/** This resume specifically (not "the user's latest resume", like the
 * dashboard's helper) — Resume Studio operates on whichever resume the
 * user opened, which may not be their most recent upload. Ownership is
 * enforced by `getOwnedResumeOrThrow` regardless. */
async function getOwnedResumeTextOrError(
  resumeId: string,
  userId: string,
): Promise<{ resumeText: string } | { error: DataActionResult<never> }> {
  const resume = await getOwnedResumeOrThrow(resumeId, userId);

  if (resume.status !== "PARSED" || !resume.rawText) {
    return {
      error: {
        status: "error",
        message: "This resume needs to finish parsing before AI features can use it.",
      },
    };
  }

  return { resumeText: resume.rawText };
}

export async function saveResumeDraftAction(
  resumeId: string,
  data: unknown,
): Promise<DataActionResult<{ savedAt: string }>> {
  const user = await verifySession();

  const parsed = ResumeDataSchema.safeParse(data);
  if (!parsed.success) {
    return { status: "error", message: "That resume content wasn't valid." };
  }

  try {
    await saveResumeDraft(resumeId, user.id, parsed.data);
    return { status: "success", data: { savedAt: new Date().toISOString() } };
  } catch (error) {
    return toActionError(error, "We couldn't save your changes.");
  }
}

export async function createResumeVersionAction(
  resumeId: string,
  label: string,
  target?: { opportunityId: string; companyName: string },
): Promise<DataActionResult<ResumeVersion>> {
  const user = await verifySession();

  const trimmedLabel = label.trim() || "Untitled version";

  try {
    const version = await createResumeVersion(resumeId, user.id, trimmedLabel, target);
    await logAuditEvent("resume.version_created", {
      userId: user.id,
      metadata: { resumeId, versionId: version.id, targetOpportunityId: target?.opportunityId },
    });
    revalidatePath(`/resume/${resumeId}/studio`);
    return { status: "success", data: version };
  } catch (error) {
    return toActionError(error, "We couldn't save that version.");
  }
}

export async function restoreResumeVersionAction(
  resumeId: string,
  versionId: string,
): Promise<DataActionResult<Resume>> {
  const user = await verifySession();

  try {
    const resume = await restoreResumeVersion(resumeId, user.id, versionId);
    await logAuditEvent("resume.version_restored", {
      userId: user.id,
      metadata: { resumeId, versionId },
    });
    revalidatePath(`/resume/${resumeId}/studio`);
    return { status: "success", data: resume };
  } catch (error) {
    return toActionError(error, "We couldn't restore that version.");
  }
}

export async function tailorResumeStudioAction(
  resumeId: string,
  targetJobDescription: string,
  bullets: { id: string; text: string }[],
): Promise<AnalysisActionResult<ResumeTailoringOutput>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "RESUME_TAILORING");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free AI tailoring runs this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  const resumeResult = await getOwnedResumeTextOrError(resumeId, user.id);
  if ("error" in resumeResult) return resumeResult.error;

  if (!targetJobDescription.trim()) {
    return { status: "error", message: "Paste a job description to tailor against." };
  }

  if (bullets.length === 0) {
    return { status: "error", message: "Add at least one experience bullet to tailor." };
  }

  const result = await tailorResumeAction({
    resumeText: resumeResult.resumeText,
    targetJobDescription: targetJobDescription.trim(),
    bullets,
  });

  if (result.status === "success") {
    await consumeEntitlement(user.id, "RESUME_TAILORING");
    await logAuditEvent("resume.tailoring_generated", {
      userId: user.id,
      metadata: { resumeId },
    });
  }

  return result;
}

export async function getResumeKeywordAnalysisAction(
  resumeId: string,
  targetJobDescription: string,
): Promise<AnalysisActionResult<ResumeKeywordAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getOwnedResumeTextOrError(resumeId, user.id);
  if ("error" in resumeResult) return resumeResult.error;

  if (!targetJobDescription.trim()) {
    return { status: "error", message: "Paste a job description to compare against." };
  }

  return analyzeResumeKeywordsAction({
    resumeText: resumeResult.resumeText,
    targetJobDescription: targetJobDescription.trim(),
  });
}

export async function getResumeOverallAnalysisAction(
  resumeId: string,
): Promise<AnalysisActionResult<ResumeAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getOwnedResumeTextOrError(resumeId, user.id);
  if ("error" in resumeResult) return resumeResult.error;

  return analyzeResumeAction({ resumeText: resumeResult.resumeText });
}

export async function getResumeStrengthsAction(
  resumeId: string,
): Promise<AnalysisActionResult<ResumeStrengthAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getOwnedResumeTextOrError(resumeId, user.id);
  if ("error" in resumeResult) return resumeResult.error;

  return analyzeResumeStrengthsAction({ resumeText: resumeResult.resumeText });
}

export async function getResumeWeaknessesAction(
  resumeId: string,
): Promise<AnalysisActionResult<ResumeWeaknessAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getOwnedResumeTextOrError(resumeId, user.id);
  if ("error" in resumeResult) return resumeResult.error;

  return analyzeResumeWeaknessesAction({ resumeText: resumeResult.resumeText });
}
