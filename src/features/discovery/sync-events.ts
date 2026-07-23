import "server-only";

import { logAuditEvent } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import type { OpportunityChange } from "./change-detection";

/**
 * Structured change events — Sprint 19's "Produce structured change
 * events," reusing `AuditLog` (Execution History's own backing store,
 * `features/automation/history.ts`) exactly the way Sprints 15-18 already
 * established for automation executions, Gmail events, and application
 * executions — never a new table just to log an event. `changes` is the
 * real `OpportunityChange[]` `change-detection.ts` computed, stored
 * verbatim as JSON metadata; no raw provider payload is stored here (the
 * full listing itself already lives on `DiscoveredListing`, unchanged by
 * this sprint's storage policy).
 */
export async function recordListingChanged(
  userId: string,
  listing: { id: string; companyName: string; title: string },
  changes: OpportunityChange[],
): Promise<void> {
  if (changes.length === 0) return;

  await logAuditEvent("discovery.listing_changed", {
    userId,
    metadata: {
      listingId: listing.id,
      companyName: listing.companyName,
      title: listing.title,
      changes,
    } as unknown as Prisma.InputJsonValue,
  });
}

export async function recordListingClosed(
  userId: string,
  listing: { id: string; companyName: string; title: string },
): Promise<void> {
  await logAuditEvent("discovery.listing_closed", {
    userId,
    metadata: { listingId: listing.id, companyName: listing.companyName, title: listing.title },
  });
}

export interface OpportunitySyncEvent {
  id: string;
  type: "CHANGED" | "CLOSED";
  listingId: string;
  companyName: string;
  title: string;
  changes: OpportunityChange[];
  timestamp: Date;
}

const SYNC_EVENT_ACTIONS: AuditAction[] = ["discovery.listing_changed", "discovery.listing_closed"];

interface SyncEventMetadata {
  listingId?: string;
  companyName?: string;
  title?: string;
  changes?: OpportunityChange[];
}

/** One query, reused by Career Brain — every downstream field (new/
 * updated/closed today, high-impact changes) is a pure filter over this
 * same result set. */
export async function listRecentOpportunitySyncEvents(
  userId: string,
  since: Date,
  limit = 200,
): Promise<OpportunitySyncEvent[]> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, action: { in: SYNC_EVENT_ACTIONS }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => {
    const metadata = (row.metadata ?? {}) as SyncEventMetadata;
    return {
      id: row.id,
      type: row.action === "discovery.listing_closed" ? "CLOSED" : "CHANGED",
      listingId: metadata.listingId ?? "",
      companyName: metadata.companyName ?? "",
      title: metadata.title ?? "",
      changes: metadata.changes ?? [],
      timestamp: row.createdAt,
    };
  });
}
