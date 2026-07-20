"use server";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { generateCompanyResearch } from "@/features/companies/service";
import type { Company } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

export async function generateCompanyResearchAction(
  companyId: string,
): Promise<DataActionResult<Company>> {
  const user = await verifySession();

  const entitlement = await checkEntitlement(user.id, "COMPANY_RESEARCH");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free company research runs this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const company = await generateCompanyResearch(companyId);
    await consumeEntitlement(user.id, "COMPANY_RESEARCH");
    await logAuditEvent("company.research_generated", {
      userId: user.id,
      metadata: { companyId },
    });
    return { status: "success", data: company };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    logger.error("companies.action_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "We couldn't research that company right now." };
  }
}
