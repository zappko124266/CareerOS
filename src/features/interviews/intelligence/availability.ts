import type { NormalizedCalendarEvent } from "@/features/calendar/types";

/**
 * The Availability Engine — Step 9. Pure, deterministic, synchronous
 * functions over already-fetched `NormalizedCalendarEvent[]` (from
 * `features/calendar/manager.ts`'s `listEvents`) — no I/O, no new
 * queries, same "pure derivation" idiom as `recommendNextStep`/
 * `buildAgentActionPlan`. This is the data layer a future recruiter-facing
 * scheduling link would build on ("Future recruiter scheduling support"
 * per Step 9) — no such link exists yet; see the Sprint 17 report's
 * "Remaining gaps."
 */

export interface BusyWindow {
  start: Date;
  end: Date;
  title: string;
}

export interface FreeWindow {
  start: Date;
  end: Date;
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingEvents: BusyWindow[];
}

/** Cancelled events are real too (they're a genuine provider response),
 * but they don't occupy real time on the calendar — excluded from
 * "busy," never silently treated as if they still block a slot. */
export function computeBusyWindows(events: NormalizedCalendarEvent[]): BusyWindow[] {
  return events
    .filter((event) => event.status !== "cancelled")
    .map((event) => ({ start: event.start, end: event.end, title: event.title }));
}

/** Real interval-overlap check — `hasConflict` only when another *busy*
 * window genuinely intersects `target`'s time range, never a guess. */
export function detectConflicts(
  target: { start: Date; end: Date },
  busyWindows: BusyWindow[],
  excludeEventTitle?: string,
): ConflictCheck {
  const conflicting = busyWindows.filter(
    (window) => window.start < target.end && window.end > target.start && window.title !== excludeEventTitle,
  );
  return { hasConflict: conflicting.length > 0, conflictingEvents: conflicting };
}

/**
 * Gaps between busy windows, within `[rangeStart, rangeEnd]`, at least
 * `minSlotMinutes` long — a real computation over real busy windows, not
 * a fabricated "you're free" guess when the underlying calendar data is
 * incomplete (a user with zero connected calendars gets zero busy
 * windows and therefore one large "free" window spanning the whole
 * range — callers should treat that as "no calendar data," not "totally
 * free," and `orchestrator.ts`'s callers do exactly that by checking
 * connection status separately).
 */
export function computeFreeWindows(
  busyWindows: BusyWindow[],
  rangeStart: Date,
  rangeEnd: Date,
  minSlotMinutes = 30,
): FreeWindow[] {
  const sorted = [...busyWindows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const free: FreeWindow[] = [];
  let cursor = rangeStart;

  for (const busy of sorted) {
    if (busy.start > cursor) {
      const gapMinutes = (busy.start.getTime() - cursor.getTime()) / 60_000;
      if (gapMinutes >= minSlotMinutes) free.push({ start: cursor, end: busy.start });
    }
    if (busy.end > cursor) cursor = busy.end;
  }

  if (rangeEnd > cursor) {
    const gapMinutes = (rangeEnd.getTime() - cursor.getTime()) / 60_000;
    if (gapMinutes >= minSlotMinutes) free.push({ start: cursor, end: rangeEnd });
  }

  return free;
}

/** Real timezone conversion via the platform's own `Intl.DateTimeFormat`
 * — no timezone-offset table maintained by this codebase, which would
 * drift out of date (DST rules change). `timezone` must be a real IANA
 * identifier (what every `NormalizedCalendarEvent.timezone`/
 * `Interview.timezone` already stores). */
export function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
