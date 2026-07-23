import type { RetryPolicy } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The Retry Engine — Sprint 5. Real, in-process retry with a
 * deterministic backoff, executed synchronously within one task
 * attempt. This codebase has no persisted job queue (Vercel Functions
 * are stateless between invocations, and building a "resume this failed
 * task later" scheduler would mean inventing state that doesn't exist
 * anywhere else in this app — exactly what "no fake background jobs"
 * warns against). A subject that still fails after every attempt here
 * simply stays "due" and gets picked up again by the next real scheduled
 * run (`listDue` re-selects it) — cross-invocation retry that already
 * happens for free, not rebuilt.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < policy.maxAttempts) {
        await sleep(policy.backoffMs(attempt));
      }
    }
  }

  throw lastError;
}

/** Exponential backoff — `baseMs`, `2*baseMs`, `4*baseMs`, ... — a
 * deterministic function of attempt number, never randomized. */
export function exponentialBackoff(baseMs: number): RetryPolicy["backoffMs"] {
  return (attempt) => baseMs * 2 ** (attempt - 1);
}
