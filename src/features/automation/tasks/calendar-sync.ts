import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { runInterviewCalendarSync } from "@/features/interviews/intelligence/orchestrator";
import { listUsersDueForCalendarSync } from "@/features/interviews/intelligence/sync";

import { exponentialBackoff } from "../policies";
import { AUTOMATION_TASK_LABEL } from "../types";
import type { AutomationTaskDefinition } from "../types";

/**
 * Wraps Interview Intelligence's calendar sync (`features/interviews/intelligence/`)
 * as an Automation Task Registry entry — Sprint 17, Step 11. Hard Lock 2:
 * this is the *only* place `runInterviewCalendarSync` is ever called on a
 * schedule; the registry, scheduler, and executor it plugs into are the
 * same ones every other task already uses, completely unmodified. Same
 * reuse discipline as `gmail-sync.ts`: no calendar-specific logic lives
 * here, only the registry-required wiring.
 */
export const calendarSyncTask: AutomationTaskDefinition<string> = {
  id: "calendar_sync",
  label: AUTOMATION_TASK_LABEL.calendar_sync,
  description:
    "Syncs your connected calendars against tracked interviews — detects reschedules, cancellations, and conflicts, and creates calendar events for newly-detected interviews.",
  priority: "normal",
  requirements: ["Google or Microsoft connected with Calendar access", "Within the Calendar Sync plan limit"],
  retryPolicy: { maxAttempts: 2, backoffMs: exponentialBackoff(2000) },
  // Each run can touch several real Calendar API calls per user (list +
  // possible create/update); bounded the same way every other task is.
  maxPerInvocation: 5,

  listDue: async (now, limit) => listUsersDueForCalendarSync(now, limit),

  checkEligibility: (userId) => checkEntitlement(userId, "CALENDAR_SYNC"),

  execute: async (userId) => {
    const summary = await runInterviewCalendarSync(userId);
    return {
      status: "completed",
      detail: `${summary.eventsFetched} event(s) fetched — ${summary.interviewsRescheduled} rescheduled, ${summary.interviewsCancelled} cancelled, ${summary.interviewsCompleted} completed, ${summary.interviewsCreatedOnCalendar} created, ${summary.conflictsDetected} conflict(s).`,
      metadata: { ...summary },
    };
  },

  onSuccess: (userId) => consumeEntitlement(userId, "CALENDAR_SYNC"),

  getUserId: (userId) => userId,
  getSubjectId: (userId) => userId,
};
