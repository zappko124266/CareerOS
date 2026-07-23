import "server-only";

import type { JobConnector } from "@/features/connectors/contracts";
import type { NormalizedApplicationResult } from "@/features/connectors/types";
import { logger } from "@/lib/logger";
import type { Opportunity } from "@/generated/prisma/client";

export interface SubmissionAttemptResult {
  success: boolean;
  externalApplicationId: string | null;
  failureReason: string | null;
}

/**
 * The only place in this codebase that calls `JobConnector.apply()` for
 * an automated submission. Hard Lock "no fabricated submission success":
 * `success` is only ever `true` when the connector's own real
 * `NormalizedApplicationResult.status === "CONFIRMED"` — a `PENDING` or
 * `FAILED` result, or a thrown error, both map to `success: false`, never
 * assumed otherwise. Only reachable once a real connector sets
 * `capabilities.supportsEasyApply: true` (none do today — see
 * `docs/connectors/CONNECTOR_CAPABILITY_MATRIX.md` — so this function has
 * never actually executed against a real API in this codebase's history).
 */
export async function attemptConnectorSubmission(
  connector: JobConnector,
  opportunity: Opportunity,
  resumeFileUrl: string,
  coverLetterText: string | null,
  answers: Record<string, string>,
): Promise<SubmissionAttemptResult> {
  let result: NormalizedApplicationResult;

  try {
    result = await connector.apply({
      jobId: opportunity.sourceId,
      resumeFileUrl,
      coverLetterText,
      answers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("application_engine.connector_apply_failed", {
      opportunityId: opportunity.id,
      connectorId: connector.id,
      message,
    });
    return { success: false, externalApplicationId: null, failureReason: message };
  }

  if (result.status !== "CONFIRMED") {
    return {
      success: false,
      externalApplicationId: result.externalApplicationId,
      failureReason: result.failureReason ?? `Connector reported status "${result.status}".`,
    };
  }

  return { success: true, externalApplicationId: result.externalApplicationId, failureReason: null };
}
