import type { GmailCareerClassification, GmailCareerEvent } from "@/generated/prisma/client";

export type { GmailCareerClassification };

/** Human-readable labels for Mission Control / Career Identity — the
 * exact 9-value taxonomy the mission specifies. */
export const GMAIL_CLASSIFICATION_LABEL: Record<GmailCareerClassification, string> = {
  INTERVIEW: "Interview",
  RECRUITER: "Recruiter",
  ASSESSMENT: "Assessment",
  APPLICATION_CONFIRMATION: "Application Confirmation",
  OFFER: "Offer",
  REJECTION: "Rejection",
  FOLLOW_UP: "Follow-up",
  GENERAL_CAREER: "General Career",
  UNKNOWN: "Unknown",
};

/** The raw Gmail message data every classifier/extractor rule reads —
 * `subject`/`snippet`/`from*` only, never a body (see
 * `connectors/google/gmail.ts`'s own doc comment on why). */
export interface GmailMessageInput {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string;
  fromEmail: string | null;
  fromName: string | null;
  receivedAt: Date;
  isUnread: boolean;
}

export interface ClassificationResult {
  classification: GmailCareerClassification;
  /** `true` when a deterministic rule decided this — `false` means the
   * AI Router was needed (`classifier.ts`). */
  classifiedByRule: boolean;
}

/** Every field `extractor.ts` can produce — every one is optional/null
 * because the extractor only ever reports a field it actually matched in
 * the real subject/snippet/from text, never a guess. */
export interface ExtractedFields {
  company: string | null;
  role: string | null;
  location: string | null;
  interviewAt: Date | null;
  interviewDateText: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  assessmentLink: string | null;
  offerAmountText: string | null;
  applicationId: string | null;
  source: string | null;
  confidence: number;
}

/** One fully processed message — what `service.ts` persists as one
 * `GmailCareerEvent` row via `memory.ts`. */
export interface ProcessedGmailMessage {
  message: GmailMessageInput;
  classification: ClassificationResult;
  extracted: ExtractedFields;
}

export interface GmailSyncSummary {
  candidatesFound: number;
  alreadyProcessed: number;
  newlyProcessed: number;
  aiClassificationsUsed: number;
}

/** The token-free, already-persisted shape everything downstream (Career
 * Brain, the dashboard card, the Autonomous Agent) reads — a direct
 * reshape of `GmailCareerEvent`, never containing anything not already
 * in that row. */
export type GmailCareerEventDTO = Pick<
  GmailCareerEvent,
  | "id"
  | "gmailMessageId"
  | "threadId"
  | "classification"
  | "confidence"
  | "company"
  | "role"
  | "location"
  | "interviewAt"
  | "interviewDateText"
  | "recruiterName"
  | "recruiterEmail"
  | "assessmentLink"
  | "offerAmountText"
  | "applicationId"
  | "source"
  | "subject"
  | "snippet"
  | "fromEmail"
  | "fromName"
  | "isUnread"
  | "receivedAt"
>;

/** Career Brain's exposed Gmail Intelligence summary — Step 6's exact
 * list, each field a real, bounded slice of the same one query
 * (`memory.ts`'s `listRecentGmailCareerEvents`), never a second query
 * per bullet. */
export interface GmailIntelligenceSummary {
  connected: boolean;
  interviewInvitations: GmailCareerEventDTO[];
  pendingAssessments: GmailCareerEventDTO[];
  recentRecruiterActivity: GmailCareerEventDTO[];
  recentOffers: GmailCareerEventDTO[];
  recentRejections: GmailCareerEventDTO[];
  unreadCount: number;
}
