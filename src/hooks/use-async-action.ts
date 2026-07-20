"use client";

import { useEffect, useRef, useState } from "react";

import type { DataActionResult } from "@/types/action";

/** After this long, swap the loading copy to something that sets
 * expectations instead of looking stuck — real AI generations have been
 * observed taking well over a minute depending on the provider; plain
 * CRUD actions are typically far faster but get the same safety net. */
const SLOW_THRESHOLD_MS = 8000;

/** Hard client-side ceiling. The AI Router has no request timeout of its
 * own today (observed: a provider call can hang indefinitely with no
 * success or error), so without this a dropped/stuck call leaves the UI
 * spinning forever with no way out. This doesn't cancel the in-flight
 * server-side call — it just stops the UI from waiting on it past a point
 * where "still working" has stopped being a credible message. */
const HARD_TIMEOUT_MS = 120_000;

/**
 * Calls a Server Action that returns `DataActionResult<T>` (any action
 * shaped `{status:"success",data}|{status:"error",message}` — this
 * includes Career Intelligence's `AnalysisActionResult<T>`, which is
 * structurally identical) outside of a `<form>`, tracking its
 * pending/result/error state. Originally written for the dashboard's
 * on-demand AI cards (hence `isSlow`/`HARD_TIMEOUT_MS`), and reused as-is
 * for Opportunities' CRUD actions (search/save/status/checklist/notes) —
 * nothing about this hook is actually AI-specific, so it lives under a
 * name that says what it does rather than the first feature that needed
 * it.
 *
 * Pending state is a plain `useState`, not `useTransition` — an earlier
 * version used `startTransition`, but combined with the hard-timeout
 * `Promise.race` below, `isPending` was observed to stay `true`
 * indefinitely even after the transition's own callback had returned
 * (caught, handled, no rethrow). Plain state has none of that ambiguity:
 * it's set exactly where this hook says it is.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<DataActionResult<TResult>>,
) {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  // Unmount-only cleanup — starting/clearing the timer itself happens in
  // the event-driven `run`/`reset` below, not here, since a timer kicked
  // off in response to a click belongs in that handler, not an effect.
  useEffect(() => {
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  function clearSlowTimer() {
    if (slowTimer.current) {
      clearTimeout(slowTimer.current);
      slowTimer.current = null;
    }
  }

  // Returns the resolved value in addition to updating the hook's own
  // state — a caller that needs to chain follow-up logic off the result
  // (e.g. merging it into a differently-shaped local state) can't rely on
  // reading `result` right after `await run(...)`: that reads the closure
  // captured when the handler was defined, not the post-update value, so
  // it's always one render stale.
  async function run(...args: TArgs): Promise<TResult | null> {
    const thisRequest = ++requestId.current;

    setError(null);
    setIsSlow(false);
    setIsPending(true);
    clearSlowTimer();
    slowTimer.current = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);

    // A network hiccup or a dropped connection throws before the action
    // ever returns its own {status: "error"} — without this catch, that
    // throw becomes an unhandled rejection and the UI is stuck showing
    // "pending" forever with no way out for the user.
    try {
      const response = await Promise.race([
        action(...args),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("timeout")), HARD_TIMEOUT_MS);
        }),
      ]);

      // A slower call that finally lands after a newer `run()` has already
      // started (or after the hard timeout gave up on it) shouldn't
      // clobber whatever the latest request already settled.
      if (thisRequest !== requestId.current) return null;

      if (response.status === "success") {
        setResult(response.data);
        return response.data;
      }
      setError(response.message);
      return null;
    } catch {
      if (thisRequest !== requestId.current) return null;
      setError(
        "This is taking much longer than usual. Please try again in a moment.",
      );
      return null;
    } finally {
      if (thisRequest === requestId.current) {
        clearSlowTimer();
        setIsSlow(false);
        setIsPending(false);
      }
    }
  }

  function reset() {
    requestId.current += 1;
    clearSlowTimer();
    setIsSlow(false);
    setIsPending(false);
    setResult(null);
    setError(null);
  }

  return { run, isPending, isSlow, result, error, reset };
}
