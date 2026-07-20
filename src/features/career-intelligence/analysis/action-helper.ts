import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { AnalysisActionResult } from "./types";

/**
 * Shared body for every Career Intelligence Server Action: requires a
 * session, runs the service call, and maps the result to
 * `AnalysisActionResult`. Not itself a Server Action (no `"use server"`
 * here) — each `actions.ts` still exports its own literal
 * `async function` per the Next.js Server Functions requirement, but the
 * body is just one call to this helper.
 */
export async function runAnalysisAction<T>(
  logName: string,
  run: () => Promise<T>,
): Promise<AnalysisActionResult<T>> {
  await verifySession();

  try {
    const data = await run();
    return { status: "success", data };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }

    logger.error(`career_intelligence.${logName}.action_failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "error",
      message: "We couldn't complete that analysis. Please try again.",
    };
  }
}
