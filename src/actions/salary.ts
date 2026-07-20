"use server";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { generateSalaryEstimate } from "@/features/salary/service";
import { GenerateSalaryEstimateInputSchema } from "@/features/salary/schema";
import type { SalaryEstimate } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

/** Persisted Salary Intelligence run — distinct from `getSalaryEstimateAction`
 * (`src/actions/dashboard.ts`), which stays a free, ephemeral, unmetered
 * dashboard-card preview. This one is what feeds Career Health and the
 * unified Career Timeline, so it's entitlement-gated and durable. */
export async function generateSalaryEstimateAction(
  input: unknown,
): Promise<DataActionResult<SalaryEstimate>> {
  const user = await verifySession();

  const parsed = GenerateSalaryEstimateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Enter a role and location to estimate salary." };
  }

  const entitlement = await checkEntitlement(user.id, "SALARY_ESTIMATE");
  if (!entitlement.allowed) {
    return {
      status: "error",
      message: `You've used all ${entitlement.limit} free salary estimates this month. This resets monthly — the Pro plan removes the limit.`,
    };
  }

  try {
    const estimate = await generateSalaryEstimate(user.id, parsed.data);
    await consumeEntitlement(user.id, "SALARY_ESTIMATE");
    await logAuditEvent("salary_estimate.generated", {
      userId: user.id,
      metadata: { role: parsed.data.role, location: parsed.data.location },
    });
    return { status: "success", data: estimate };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    logger.error("salary.action_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "We couldn't generate a salary estimate right now." };
  }
}
