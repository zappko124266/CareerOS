import type { FreeWindow } from "./availability";

/**
 * Candidate-slot suggestion — Step 9's "Future recruiter scheduling
 * support" groundwork. **Not** a job/cron scheduler — see
 * `features/autonomous-agent/scheduler.ts`'s own doc comment for the
 * exact same disambiguation this codebase already established: this is
 * a pure function proposing meeting-time candidates from real, already-
 * computed free windows (`availability.ts`), never anything that fires
 * work or is read by the Automation Engine. No recruiter-facing booking
 * page exists yet — this is the data layer one would be built on, not
 * the page itself (see the Sprint 17 report's "Remaining gaps").
 */
export interface SuggestedSlot {
  start: Date;
  end: Date;
}

export function suggestMeetingSlots(freeWindows: FreeWindow[], durationMinutes: number, maxSuggestions = 5): SuggestedSlot[] {
  const suggestions: SuggestedSlot[] = [];

  for (const window of freeWindows) {
    const windowMinutes = (window.end.getTime() - window.start.getTime()) / 60_000;
    if (windowMinutes < durationMinutes) continue;

    suggestions.push({ start: window.start, end: new Date(window.start.getTime() + durationMinutes * 60_000) });
    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
}
