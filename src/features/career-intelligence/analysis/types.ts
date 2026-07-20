import type { z } from "zod";

import type { generateObject } from "@/lib/ai";

import type {
  importanceLevelSchema,
  scoreSchema,
  severityLevelSchema,
} from "./schema";

/**
 * Injectable AI dependency. Every Career Intelligence service accepts this
 * as an optional second argument — pass a fake `generateObject` in tests to
 * exercise the service's logic without touching the network or the AI
 * Router at all; omit it in production to use the real one (`@/lib/ai`).
 */
export interface AIDependencies {
  generateObject?: typeof generateObject;
}

/** Result shape returned by every Career Intelligence Server Action. */
export type AnalysisActionResult<T> =
  { status: "success"; data: T } | { status: "error"; message: string };

export type Score = z.infer<typeof scoreSchema>;
export type SeverityLevel = z.infer<typeof severityLevelSchema>;
export type ImportanceLevel = z.infer<typeof importanceLevelSchema>;
