import "server-only";

import type { CareerEvent } from "@/features/career-agent/types";
import { prisma } from "@/lib/prisma";

import { GMAIL_CLASSIFICATION_LABEL } from "./types";
import type { GmailCareerEventDTO, GmailIntelligenceSummary, ProcessedGmailMessage } from "./types";

const DTO_SELECT = {
  id: true,
  gmailMessageId: true,
  threadId: true,
  classification: true,
  confidence: true,
  company: true,
  role: true,
  location: true,
  interviewAt: true,
  interviewDateText: true,
  recruiterName: true,
  recruiterEmail: true,
  assessmentLink: true,
  offerAmountText: true,
  applicationId: true,
  source: true,
  subject: true,
  snippet: true,
  fromEmail: true,
  fromName: true,
  isUnread: true,
  receivedAt: true,
} as const;

/**
 * Step 5 (Career Memory) — the Gmail Intelligence Engine's persistence
 * layer and its one integration point with Career Memory. `GmailCareerEvent`
 * (`prisma/schema.prisma`) is the structured cache Step 10's "avoid
 * duplicate processing" needs; `toCareerEvents` below is what plugs that
 * cache into the *existing* Career Memory system
 * (`features/career-agent/inbox.ts`'s `buildCareerInboxEvents`,
 * `CareerEventSource` — see that type's own doc comment: "adding a
 * future external event source means one more literal plus one new
 * builder function," realized here with `"gmail"`) — never a second,
 * parallel timeline.
 */
export async function recordGmailCareerEvent(userId: string, processed: ProcessedGmailMessage): Promise<{ id: string }> {
  const { message, classification, extracted } = processed;

  return prisma.gmailCareerEvent.create({
    select: { id: true },
    data: {
      userId,
      gmailMessageId: message.id,
      threadId: message.threadId,
      classification: classification.classification,
      classifiedByRule: classification.classifiedByRule,
      confidence: extracted.confidence,
      company: extracted.company,
      role: extracted.role,
      location: extracted.location,
      interviewAt: extracted.interviewAt,
      interviewDateText: extracted.interviewDateText,
      recruiterName: extracted.recruiterName,
      recruiterEmail: extracted.recruiterEmail,
      assessmentLink: extracted.assessmentLink,
      offerAmountText: extracted.offerAmountText,
      applicationId: extracted.applicationId,
      source: extracted.source,
      subject: message.subject ?? "(no subject)",
      snippet: message.snippet || null,
      fromEmail: message.fromEmail,
      fromName: message.fromName,
      isUnread: message.isUnread,
      receivedAt: message.receivedAt,
    },
  });
}

/** Incremental-sync dedup check (Step 10) — one query for the whole
 * candidate batch, not one per message. */
export async function listProcessedMessageIds(userId: string, gmailMessageIds: string[]): Promise<Set<string>> {
  if (gmailMessageIds.length === 0) return new Set();
  const rows = await prisma.gmailCareerEvent.findMany({
    where: { userId, gmailMessageId: { in: gmailMessageIds } },
    select: { gmailMessageId: true },
  });
  return new Set(rows.map((row) => row.gmailMessageId));
}

const DEFAULT_RECENT_WINDOW_DAYS = 30;
const DEFAULT_LIMIT = 100;

/** The one query Career Brain (`raw.gmailIntelligence`) and the
 * dashboard card read — every field Step 6 asks Career Brain to expose
 * is a filter over this single result set, never a second query per
 * bullet. */
export async function listRecentGmailCareerEvents(
  userId: string,
  options: { limitDays?: number; limit?: number } = {},
): Promise<GmailCareerEventDTO[]> {
  const since = new Date(Date.now() - (options.limitDays ?? DEFAULT_RECENT_WINDOW_DAYS) * 24 * 60 * 60 * 1000);

  return prisma.gmailCareerEvent.findMany({
    where: { userId, receivedAt: { gte: since } },
    orderBy: { receivedAt: "desc" },
    take: options.limit ?? DEFAULT_LIMIT,
    select: DTO_SELECT,
  });
}

export async function getLastGmailSyncedAt(userId: string): Promise<Date | null> {
  const latest = await prisma.gmailCareerEvent.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return latest?.createdAt ?? null;
}

/** Step 6's exact Career Brain exposure, built from the one query above
 * — pure/synchronous, no second query per bullet. `orchestrator.ts` is
 * the only caller (`getGmailIntelligenceSummary`); nothing else should
 * call `listRecentGmailCareerEvents` directly and re-derive this. */
export function buildGmailIntelligenceSummary(events: GmailCareerEventDTO[], connected: boolean): GmailIntelligenceSummary {
  return {
    connected,
    interviewInvitations: events.filter((event) => event.classification === "INTERVIEW"),
    pendingAssessments: events.filter((event) => event.classification === "ASSESSMENT"),
    recentRecruiterActivity: events.filter((event) => event.classification === "RECRUITER" || event.classification === "FOLLOW_UP"),
    recentOffers: events.filter((event) => event.classification === "OFFER"),
    recentRejections: events.filter((event) => event.classification === "REJECTION"),
    unreadCount: events.filter((event) => event.isUnread).length,
  };
}

/** Reshapes classified Gmail events into the existing `CareerEvent`
 * shape — the sole integration point with Career Memory (Step 5). */
export function toCareerEvents(events: GmailCareerEventDTO[]): CareerEvent[] {
  return events
    .filter((event) => event.classification !== "GENERAL_CAREER" && event.classification !== "UNKNOWN")
    .map((event) => ({
      id: `gmail-${event.id}`,
      source: "gmail" as const,
      title: `${GMAIL_CLASSIFICATION_LABEL[event.classification]}${event.company ? ` — ${event.company}` : ""}`,
      description: event.subject,
      timestamp: event.receivedAt,
      href: "/settings/identity?tab=timeline",
    }));
}
