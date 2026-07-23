import type { AgentAction, DailyScheduleSlot } from "./types";

/** Minutes between consecutive slots — spacing only, not a real cadence
 * measured from anything. */
const SLOT_SPACING_MINUTES = 10;
const DEFAULT_START_HOUR = 9;

function formatSlot(hour: number, minute: number): string {
  const h = String(hour % 24).padStart(2, "0");
  const m = String(minute % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Lays `planner.ts`'s already-prioritized actions out against suggested
 * time-of-day labels — Step 4's "Daily Plan." This is **not** a second
 * scheduler: `features/automation/scheduler.ts` (`runDueTasks`) is the
 * only thing that decides when work actually executes, via Vercel Cron
 * (`vercel.json`: 06:00 discovery, 07:00 follow-up). Nothing here fires a
 * job, writes a cron entry, or is read by anything that executes work —
 * it only labels a list that's already ordered by priority, purely for
 * display ("Today's plan"), which is why "do not fabricate timestamps"
 * matters: these are proposed slots, not a record of when anything ran
 * or a promise of when it will. `automationTaskId === null` actions
 * (advisory recommendations like "update your resume") get a slot the
 * same as automation-backed ones — the schedule is about *user*
 * attention ordering, not just background-job timing.
 */
export function buildDailySchedule(
  actions: AgentAction[],
  startTime: { hour: number; minute: number } = { hour: DEFAULT_START_HOUR, minute: 0 },
): DailyScheduleSlot[] {
  return actions.map((action, index) => {
    const totalMinutes = startTime.hour * 60 + startTime.minute + index * SLOT_SPACING_MINUTES;
    return {
      time: formatSlot(Math.floor(totalMinutes / 60), totalMinutes % 60),
      action,
    };
  });
}
