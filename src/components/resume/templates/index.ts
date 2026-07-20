import { MinimalTemplate } from "./minimal-template";
import { ModernTemplate } from "./modern-template";

/**
 * The one place both the Live Preview and (indirectly, by matching id) the
 * PDF export pick a template. Adding a template means adding one entry
 * here plus its PDF counterpart in
 * `features/resume/export/pdf-templates.tsx` — nothing else needs to
 * change.
 */
export const RESUME_TEMPLATE_IDS = ["minimal", "modern"] as const;
export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];

export const RESUME_TEMPLATES: Record<
  ResumeTemplateId,
  { label: string; component: typeof MinimalTemplate }
> = {
  minimal: { label: "Minimal", component: MinimalTemplate },
  modern: { label: "Modern", component: ModernTemplate },
};
