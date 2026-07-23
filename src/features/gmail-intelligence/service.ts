import "server-only";

import { recognizeMeetingPlatform } from "@/features/calendar/normalize";
import { getMessageMetadata, listCareerCandidateMessageIds } from "@/features/connectors/connectors/google/gmail";
import { GOOGLE_OAUTH_SCOPES } from "@/features/connectors/connectors/google/types";
import { getValidAccessToken } from "@/features/connectors/manager";
import { recordGmailDetectedInterview } from "@/features/interviews/intelligence/orchestrator";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { classifyDeterministically, classifyGmailMessage } from "./classifier";
import { extractFields } from "./extractor";
import { listProcessedMessageIds, recordGmailCareerEvent } from "./memory";
import type { GmailMessageInput, GmailSyncSummary } from "./types";

const GMAIL_READONLY_SCOPE = GOOGLE_OAUTH_SCOPES.find((scope) => scope.label === "Gmail")!.scope;

const MAX_MESSAGES_PER_SYNC = 25;
const NEWER_THAN_DAYS = 30;
const MAX_AI_CLASSIFICATIONS_PER_SYNC = 5;
/** How stale a user's last sync must be before they're "due" again —
 * bounds real Gmail API usage (Step 10) the same way discovery/follow-up
 * bound theirs. */
const SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000;

export class GmailSyncNotConnectedError extends AppError {
  constructor(message = "Google isn't connected — connect it from Account Connections first.") {
    super("GMAIL_SYNC_NOT_CONNECTED", message);
    this.name = "GmailSyncNotConnectedError";
  }
}

/**
 * Step 10's "who is due" query — same shape as
 * `discovery/queries.ts`'s `listUsersDueForDiscovery`: a real,
 * threshold-based scan, never re-derived per user. Only users with a
 * `CONNECTED` Google connection that actually granted the Gmail scope are
 * considered — a Google connection from before this sprint (or one that
 * declined the Gmail scope, if that's ever made optional) is honestly
 * never "due," not silently skipped after a wasted API call.
 */
export async function listUsersDueForGmailSync(now: Date, limit: number): Promise<string[]> {
  const connections = await prisma.accountConnection.findMany({
    where: { provider: "GOOGLE", status: "CONNECTED" },
    select: { userId: true, scopes: true },
  });

  const eligibleUserIds = connections
    .filter((connection) => (connection.scopes as string[]).includes(GMAIL_READONLY_SCOPE))
    .map((connection) => connection.userId);

  if (eligibleUserIds.length === 0) return [];

  const lastSyncRows = await prisma.gmailCareerEvent.groupBy({
    by: ["userId"],
    where: { userId: { in: eligibleUserIds } },
    _max: { createdAt: true },
  });
  const lastSyncByUser = new Map(lastSyncRows.map((row) => [row.userId, row._max.createdAt]));

  const due: string[] = [];
  for (const userId of eligibleUserIds) {
    const last = lastSyncByUser.get(userId);
    if (!last || now.getTime() - last.getTime() >= SYNC_INTERVAL_MS) {
      due.push(userId);
    }
    if (due.length >= limit) break;
  }
  return due;
}

/**
 * Step 2/3/4/5's actual sync: get a valid token (refreshing if needed —
 * `getValidAccessToken`, Sprint 16's extension to the Connection
 * Manager), list career-candidate message ids (a real, bounded Gmail
 * search — `gmail.ts`), skip anything already processed (`memory.ts`'s
 * dedup query), then for each new message: fetch real metadata (never
 * the body), classify (deterministic first, AI only for the unresolved
 * remainder and only up to `MAX_AI_CLASSIFICATIONS_PER_SYNC`), extract,
 * and persist one `GmailCareerEvent` row. Throws `GmailSyncNotConnectedError`
 * if Google isn't connected — the caller (the automation task, or
 * `orchestrator.ts` for a manual trigger) decides how to surface that,
 * this function never fabricates a result when there's nothing to sync
 * from.
 *
 * Sprint 17, Step 7: every message classified `INTERVIEW` is also handed
 * to `features/interviews/intelligence/orchestrator.ts`'s
 * `recordGmailDetectedInterview` — real, synchronous, DB-only (no
 * calendar API call happens here; see that function's own doc comment
 * for why). A failure there is logged and never allowed to fail the
 * surrounding Gmail sync — Gmail Intelligence's own job (persisting the
 * classified email) always completes regardless of whether Interview
 * Intelligence could act on it.
 */
export async function syncGmailCareerIntelligenceForUser(userId: string, now: Date = new Date()): Promise<GmailSyncSummary> {
  const tokenResult = await getValidAccessToken(userId, "GOOGLE");
  if (tokenResult.status !== "OK") {
    throw new GmailSyncNotConnectedError(
      tokenResult.status === "REFRESH_FAILED" ? tokenResult.error : undefined,
    );
  }

  const candidateIds = await listCareerCandidateMessageIds(tokenResult.accessToken, {
    maxResults: MAX_MESSAGES_PER_SYNC,
    newerThanDays: NEWER_THAN_DAYS,
  });

  if (candidateIds.length === 0) {
    return { candidatesFound: 0, alreadyProcessed: 0, newlyProcessed: 0, aiClassificationsUsed: 0 };
  }

  const alreadyProcessed = await listProcessedMessageIds(userId, candidateIds);
  const newIds = candidateIds.filter((id) => !alreadyProcessed.has(id));

  let aiClassificationsUsed = 0;
  let newlyProcessed = 0;

  for (const messageId of newIds) {
    const metadata = await getMessageMetadata(tokenResult.accessToken, messageId);
    if (!metadata) continue;

    const messageInput: GmailMessageInput = {
      id: metadata.id,
      threadId: metadata.threadId,
      subject: metadata.subject,
      snippet: metadata.snippet,
      fromEmail: metadata.fromEmail,
      fromName: metadata.fromName,
      receivedAt: metadata.receivedAt,
      isUnread: metadata.isUnread,
    };

    const ruleResult = classifyDeterministically(messageInput);
    const canUseAi = !ruleResult && aiClassificationsUsed < MAX_AI_CLASSIFICATIONS_PER_SYNC;

    const classification = ruleResult
      ? { classification: ruleResult, classifiedByRule: true as const }
      : canUseAi
        ? await classifyGmailMessage(messageInput)
        : { classification: "UNKNOWN" as const, classifiedByRule: false as const };

    if (canUseAi) aiClassificationsUsed++;

    const extracted = extractFields(messageInput, classification.classification, classification.classifiedByRule, now);

    const recorded = await recordGmailCareerEvent(userId, { message: messageInput, classification, extracted });
    newlyProcessed++;

    if (classification.classification === "INTERVIEW") {
      try {
        await recordGmailDetectedInterview(userId, {
          gmailCareerEventId: recorded.id,
          company: extracted.company,
          role: extracted.role,
          interviewAt: extracted.interviewAt,
          // `assessmentLink` doubles as the meeting link for INTERVIEW mail
          // — see `extractor.ts`'s `extractAssessmentLink` doc comment.
          meetingLink: extracted.assessmentLink,
          meetingPlatform: extracted.assessmentLink ? recognizeMeetingPlatform(extracted.assessmentLink) : null,
        });
      } catch (error) {
        logger.error("gmail_intelligence.interview_hook_failed", {
          userId,
          gmailCareerEventId: recorded.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { candidatesFound: candidateIds.length, alreadyProcessed: alreadyProcessed.size, newlyProcessed, aiClassificationsUsed };
}
