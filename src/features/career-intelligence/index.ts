/**
 * Career Intelligence — the reusable AI service layer behind CareerOS.
 *
 * Every export here is a standalone, independently-testable AI service:
 * structured input in, a Zod-validated structured object out, always
 * routed through the AI Router (`@/lib/ai`). No UI, no pages — this module
 * exists to be imported by whatever surface needs it (Server Actions today,
 * route handlers or background jobs later).
 *
 * See docs/ARCHITECTURE.md#career-intelligence for the module's shape and
 * conventions.
 */
export * from "./analysis";
export * from "./applications";
export * from "./career";
export * from "./companies";
export * from "./discovery";
export * from "./interview";
export * from "./jobs";
export * from "./linkedin";
export * from "./resume";
export * from "./salary";
export * from "./skills";
