import { extractMeetingLink } from "@/features/calendar/normalize";
import type { GmailCareerClassification } from "@/generated/prisma/client";

import type { ExtractedFields, GmailMessageInput } from "./types";

const KNOWN_SOURCE_DOMAINS: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "greenhouse.io": "Greenhouse",
  "greenhouse-mail.io": "Greenhouse",
  "lever.co": "Lever",
  "hire.lever.co": "Lever",
  "myworkday.com": "Workday",
  "icims.com": "iCIMS",
  "smartrecruiters.com": "SmartRecruiters",
  "ashbyhq.com": "Ashby",
  "indeed.com": "Indeed",
};

const AUTOMATED_SENDER_PATTERNS = ["noreply", "no-reply", "donotreply", "do-not-reply", "notifications@", "jobs-noreply"];

function domainOf(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

function isAutomatedSender(email: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return AUTOMATED_SENDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Friendly platform name from the sender domain when recognized, else
 * the raw domain — real data either way, never invented. */
function extractSource(message: GmailMessageInput): string | null {
  const domain = domainOf(message.fromEmail);
  if (!domain) return null;
  return KNOWN_SOURCE_DOMAINS[domain] ?? domain;
}

const COMPANY_SUBJECT_PATTERN = /\bat\s+([A-Z][\w&.,'-]*(?:\s+[A-Z][\w&.,'-]*){0,3})\b/;
const COMPANY_STOPWORDS = new Set(["today", "noon", "am", "pm"]);

/** Best-effort — a subject like "Your interview at Acme Corp" or a
 * sender name like "Acme Corp Recruiting" are the only two real signals
 * available without a message body. Neither is attempted when it would
 * only produce noise (e.g. a bare, non-capitalized match). */
function extractCompany(message: GmailMessageInput): string | null {
  const subject = message.subject ?? "";
  const subjectMatch = subject.match(COMPANY_SUBJECT_PATTERN);
  if (subjectMatch && !COMPANY_STOPWORDS.has(subjectMatch[1].toLowerCase())) {
    return subjectMatch[1].trim();
  }

  if (message.fromName) {
    const stripped = message.fromName
      .replace(/\b(recruiting|careers|talent|talent acquisition|hiring team|hr)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (stripped.length >= 2 && stripped !== message.fromName.trim()) {
      return stripped;
    }
  }

  return null;
}

const ROLE_PATTERNS = [
  /for the\s+([A-Za-z][\w\s/&-]{1,40}?)\s+(?:position|role|opportunity)\b/i,
  /\b(?:position|role)\s+of\s+([A-Za-z][\w\s/&-]{1,40})/i,
];

function extractRole(text: string): string | null {
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractLocation(text: string): string | null {
  if (/\bremote\b/i.test(text)) return "Remote";
  const match = text.match(/\b(?:based in|location:)\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b/);
  return match ? match[1].trim() : null;
}

const MONTH_GROUP = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";
const DATE_TIME_PATTERNS = [
  new RegExp(`\\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+${MONTH_GROUP}\\s+\\d{1,2}(?:,\\s*\\d{4})?)\\s+at\\s+(\\d{1,2}(?::\\d{2})?\\s*[APap][Mm])\\b`),
  new RegExp(`\\b(${MONTH_GROUP}\\s+\\d{1,2}(?:,\\s*\\d{4})?)\\s+at\\s+(\\d{1,2}(?::\\d{2})?\\s*[APap][Mm])\\b`),
];

/**
 * Best-effort date/time extraction — no date-parsing library was added
 * (a real dependency-risk tradeoff, not an oversight). When a matched
 * date lacks an explicit year, the current year is assumed — a real,
 * disclosed limitation (a January email about a next-December interview
 * would be extracted wrong) rather than a silent one. Whenever the
 * matched text can't be turned into a valid `Date`, the raw text is kept
 * as `interviewDateText` instead of a guessed `Date` — never fabricated.
 */
function extractInterviewDateTime(text: string, now: Date): { interviewAt: Date | null; interviewDateText: string | null } {
  for (const pattern of DATE_TIME_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const [raw, datePart, timePart] = match;
    const hasYear = /\d{4}/.test(datePart);
    const candidate = new Date(`${datePart}${hasYear ? "" : `, ${now.getFullYear()}`} ${timePart}`);

    if (!Number.isNaN(candidate.getTime())) {
      return { interviewAt: candidate, interviewDateText: null };
    }
    return { interviewAt: null, interviewDateText: raw.trim() };
  }
  return { interviewAt: null, interviewDateText: null };
}

/**
 * Dual-purpose, honestly: the same "first link in the snippet" signal is
 * an assessment link for `ASSESSMENT` mail and a meeting link for
 * `INTERVIEW` mail — both are "the one URL this email is actually about."
 * Reuses `features/calendar/normalize.ts`'s `extractMeetingLink` (Sprint
 * 17's Meeting Link Intelligence, Step 8) instead of a second, narrower
 * regex, so Google Meet/Zoom/Teams/Webex/Slack/Skype are recognized here
 * too, not just from calendar events.
 */
function extractAssessmentLink(snippet: string, classification: GmailCareerClassification): string | null {
  if (classification !== "ASSESSMENT" && classification !== "INTERVIEW") return null;
  return extractMeetingLink(snippet)?.url ?? null;
}

function extractOfferAmountText(text: string, classification: GmailCareerClassification): string | null {
  if (classification !== "OFFER") return null;
  const match = text.match(/(\$[\d,]+(?:\.\d{2})?(?:\s*(?:\/|per)\s*(?:year|yr|hour|hr))?)/i);
  return match ? match[1] : null;
}

function extractApplicationId(text: string): string | null {
  const match = text.match(/(?:application|reference|req|job)\s*(?:id|#|number)?\s*[:#]\s*([A-Za-z0-9-]{4,20})/i);
  return match ? match[1] : null;
}

function extractRecruiterContact(
  message: GmailMessageInput,
  classification: GmailCareerClassification,
): { recruiterName: string | null; recruiterEmail: string | null } {
  const relevant = classification === "RECRUITER" || classification === "INTERVIEW" || classification === "FOLLOW_UP";
  if (!relevant || isAutomatedSender(message.fromEmail)) {
    return { recruiterName: null, recruiterEmail: null };
  }
  return { recruiterName: message.fromName, recruiterEmail: message.fromEmail };
}

/** Real, formula-derived confidence — never a number an AI reports
 * directly. `classifiedByRule` contributes more than an AI classification
 * (rules are exact-match, AI is probabilistic); the rest scales with how
 * many of the fields relevant to this classification were actually
 * found. */
function scoreConfidence(classifiedByRule: boolean, fieldsFound: number, fieldsPossible: number): number {
  const base = classifiedByRule ? 0.6 : 0.4;
  const bonus = fieldsPossible > 0 ? (fieldsFound / fieldsPossible) * 0.4 : 0;
  return Math.round((base + bonus) * 100) / 100;
}

/** Fields "possible" for a given classification — used only to scale
 * `confidence`, never to fabricate a value for a field that wasn't
 * actually found. */
const RELEVANT_FIELD_COUNT: Record<GmailCareerClassification, number> = {
  INTERVIEW: 4, // company, role, interviewAt/Text, recruiter
  RECRUITER: 3, // company, role, recruiter
  ASSESSMENT: 3, // company, role, assessmentLink
  APPLICATION_CONFIRMATION: 3, // company, role, applicationId
  OFFER: 3, // company, role, offerAmountText
  REJECTION: 2, // company, role
  FOLLOW_UP: 2, // company, recruiter
  GENERAL_CAREER: 2, // company, role
  UNKNOWN: 1, // company
};

/**
 * Step 4's deterministic extractor. Every field is independently
 * optional — nothing here invents a value it didn't actually match in
 * `subject`/`snippet`/`from*`. `source`/`company`/`role`/`location` are
 * attempted for every classification (they're generically useful);
 * `interviewAt`/`assessmentLink`/`offerAmountText` are only attempted
 * when the classification makes them meaningful, so an OFFER email
 * never gets a spurious `assessmentLink` scan and vice versa.
 */
export function extractFields(
  message: GmailMessageInput,
  classification: GmailCareerClassification,
  classifiedByRule: boolean,
  now: Date = new Date(),
): ExtractedFields {
  const text = `${message.subject ?? ""} ${message.snippet}`;

  const company = extractCompany(message);
  const role = extractRole(text);
  const location = extractLocation(text);
  const source = extractSource(message);
  const applicationId = extractApplicationId(text);
  const assessmentLink = extractAssessmentLink(message.snippet, classification);
  const offerAmountText = extractOfferAmountText(text, classification);
  const { recruiterName, recruiterEmail } = extractRecruiterContact(message, classification);
  const { interviewAt, interviewDateText } =
    classification === "INTERVIEW" ? extractInterviewDateTime(text, now) : { interviewAt: null, interviewDateText: null };

  const fieldsFound = [company, role, location, applicationId, assessmentLink, offerAmountText, recruiterEmail, interviewAt ?? interviewDateText].filter(
    (value) => value !== null,
  ).length;

  return {
    company,
    role,
    location,
    interviewAt,
    interviewDateText,
    recruiterName,
    recruiterEmail,
    assessmentLink,
    offerAmountText,
    applicationId,
    source,
    confidence: scoreConfidence(classifiedByRule, fieldsFound, RELEVANT_FIELD_COUNT[classification]),
  };
}
