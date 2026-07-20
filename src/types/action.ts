/**
 * Shared result shape for Server Actions driven by React 19's
 * `useActionState`. Keep it JSON-serializable — it crosses the
 * server/client boundary on every submit.
 */
export type ActionResult =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export const IDLE_ACTION_STATE: ActionResult = { status: "idle" };

/**
 * Result shape for Server Actions that return a data payload rather than
 * just a status (called directly from a Client Component, not via
 * `useActionState`/`<form>`). Structurally identical to
 * `career-intelligence/analysis/types.ts`'s `AnalysisActionResult<T>`,
 * which predates this and is left as-is rather than retroactively
 * refactored across its 17 existing callers — new features (Opportunities)
 * should use this shared one instead of redefining the same shape again.
 */
export type DataActionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string };
