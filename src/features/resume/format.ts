import type { ResumeData } from "./schema";

/** Shared by every resume renderer (Live Preview templates, PDF templates,
 * the DOCX generator) so date-range formatting stays identical across all
 * of them instead of each reimplementing it slightly differently. */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  current: boolean,
): string {
  const start = startDate ?? "";
  const end = current ? "Present" : (endDate ?? "");

  if (!start && !end) return "";
  if (!end) return start;
  if (!start) return end;
  return `${start} — ${end}`;
}

export function resumeDisplayName(data: ResumeData): string {
  return data.contact.fullName?.trim() || "Untitled";
}

/** Contact line shown under the name — only the fields that are present,
 * joined consistently, never showing an empty "•" separator for a missing
 * field. */
export function formatContactLine(data: ResumeData): string {
  return [data.contact.email, data.contact.phone, data.contact.location]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("  •  ");
}
