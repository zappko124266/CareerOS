import "server-only";

import type { NormalizedOpportunity } from "@/features/opportunities/providers/types";
import type { DiscoveredListing } from "@/generated/prisma/client";

/**
 * The Change Detector — Sprint 19. A pure, deterministic diff between a
 * `DiscoveredListing` row as it stood *before* this sync run (`previous`)
 * and the freshly normalized listing this run just fetched (`next`) — no
 * AI call, no new normalization logic (`next` is exactly the same
 * `NormalizedOpportunity` shape the 8 existing search connectors already
 * produce). Called from `run-discovery.ts`'s existing per-listing loop,
 * *before* that loop's own `upsert` overwrites the row, which is the only
 * place both the old and new field values are available in the same
 * request without a second query.
 */
export type OpportunityChangeType =
  | "SALARY_UPDATED"
  | "DESCRIPTION_UPDATED"
  | "REQUIREMENTS_CHANGED"
  | "WORK_TYPE_CHANGED"
  | "APPLY_URL_CHANGED"
  | "COMPANY_CHANGED";

export interface OpportunityChange {
  type: OpportunityChangeType;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  /** Real, computed signal — never asked of an AI, never fabricated.
   * `true` only for `SALARY_UPDATED` where the new range's midpoint is
   * strictly higher than the old one's — the one change type worth
   * calling out as "high-impact" on Mission Control (Step: "Salary
   * increased"). */
  isImprovement: boolean;
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min === null && max === null) return null;
  const prefix = currency ? `${currency} ` : "";
  if (min !== null && max !== null) return `${prefix}${min.toLocaleString()}–${max.toLocaleString()}`;
  return `${prefix}${(min ?? max)!.toLocaleString()}`;
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min !== null && max !== null) return (min + max) / 2;
  return min ?? max;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

export function detectListingChanges(previous: DiscoveredListing, next: NormalizedOpportunity): OpportunityChange[] {
  const changes: OpportunityChange[] = [];

  if (previous.salaryMin !== (next.salaryMin ?? null) || previous.salaryMax !== (next.salaryMax ?? null)) {
    const oldMid = midpoint(previous.salaryMin, previous.salaryMax);
    const newMid = midpoint(next.salaryMin ?? null, next.salaryMax ?? null);
    changes.push({
      type: "SALARY_UPDATED",
      field: "salary",
      oldValue: formatSalary(previous.salaryMin, previous.salaryMax, previous.salaryCurrency),
      newValue: formatSalary(next.salaryMin ?? null, next.salaryMax ?? null, next.salaryCurrency ?? null),
      isImprovement: oldMid !== null && newMid !== null && newMid > oldMid,
    });
  }

  if (previous.description.trim() !== next.description.trim()) {
    // The full text is never stored in the change event itself (Hard
    // Lock-equivalent security rule this sprint reuses: "no raw provider
    // payloads stored unless already supported" — the full description
    // is already stored on the row itself, this event just flags *that*
    // it changed).
    changes.push({ type: "DESCRIPTION_UPDATED", field: "description", oldValue: null, newValue: null, isImprovement: false });
  }

  const previousSkills = new Set((previous.skills as unknown as string[]) ?? []);
  const nextSkills = new Set(next.skills ?? []);
  if (!setsEqual(previousSkills, nextSkills)) {
    changes.push({
      type: "REQUIREMENTS_CHANGED",
      field: "skills",
      oldValue: [...previousSkills].join(", ") || null,
      newValue: [...nextSkills].join(", ") || null,
      isImprovement: false,
    });
  }

  if (previous.remote !== next.remote || previous.employmentType !== (next.employmentType ?? null)) {
    changes.push({
      type: "WORK_TYPE_CHANGED",
      field: "employmentType",
      oldValue: `${previous.employmentType ?? "unspecified"}${previous.remote ? " (remote)" : ""}`,
      newValue: `${next.employmentType ?? "unspecified"}${next.remote ? " (remote)" : ""}`,
      isImprovement: false,
    });
  }

  if (previous.applyUrl !== next.applyUrl) {
    changes.push({
      type: "APPLY_URL_CHANGED",
      field: "applyUrl",
      oldValue: previous.applyUrl,
      newValue: next.applyUrl,
      isImprovement: false,
    });
  }

  if (previous.companyName.trim().toLowerCase() !== next.companyName.trim().toLowerCase()) {
    changes.push({
      type: "COMPANY_CHANGED",
      field: "companyName",
      oldValue: previous.companyName,
      newValue: next.companyName,
      isImprovement: false,
    });
  }

  return changes;
}
