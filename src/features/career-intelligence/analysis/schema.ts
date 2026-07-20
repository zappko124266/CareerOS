import { z } from "zod";

/** 0-100 confidence/quality score used across most analyses. */
export const scoreSchema = z.number().min(0).max(100);

/** Common severity scale for issues, gaps, and weaknesses. */
export const severityLevelSchema = z.enum(["high", "medium", "low"]);

/** Common importance scale for missing skills/requirements. */
export const importanceLevelSchema = z.enum([
  "critical",
  "important",
  "nice-to-have",
]);
