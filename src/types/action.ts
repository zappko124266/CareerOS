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
