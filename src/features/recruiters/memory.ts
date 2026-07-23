import type { GmailCareerEventDTO } from "@/features/gmail-intelligence/types";

interface RecruiterEmailLike {
  id: string;
  email: string | null;
}

/**
 * Module 13/9 — Gmail Intelligence reuse for recruiter matching. Pure,
 * in-memory matching over `GmailCareerEventDTO[]` this caller already
 * has (Career Brain's `gmailIntelligence.recentRecruiterActivity` bucket,
 * or a direct `listGmailEventsForRecruiterEmail` read on the per-recruiter
 * page) — never a Gmail API call, never a second classification pass.
 * Matches on either the message's `fromEmail` or its extracted
 * `recruiterEmail`, case-insensitive.
 */
export function matchGmailEventsToRecruiter(
  recruiter: RecruiterEmailLike,
  gmailEvents: GmailCareerEventDTO[],
): GmailCareerEventDTO[] {
  if (!recruiter.email) return [];
  const normalizedEmail = recruiter.email.trim().toLowerCase();

  return gmailEvents.filter(
    (event) =>
      event.fromEmail?.trim().toLowerCase() === normalizedEmail ||
      event.recruiterEmail?.trim().toLowerCase() === normalizedEmail,
  );
}

/** Module 9 — Networking Opportunity Detection, the one sub-case with
 * real supporting data: Gmail-classified recruiter activity whose sender
 * email doesn't match any recruiter already in the CRM. Surfaced as a
 * *suggestion* only — never auto-created (Hard Lock: never fabricate
 * recruiter information), the same restraint Sprint 17 exercised for
 * Gmail-detected interviews (real match required, never a guess). */
export function findUnlinkedRecruiterActivity(
  recruiters: RecruiterEmailLike[],
  gmailEvents: GmailCareerEventDTO[],
): GmailCareerEventDTO[] {
  const knownEmails = new Set(
    recruiters.map((recruiter) => recruiter.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)),
  );

  return gmailEvents.filter((event) => {
    const email = event.fromEmail?.trim().toLowerCase() ?? event.recruiterEmail?.trim().toLowerCase();
    return Boolean(email) && !knownEmails.has(email!);
  });
}
