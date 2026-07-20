"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { toLinkedInAnalysisOutput } from "@/features/linkedin-profile/format";
import type { LinkedInAnalysisOutput } from "@/features/linkedin-profile/format";
import {
  createLinkedInProfileVersion,
  restoreLinkedInProfileVersion,
  upsertLinkedInProfile,
  analyzeLinkedInProfile as analyzeLinkedInProfileService,
} from "@/features/linkedin-profile/service";
import { LinkedInProfileInputSchema } from "@/features/linkedin-profile/schema";
import type { LinkedInProfile, LinkedInProfileVersion } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("linkedin_profile.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function updateLinkedInProfileAction(
  input: unknown,
): Promise<DataActionResult<LinkedInProfile>> {
  const user = await verifySession();

  const parsed = LinkedInProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That profile text or target role wasn't valid." };
  }

  try {
    const profile = await upsertLinkedInProfile(user.id, parsed.data);
    await logAuditEvent("linkedin_profile.updated", { userId: user.id });
    revalidatePath("/dashboard");
    return { status: "success", data: profile };
  } catch (error) {
    return toActionError(error, "We couldn't save your LinkedIn profile.");
  }
}

/** Sprint 10, Module 1 — the full LinkedIn SEO Intelligence run: SEO
 * score, recruiter visibility, missing keywords/sections, headline/about/
 * experience suggestions, all in one metered action. */
export async function analyzeLinkedInProfileAction(
  profileId: string,
): Promise<DataActionResult<LinkedInAnalysisOutput>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "LINKEDIN_ANALYSIS");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free LinkedIn analyses this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const { row, madeAiCalls } = await analyzeLinkedInProfileService(user.id, profileId);
    // A cache hit (nothing changed since the last full analysis, or
    // nothing was left to retry) makes zero AI calls — don't charge the
    // user's monthly quota for a result they already had.
    if (madeAiCalls) {
      await consumeEntitlement(user.id, "LINKEDIN_ANALYSIS");
      await logAuditEvent("linkedin_analysis.generated", {
        userId: user.id,
        metadata: { seoScore: row.seoScore, recruiterVisibilityScore: row.recruiterVisibilityScore },
      });
    }
    revalidatePath("/dashboard");
    return { status: "success", data: toLinkedInAnalysisOutput(row) };
  } catch (error) {
    return toActionError(error, "We couldn't analyze your LinkedIn profile.");
  }
}

export async function createLinkedInProfileVersionAction(
  label: string,
): Promise<DataActionResult<LinkedInProfileVersion>> {
  const user = await verifySession();

  // No label required — same "defaults to Untitled version" convention
  // as the Resume Studio's identical Save-a-version action.
  const trimmedLabel = label.trim() || "Untitled version";

  try {
    const version = await createLinkedInProfileVersion(user.id, trimmedLabel);
    await logAuditEvent("linkedin_profile.version_created", { userId: user.id });
    revalidatePath("/dashboard");
    return { status: "success", data: version };
  } catch (error) {
    return toActionError(error, "We couldn't save that version.");
  }
}

export async function restoreLinkedInProfileVersionAction(
  versionId: string,
): Promise<DataActionResult<LinkedInProfile>> {
  const user = await verifySession();

  try {
    const profile = await restoreLinkedInProfileVersion(user.id, versionId);
    await logAuditEvent("linkedin_profile.version_restored", { userId: user.id, metadata: { versionId } });
    revalidatePath("/dashboard");
    return { status: "success", data: profile };
  } catch (error) {
    return toActionError(error, "We couldn't restore that version.");
  }
}
