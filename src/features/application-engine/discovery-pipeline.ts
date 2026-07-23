import type { CareerBrain } from "@/features/career-brain/types";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import { STATUS_OFF_PATH, STATUS_ORDER } from "@/features/opportunities/types";
import type { OpportunityStatus } from "@/features/opportunities/types";

const APPLIED_INDEX = STATUS_ORDER.indexOf("APPLIED");

/** Every status that counts as "not yet applied" — exported so the
 * Automation task's `listDue` query (which needs to ask the database
 * "which users have any candidate opportunity" before this pipeline can
 * run per-user) filters on the exact same statuses this pipeline does,
 * rather than a second, hand-copied list. */
export const APPLICATION_CANDIDATE_STATUSES: OpportunityStatus[] = STATUS_ORDER.slice(0, APPLIED_INDEX);

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * The Discovery Pipeline — Sprint 9, requirement 1: reusable, no new
 * query. Every saved opportunity's Opportunity Intelligence (Sprint 2)
 * was already computed once by the Career Brain
 * (`brain.raw.priorityQueueRows`) — this is a pure filter over that same
 * array, not a re-scoring. Candidates are opportunities not yet applied
 * to (before `APPLIED` in `STATUS_ORDER`, and not on an off-path status
 * like `REJECTED`/`WITHDRAWN`) and not on the user's own company
 * blacklist (`DiscoveryPreference.companyBlacklist` — already collected
 * during onboarding, reused here rather than re-asked).
 */
export function getApplicationCandidates(brain: CareerBrain): PriorityQueueRow[] {
  const blacklist = new Set(
    ((brain.raw.preference?.companyBlacklist as string[]) ?? []).map(normalize),
  );

  return brain.raw.priorityQueueRows.filter((row) => {
    const { status, companyName } = row.opportunity;

    if (STATUS_OFF_PATH.includes(status)) return false;

    const statusIndex = STATUS_ORDER.indexOf(status);
    if (statusIndex === -1 || statusIndex >= APPLIED_INDEX) return false;

    if (blacklist.has(normalize(companyName))) return false;

    return true;
  });
}
