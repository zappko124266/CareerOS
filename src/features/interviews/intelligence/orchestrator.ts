import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import { syncCalendarForUser } from "./sync";
import type { InterviewSyncSummary } from "./sync";

/**
 * Interview Intelligence's single coordination point (Step 2's
 * orchestrator diagram: `NormalizedCalendarEvent → Interview
 * Intelligence → Career Brain → Dashboard`). Two responsibilities:
 *
 * - `runInterviewCalendarSync` — the only path that calls real calendar
 *   provider APIs (via `sync.ts` → `features/calendar/manager.ts`).
 *   Called exclusively by the `calendar_sync` automation task (Hard Lock
 *   7); never from a page render.
 * - `recordGmailDetectedInterview` — Step 7's Gmail integration hook,
 *   called synchronously from `features/gmail-intelligence/service.ts`
 *   right after it classifies a message as `INTERVIEW`. Deliberately
 *   DB-only (no calendar API call here) — creating the actual calendar
 *   event for a newly-detected interview is left to the next
 *   `runInterviewCalendarSync` run, which already has the "find a
 *   writable provider, create the event" logic (`sync.ts`'s
 *   `reconcileUnlinkedInterview`) and would otherwise duplicate it.
 */
export interface GmailDetectedInterviewInput {
  gmailCareerEventId: string;
  company: string | null;
  role: string | null;
  interviewAt: Date | null;
  meetingLink: string | null;
  meetingPlatform: string | null;
}

export interface GmailDetectedInterviewResult {
  created: boolean;
  interviewId: string | null;
  /** Explains a `created: false` result honestly — never silent. */
  reason?: "ALREADY_RECORDED" | "NO_MATCHING_OPPORTUNITY" | "MATCHED_EXISTING_INTERVIEW";
}

/** Sprint 20 (Interview Intelligence), Module 7 fix — a stage/meeting
 * status that means "this interview round is still live." A second
 * INTERVIEW-classified email for the same opportunity while one of these
 * is true (e.g. a reminder email for an already-tracked round) must be
 * treated as an update to the existing row, never a second `Interview`. */
function isNonTerminalInterview(interview: { stage: string; meetingStatus: string }): boolean {
  return (
    interview.stage !== "REJECTED" &&
    interview.stage !== "WITHDRAWN" &&
    interview.meetingStatus !== "CANCELLED" &&
    interview.meetingStatus !== "COMPLETED"
  );
}

/**
 * Only ever creates an `Interview` row when the extracted `company`
 * confidently matches a saved `Opportunity` the user already has in
 * CareerOS (Hard Lock 4: never fabricate a placeholder interview, and
 * never fabricate the `Opportunity` an `Interview` is required to belong
 * to). An interview invitation for a job CareerOS has no record of still
 * shows up in Career Inbox Intelligence (Sprint 16) — it just doesn't
 * become a tracked `Interview` here.
 *
 * Sprint 20 fix — Module 7 ("Interview Detection... automatically update
 * Interview Timeline"): a second INTERVIEW-classified email for a
 * company that already has a non-terminal, unfinished `Interview` round
 * (e.g. a reminder or a reply in the same thread) previously created a
 * *second* `Interview` row, since the original check only matched on
 * `gmailCareerEventId` (unique per message, not per round). It now backs
 * off to the existing round instead — only ever filling in fields that
 * were still `null` (never overwriting a real value with a guess).
 */
export async function recordGmailDetectedInterview(
  userId: string,
  input: GmailDetectedInterviewInput,
  now: Date = new Date(),
): Promise<GmailDetectedInterviewResult> {
  const existing = await prisma.interview.findFirst({ where: { gmailCareerEventId: input.gmailCareerEventId } });
  if (existing) return { created: false, interviewId: existing.id, reason: "ALREADY_RECORDED" };

  if (!input.company) return { created: false, interviewId: null, reason: "NO_MATCHING_OPPORTUNITY" };

  const opportunity = await prisma.opportunity.findFirst({
    where: { userId, companyName: { contains: input.company, mode: "insensitive" } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (!opportunity) return { created: false, interviewId: null, reason: "NO_MATCHING_OPPORTUNITY" };

  const existingRound = await prisma.interview.findFirst({
    where: { opportunityId: opportunity.id },
    orderBy: { createdAt: "desc" },
  });
  if (existingRound && isNonTerminalInterview(existingRound)) {
    await prisma.interview.update({
      where: { id: existingRound.id },
      data: {
        scheduledAt: existingRound.scheduledAt ?? input.interviewAt ?? undefined,
        meetingLink: existingRound.meetingLink ?? input.meetingLink ?? undefined,
        meetingPlatform: existingRound.meetingPlatform ?? input.meetingPlatform ?? undefined,
      },
    });
    return { created: false, interviewId: existingRound.id, reason: "MATCHED_EXISTING_INTERVIEW" };
  }

  const interview = await prisma.interview.create({
    data: {
      opportunityId: opportunity.id,
      scheduledAt: input.interviewAt,
      roundLabel: input.role ? `Interview — ${input.role}` : "Interview",
      source: "GMAIL_DETECTED",
      gmailCareerEventId: input.gmailCareerEventId,
      meetingLink: input.meetingLink,
      meetingPlatform: input.meetingPlatform,
      stageHistory: [{ stage: "APPLIED", changedAt: now.toISOString() }] as unknown as Prisma.InputJsonValue,
    },
  });

  return { created: true, interviewId: interview.id };
}

export async function runInterviewCalendarSync(userId: string, now: Date = new Date()): Promise<InterviewSyncSummary> {
  return syncCalendarForUser(userId, now);
}
