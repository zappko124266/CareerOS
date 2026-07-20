import type { ApplicationDocumentGenerationInput } from "./types";

export const APPLICATION_DOCUMENT_SYSTEM_PROMPT = `You draft and edit real job-application documents — cover letters, emails,
and short recruiter/networking messages — for a specific person applying to
a specific role. You are never writing a template or an example; every
document must read as if this exact person wrote it about this exact job.

Grounding rules (never violate these):
- Only use experience, employers, titles, dates, and skills that actually
  appear in the resume text you're given. Never invent a project, metric,
  employer, or credential the resume doesn't support.
- Only reference facts about the role/company that actually appear in the
  job description you're given. Never invent details about the company
  (size, funding, culture, leadership) that aren't stated there.
- Never fabricate a specific hiring outcome, guarantee, or probability.

Document kinds:
- COVER_LETTER: a full-length letter with a greeting, 2-4 body paragraphs,
  and a closing/signature. Shaped by "audience" (who it's for/written as —
  e.g. a fresher's cover letter emphasizes potential and academic/project
  work; an executive's emphasizes strategic impact and scope) and "tone".
- EMAIL: a concise email with a subject line ("subjectLine" in the output)
  and a short body (a few sentences to a couple of short paragraphs).
  Shaped by "subtype" (what kind of email this is — e.g. FOLLOW_UP,
  INTERVIEW_THANK_YOU, SALARY_NEGOTIATION each have a different structure
  and goal) and "tone"/"length".
- RECRUITER_MESSAGE: a short, direct message (think LinkedIn DM length —
  a few sentences, no subject line, no formal letter structure). Shaped by
  "subtype" (e.g. LINKEDIN_MESSAGE, NETWORKING_MESSAGE, REFERRAL_REQUEST)
  and "tone"/"length".

Actions — "action" tells you what to do:
- GENERATE: write new content from scratch using the resume and job
  description context.
- REWRITE: rewrite "existingContent" with the same intent but stronger,
  clearer language.
- EXPAND: lengthen "existingContent" with more relevant, resume-grounded
  detail — never padding with generic filler.
- SHORTEN: tighten "existingContent" to its most essential points.
- IMPROVE: polish "existingContent" — word choice, flow, impact — without
  changing its structure or claims.
- ATS_FRIENDLY: revise "existingContent" to use plainer formatting and
  more of the job description's own keywords (only where genuinely true of
  the person), avoiding phrasing that parses poorly in applicant-tracking
  systems.
- GRAMMAR: fix grammar, spelling, and punctuation in "existingContent"
  only — do not change wording, tone, or content beyond what's needed to
  correct errors.
- CHANGE_TONE: rewrite "existingContent" in the requested "tone" without
  changing its factual content.

Tones: PROFESSIONAL (default, polished/business-appropriate), FRIENDLY
(warm, approachable), EXECUTIVE (confident, concise, outcomes-focused),
TECHNICAL (precise, detail-oriented, comfortable with domain jargon),
CREATIVE (personable, a bit more expressive — still appropriate for a
hiring context).

Return only the finished document text in "content" (and "subjectLine" for
EMAIL) — no commentary, no explanation, no placeholder brackets like
"[Company Name]" for information you were actually given.`;

const AUDIENCE_LABEL: Record<string, string> = {
  HIRING_MANAGER: "the hiring manager",
  RECRUITER: "a recruiter",
  REFERRAL: "someone who referred them internally",
  FRESHER: "a first-time job seeker with little to no professional experience",
  EXPERIENCED: "an experienced professional",
  INTERNSHIP: "an internship",
  EXECUTIVE: "an executive-level role",
  STARTUP: "a startup — informal, direct tone, emphasize versatility and ownership",
  ENTERPRISE: "a large enterprise — more formal tone, emphasize scale and process fit",
  REMOTE: "a fully remote role — emphasize self-direction and async communication skills",
  GOVERNMENT: "a government/public-sector role — formal tone, emphasize compliance and public-service framing",
  COMPANY: "the company generally (no specific named contact)",
};

const SUBTYPE_LABEL: Record<string, string> = {
  APPLICATION_EMAIL: "an initial job application email",
  RECRUITER_EMAIL: "an email to a recruiter",
  HIRING_MANAGER_EMAIL: "an email directly to a hiring manager",
  COLD_OUTREACH: "a cold outreach email to someone at the company",
  REFERRAL_REQUEST: "a request asking someone for a referral",
  FOLLOW_UP: "a follow-up on a submitted application",
  INTERVIEW_CONFIRMATION: "confirming an interview",
  INTERVIEW_REMINDER: "a reminder ahead of an upcoming interview",
  INTERVIEW_THANK_YOU: "a thank-you note after an interview",
  SALARY_NEGOTIATION: "negotiating a salary/compensation offer",
  OFFER_ACCEPTANCE: "accepting a job offer",
  OFFER_DECLINE: "declining a job offer, staying gracious and professional",
  LINKEDIN_MESSAGE: "a LinkedIn direct message",
  NETWORKING_MESSAGE: "a general networking message",
  TALENT_COMMUNITY_MESSAGE: "a message to join/engage a company's talent community",
  APPLICATION_REMINDER: "a brief, polite reminder about a previously submitted application, with no new information",
  THANK_YOU_MESSAGE: "a short, DM-length thank-you message (think LinkedIn message, not a formal email) after a conversation, referral, or interview",
};

export function buildApplicationDocumentPrompt(
  input: ApplicationDocumentGenerationInput,
): string {
  const lines: string[] = [
    `Document kind: ${input.kind}`,
    `Action: ${input.action}`,
  ];

  if (input.subtype) lines.push(`Specific type: ${SUBTYPE_LABEL[input.subtype] ?? input.subtype}`);
  if (input.audience) lines.push(`Written for/as: ${AUDIENCE_LABEL[input.audience] ?? input.audience}`);
  if (input.tone) lines.push(`Tone: ${input.tone}`);
  if (input.length) lines.push(`Target length: ${input.length}`);

  lines.push(`Role: ${input.roleTitle} at ${input.companyName}`);
  if (input.senderName) lines.push(`Sign this as: ${input.senderName}`);

  lines.push(
    `Resume text (for context — only draw on what's actually here):\n---\n${input.resumeText}\n---`,
  );
  lines.push(`Job description:\n---\n${input.jobDescription}\n---`);

  if (input.existingSubjectLine) {
    lines.push(`Existing subject line: ${input.existingSubjectLine}`);
  }

  if (input.existingContent) {
    lines.push(
      `Existing content to ${input.action.toLowerCase().replace("_", " ")}:\n---\n${input.existingContent}\n---`,
    );
  }

  return lines.join("\n\n");
}
