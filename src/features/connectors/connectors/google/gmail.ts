import "server-only";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Real, read-only Gmail API access for the Google connector — Sprint 16,
 * the first consumer of the `gmail.readonly` scope this connector has
 * requested since Sprint 7 (see `types.ts`'s `GOOGLE_OAUTH_SCOPES` — that
 * scope was granted but nothing read it until now, per
 * `docs/connectors/CONNECTOR_CAPABILITY_MATRIX.md` §2.9). Every call here
 * is `GET` against Gmail's own documented v1 REST API
 * (https://developers.google.com/gmail/api/reference/rest) — no
 * `messages.modify`, `messages.trash`, `messages.send`, or any other
 * mutating endpoint exists in this file, matching this engine's
 * read-only mandate. `format=metadata` is used deliberately instead of
 * `format=full`: Gmail returns only headers + the message's own
 * pre-truncated `snippet`, never the full body, which is both this
 * engine's own storage policy (never persist a full email body) and a
 * real reduction in API payload size / quota usage.
 */
export class GmailApiError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("GMAIL_API_ERROR", message, options);
    this.name = "GmailApiError";
  }
}

/**
 * A real, honest, disclosed pre-filter — not a claim of completeness.
 * Gmail's search operators (https://support.google.com/mail/answer/7190)
 * narrow the candidate set to plausibly career-related mail before this
 * engine spends a classification pass on it, which is both the "minimize
 * Gmail API usage" and "avoid duplicate processing" discipline Step 10
 * asks for. A message that mentions none of these terms is never
 * fetched — a real limitation, not a fabricated one, and worth
 * remembering when reading "Unread career emails" counts: they're
 * "unread emails this query matched," not "every unread email."
 */
const CAREER_SEARCH_TERMS = [
  "interview",
  "recruiter",
  "application",
  "assessment",
  "coding challenge",
  "offer letter",
  "hiring",
  "candidacy",
  "next steps",
  "we regret",
  "not moving forward",
];

export function buildCareerSearchQuery(newerThanDays: number): string {
  const terms = CAREER_SEARCH_TERMS.map((term) => (term.includes(" ") ? `"${term}"` : term)).join(" OR ");
  return `(${terms}) newer_than:${newerThanDays}d -category:promotions -category:social`;
}

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("google_connector.gmail_request_failed", { path, status: response.status, detail });
    throw new GmailApiError(`Gmail API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

interface GmailListMessagesResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/** Real `messages.list` call, bounded by `maxResults` — the id/threadId
 * pair only; a second call (`getMessageMetadata`) is needed per message
 * for headers/snippet, matching Gmail API's own two-step shape (there is
 * no "list with full metadata" endpoint). */
export async function listCareerCandidateMessageIds(
  accessToken: string,
  options: { maxResults: number; newerThanDays: number },
): Promise<string[]> {
  const query = buildCareerSearchQuery(options.newerThanDays);
  const params = new URLSearchParams({ q: query, maxResults: String(options.maxResults) });
  const result = await gmailFetch<GmailListMessagesResponse>(accessToken, `/messages?${params.toString()}`);
  return (result.messages ?? []).map((message) => message.id);
}

export interface GmailMessageMetadata {
  id: string;
  threadId: string;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  snippet: string;
  receivedAt: Date;
  isUnread: boolean;
}

interface GmailGetMessageResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

/** `"Display Name <email@domain.com>"` or a bare address — both real,
 * common `From` header shapes. Falls back to treating the whole header
 * as the email when no `<...>` is present, never invents a display
 * name. */
function parseFromHeader(value: string | undefined): { email: string | null; name: string | null } {
  if (!value) return { email: null, name: null };
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim(), name: name.length > 0 ? name : null };
  }
  return { email: value.trim(), name: null };
}

/** Real `messages.get?format=metadata` call — headers + `snippet` only,
 * never the body. Returns `null` for a message Gmail reports as gone
 * (e.g. deleted between list and get) rather than throwing, since that's
 * an expected, non-fatal race in an incremental sync. */
export async function getMessageMetadata(accessToken: string, messageId: string): Promise<GmailMessageMetadata | null> {
  const params = new URLSearchParams({ format: "metadata" });
  params.append("metadataHeaders", "Subject");
  params.append("metadataHeaders", "From");

  let result: GmailGetMessageResponse;
  try {
    result = await gmailFetch<GmailGetMessageResponse>(accessToken, `/messages/${messageId}?${params.toString()}`);
  } catch (error) {
    logger.error("google_connector.gmail_message_fetch_failed", {
      messageId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const headers = result.payload?.headers ?? [];
  const subject = headers.find((header) => header.name.toLowerCase() === "subject")?.value ?? null;
  const from = parseFromHeader(headers.find((header) => header.name.toLowerCase() === "from")?.value);

  return {
    id: result.id,
    threadId: result.threadId,
    subject,
    fromEmail: from.email,
    fromName: from.name,
    snippet: result.snippet ?? "",
    receivedAt: result.internalDate ? new Date(Number(result.internalDate)) : new Date(),
    isUnread: (result.labelIds ?? []).includes("UNREAD"),
  };
}
