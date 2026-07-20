"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import {
  setCompanyDisposition,
  setListingDisposition,
  upsertConnectorPreference,
  upsertDiscoveryPreference,
} from "@/features/discovery/service";
import { countCompaniesRequiringSkills } from "@/features/discovery/queries";
import { runDiscovery, type DiscoveryRunSummary } from "@/features/discovery/run-discovery";
import {
  ConnectorPreferenceInputSchema,
  DiscoveryPreferenceInputSchema,
  SetCompanyDispositionInputSchema,
  SetListingDispositionInputSchema,
} from "@/features/discovery/schema";
import type {
  ConnectorPreference,
  DiscoveredCompany,
  DiscoveredListing,
  DiscoveryPreference,
} from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("discovery.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/** Sprint 9, Module 8 — "N companies unlock if you learn X." Purely
 * code-computed from the user's own already-stored discovered listings
 * (see `countCompaniesRequiringSkills`'s doc comment), no AI call and no
 * entitlement gate needed. */
export async function getSkillUnlockCountsAction(
  skills: string[],
): Promise<DataActionResult<Record<string, number>>> {
  const user = await verifySession();

  try {
    const counts = await countCompaniesRequiringSkills(user.id, skills);
    return { status: "success", data: counts };
  } catch (error) {
    return toActionError(error, "We couldn't compute companies unlocked by these skills.");
  }
}

export async function updateDiscoveryPreferenceAction(
  input: unknown,
): Promise<DataActionResult<DiscoveryPreference>> {
  const user = await verifySession();

  const parsed = DiscoveryPreferenceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Some of those preferences weren't valid." };
  }

  try {
    const preference = await upsertDiscoveryPreference(user.id, parsed.data);
    await logAuditEvent("discovery.preferences_updated", { userId: user.id });
    revalidatePath("/opportunities/discovery");
    return { status: "success", data: preference };
  } catch (error) {
    return toActionError(error, "We couldn't save your discovery preferences.");
  }
}

export async function updateConnectorPreferenceAction(
  input: unknown,
): Promise<DataActionResult<ConnectorPreference>> {
  const user = await verifySession();

  const parsed = ConnectorPreferenceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That connector preference wasn't valid." };
  }

  try {
    const preference = await upsertConnectorPreference(user.id, parsed.data);
    await logAuditEvent("discovery.connector_preference_updated", {
      userId: user.id,
      metadata: { connectorId: parsed.data.connectorId },
    });
    revalidatePath("/opportunities/discovery");
    return { status: "success", data: preference };
  } catch (error) {
    return toActionError(error, "We couldn't update that connector.");
  }
}

export async function setListingDispositionAction(
  input: unknown,
): Promise<DataActionResult<DiscoveredListing>> {
  const user = await verifySession();

  const parsed = SetListingDispositionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    const listing = await setListingDisposition(
      parsed.data.listingId,
      user.id,
      parsed.data.disposition,
    );
    await logAuditEvent("discovery.listing_disposition_changed", {
      userId: user.id,
      metadata: { listingId: parsed.data.listingId, disposition: parsed.data.disposition },
    });
    revalidatePath("/opportunities/discovery");
    return { status: "success", data: listing };
  } catch (error) {
    return toActionError(error, "We couldn't update that listing.");
  }
}

export async function setCompanyDispositionAction(
  input: unknown,
): Promise<DataActionResult<DiscoveredCompany>> {
  const user = await verifySession();

  const parsed = SetCompanyDispositionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    const company = await setCompanyDisposition(
      parsed.data.companyId,
      user.id,
      parsed.data.disposition,
    );
    await logAuditEvent("discovery.company_disposition_changed", {
      userId: user.id,
      metadata: { companyId: parsed.data.companyId, disposition: parsed.data.disposition },
    });
    revalidatePath("/opportunities/discovery");
    return { status: "success", data: company };
  } catch (error) {
    return toActionError(error, "We couldn't update that company.");
  }
}

/** "Discover now" — the manual trigger (Module 9's user control), gated
 * exactly like the scheduled cron path so a user can't bypass their plan's
 * monthly run limit by only ever triggering manually. */
export async function runDiscoveryNowAction(): Promise<DataActionResult<DiscoveryRunSummary>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "JOB_DISCOVERY_RUN");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free discovery runs this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    await logAuditEvent("discovery.run_started", { userId: user.id, metadata: { trigger: "MANUAL" } });
    const summary = await runDiscovery(user.id, "MANUAL");
    await consumeEntitlement(user.id, "JOB_DISCOVERY_RUN");
    await logAuditEvent("discovery.run_completed", {
      userId: user.id,
      metadata: { runId: summary.runId, jobsFound: summary.jobsFound, newJobsFound: summary.newJobsFound },
    });
    revalidatePath("/opportunities/discovery");
    return { status: "success", data: summary };
  } catch (error) {
    await logAuditEvent("discovery.run_failed", {
      userId: user.id,
      metadata: { message: error instanceof Error ? error.message : String(error) },
    });
    return toActionError(error, "We couldn't run discovery right now.");
  }
}
