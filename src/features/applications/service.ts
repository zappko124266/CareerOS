import "server-only";

import {
  generateApplicationDocument,
  generateStrategyFactors,
  recommendFollowUp,
  reviewApplication,
  summarizeCompany,
} from "@/features/career-intelligence/applications";
import { analyzeExperienceGap } from "@/features/career-intelligence/skills";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";
import type {
  StrategyFactorKey,
  StrategyFactors,
} from "@/features/career-intelligence/applications/strategy/types";
import { analyzeJobMatch } from "@/features/career-intelligence/jobs";
import { getOwnedOpportunityOrThrow } from "@/features/opportunities/queries";
import { getLatestParsedResume, listResumesForUser } from "@/features/resume/queries";
import type { ResumeData } from "@/features/resume/schema";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Opportunity, Prisma, Resume } from "@/generated/prisma/client";

import type { ApplicationStrategyOutput, ExperienceGapAssessmentOutput } from "./format";
import { toExperienceGapAssessmentOutput } from "./format";
import {
  getOwnedApplicationDocumentOrThrow,
  getOwnedApplicationDocumentVersionOrThrow,
  getOwnedApplicationSubmissionOrThrow,
} from "./queries";
import {
  AUDIENCE_LABEL,
  DOCUMENT_KIND_LABEL,
  PRE_APPLICATION_STATUSES,
  SUBTYPE_LABEL,
} from "./types";
import type {
  ApplicationDocumentAction,
  ApplicationDocumentAudience,
  ApplicationDocumentKind,
  ApplicationDocumentLength,
  ApplicationDocumentSubtype,
  ApplicationDocumentTone,
} from "./types";

/** Resolves the resume text to ground AI generation in — whichever resume
 * is linked to this opportunity (set from the Documents tab), falling back
 * to the user's latest parsed resume if none is linked yet. Throws rather
 * than silently generating ungrounded content if no parsed resume exists
 * at all. Exported for reuse by other domains that need the exact same
 * "which resume grounds this opportunity's AI calls" resolution (e.g.
 * `features/interviews/service.ts`'s Interview Coach). */
export async function getApplicationResumeText(
  opportunity: Opportunity,
  userId: string,
): Promise<string> {
  const resume = opportunity.resumeId
    ? await prisma.resume.findUnique({ where: { id: opportunity.resumeId } })
    : await getLatestParsedResume(userId);

  if (!resume || resume.userId !== userId || resume.status !== "PARSED" || !resume.rawText) {
    throw new ValidationError(
      "Select (or upload and parse) a resume for this application before using AI features.",
    );
  }

  return resume.rawText;
}

function buildDocumentTitle(
  kind: ApplicationDocumentKind,
  subtype: ApplicationDocumentSubtype | undefined,
  audience: ApplicationDocumentAudience | undefined,
  companyName: string,
): string {
  if (subtype) return `${SUBTYPE_LABEL[subtype]} — ${companyName}`;
  if (audience) return `${DOCUMENT_KIND_LABEL[kind]} (${AUDIENCE_LABEL[audience]}) — ${companyName}`;
  return `${DOCUMENT_KIND_LABEL[kind]} — ${companyName}`;
}

export async function createApplicationDocument(
  opportunityId: string,
  userId: string,
  input: {
    kind: ApplicationDocumentKind;
    subtype?: ApplicationDocumentSubtype;
    audience?: ApplicationDocumentAudience;
    tone?: ApplicationDocumentTone;
    length?: ApplicationDocumentLength;
  },
) {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);
  const resumeText = await getApplicationResumeText(opportunity, userId);

  const result = await generateApplicationDocument({
    kind: input.kind,
    action: "GENERATE",
    subtype: input.subtype,
    audience: input.audience,
    tone: input.tone,
    length: input.length,
    resumeText,
    jobDescription: opportunity.description,
    companyName: opportunity.companyName,
    roleTitle: opportunity.title,
  });

  return prisma.applicationDocument.create({
    data: {
      opportunityId,
      kind: input.kind,
      subtype: input.subtype,
      audience: input.audience,
      tone: input.tone,
      length: input.length,
      title: buildDocumentTitle(input.kind, input.subtype, input.audience, opportunity.companyName),
      subjectLine: result.subjectLine ?? null,
      content: result.content,
      aiModel: null,
    },
  });
}

export async function reviseApplicationDocument(
  documentId: string,
  userId: string,
  action: ApplicationDocumentAction,
  tone?: ApplicationDocumentTone,
) {
  if (action === "GENERATE") {
    throw new ValidationError("Use \"Generate\" from the document list to create a new document.");
  }

  const document = await getOwnedApplicationDocumentOrThrow(documentId, userId);
  const resumeText = await getApplicationResumeText(document.opportunity, userId);

  const result = await generateApplicationDocument({
    kind: document.kind,
    action,
    subtype: document.subtype ?? undefined,
    audience: document.audience ?? undefined,
    tone: action === "CHANGE_TONE" ? tone : (document.tone ?? undefined),
    length: document.length ?? undefined,
    resumeText,
    jobDescription: document.opportunity.description,
    companyName: document.opportunity.companyName,
    roleTitle: document.opportunity.title,
    existingContent: document.content,
    existingSubjectLine: document.subjectLine ?? undefined,
  });

  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: {
      content: result.content,
      subjectLine: document.kind === "EMAIL" ? (result.subjectLine ?? document.subjectLine) : document.subjectLine,
      tone: action === "CHANGE_TONE" ? (tone ?? document.tone) : document.tone,
    },
  });
}

/** Live draft save — mirrors `saveResumeDraft`'s auto-save role. Never
 * creates a version; that's `createApplicationDocumentVersion` below. */
export async function saveApplicationDocumentDraft(
  documentId: string,
  userId: string,
  content: string,
  subjectLine?: string,
) {
  await getOwnedApplicationDocumentOrThrow(documentId, userId);

  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: subjectLine === undefined ? { content } : { content, subjectLine },
  });
}

export async function createApplicationDocumentVersion(
  documentId: string,
  userId: string,
  label: string,
) {
  const document = await getOwnedApplicationDocumentOrThrow(documentId, userId);

  return prisma.applicationDocumentVersion.create({
    data: {
      documentId: document.id,
      label,
      content: document.content,
      subjectLine: document.subjectLine,
    },
  });
}

export async function restoreApplicationDocumentVersion(
  documentId: string,
  userId: string,
  versionId: string,
) {
  const version = await getOwnedApplicationDocumentVersionOrThrow(versionId, userId);
  if (version.documentId !== documentId) {
    throw new ValidationError("That version doesn't belong to this document.");
  }

  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: { content: version.content, subjectLine: version.subjectLine },
  });
}

export async function duplicateApplicationDocument(documentId: string, userId: string) {
  const document = await getOwnedApplicationDocumentOrThrow(documentId, userId);

  return prisma.applicationDocument.create({
    data: {
      opportunityId: document.opportunityId,
      kind: document.kind,
      subtype: document.subtype,
      audience: document.audience,
      tone: document.tone,
      length: document.length,
      title: `${document.title} (copy)`,
      subjectLine: document.subjectLine,
      content: document.content,
      status: "DRAFT",
    },
  });
}

export async function archiveApplicationDocument(documentId: string, userId: string) {
  await getOwnedApplicationDocumentOrThrow(documentId, userId);
  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: { status: "ARCHIVED" },
  });
}

export async function unarchiveApplicationDocument(documentId: string, userId: string) {
  await getOwnedApplicationDocumentOrThrow(documentId, userId);
  return prisma.applicationDocument.update({
    where: { id: documentId },
    data: { status: "DRAFT" },
  });
}

export async function deleteApplicationDocument(documentId: string, userId: string) {
  await getOwnedApplicationDocumentOrThrow(documentId, userId);
  await prisma.applicationDocument.delete({ where: { id: documentId } });
}

/** Regenerates (and caches) the AI company summary for this opportunity —
 * one row per opportunity, updated in place, since this is a cache of a
 * derived summary rather than a history that needs preserving. */
export async function generateCompanySnapshot(opportunityId: string, userId: string) {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);

  const result = await summarizeCompany({
    companyName: opportunity.companyName,
    jobTitle: opportunity.title,
    jobDescription: opportunity.description,
  });

  return prisma.companySnapshot.upsert({
    where: { opportunityId },
    create: {
      opportunityId,
      aiSummary: result.summary,
      aiHighlights: result.highlights,
      aiCaveats: result.caveats,
      aiModel: "ai-router",
    },
    update: {
      aiSummary: result.summary,
      aiHighlights: result.highlights,
      aiCaveats: result.caveats,
      aiModel: "ai-router",
    },
  });
}

/** Runs the AI Application Review against whatever resume/cover
 * letter/email content currently exists for this opportunity — picks the
 * most recently updated non-archived document of each kind, so a review
 * always reflects the latest draft, not necessarily the first one
 * generated. */
export async function runApplicationReview(
  opportunityId: string,
  userId: string,
): Promise<ApplicationReviewOutput & { id: string; createdAt: Date }> {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);
  const resumeText = await getApplicationResumeText(opportunity, userId);

  const [latestCoverLetter, latestEmail] = await Promise.all([
    prisma.applicationDocument.findFirst({
      where: { opportunityId, kind: "COVER_LETTER", status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.applicationDocument.findFirst({
      where: { opportunityId, kind: "EMAIL", status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const result = await reviewApplication({
    resumeText,
    jobDescription: opportunity.description,
    companyName: opportunity.companyName,
    roleTitle: opportunity.title,
    coverLetterContent: latestCoverLetter?.content,
    emailContent: latestEmail?.content,
  });

  const row = await prisma.applicationReview.create({
    data: {
      opportunityId,
      readinessScore: result.overallReadiness,
      factors: result.factors as unknown as Prisma.InputJsonValue,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      missingKeywords: result.missingKeywords,
      missingSkills: result.missingSkills,
      suggestions: result.suggestions,
      recruiterPerspective: result.recruiterPerspective,
      atsPerspective: result.atsPerspective,
      aiModel: "ai-router",
    },
  });

  return { ...result, id: row.id, createdAt: row.createdAt };
}

// ---------------------------------------------------------------------------
// Module 2/3 — Smart Application Strategy & Smart Resume Selection
// ---------------------------------------------------------------------------

const MAX_RESUMES_TO_RANK = 5;

interface BestResumeSelection {
  resume: Resume;
  matchScore: number | null;
  matchSummary: string;
}

/** Picks the resume most likely to succeed for this specific job — reuses
 * `analyzeJobMatch` (Job Match Analysis) rather than re-implementing
 * matching logic. With only one parsed resume on file there's nothing to
 * rank, so it's selected directly with no AI call and an honest
 * `matchScore: null`. With more than one, every candidate (capped at
 * `MAX_RESUMES_TO_RANK` to bound AI cost) is scored against this job and
 * the highest-scoring one wins — a real, explainable selection, never a
 * guess. */
async function selectBestResume(
  userId: string,
  jobDescription: string,
): Promise<BestResumeSelection> {
  const resumes = await listResumesForUser(userId);
  const parsed = resumes.filter((resume) => resume.status === "PARSED" && resume.rawText);

  if (parsed.length === 0) {
    throw new ValidationError(
      "Upload and parse a resume before generating an application strategy.",
    );
  }

  if (parsed.length === 1) {
    return { resume: parsed[0], matchScore: null, matchSummary: "Only resume on file." };
  }

  const candidates = parsed.slice(0, MAX_RESUMES_TO_RANK);
  const ranked = await Promise.all(
    candidates.map(async (resume) => {
      const match = await analyzeJobMatch({ resumeText: resume.rawText!, jobDescription });
      return { resume, match };
    }),
  );

  ranked.sort((a, b) => b.match.matchScore - a.match.matchScore);
  const best = ranked[0];
  return { resume: best.resume, matchScore: best.match.matchScore, matchSummary: best.match.summary };
}

/** Runs the full Smart Application Strategy: selects the best resume
 * (Module 3), asks the AI to judge only the content-quality factors it can
 * actually assess from resume/job text, and merges in the presence-based
 * factors (cover letter, recruiter message, portfolio, LinkedIn) computed
 * here from real DB/resume state — never asked of the model, so they can
 * never be hallucinated. A new row per run, same versioned-AI-output
 * convention as `runApplicationReview`. */
export async function generateApplicationStrategy(
  opportunityId: string,
  userId: string,
): Promise<ApplicationStrategyOutput> {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);
  const bestResume = await selectBestResume(userId, opportunity.description);

  const [existingCoverLetter, existingRecruiterMessage] = await Promise.all([
    prisma.applicationDocument.findFirst({
      where: { opportunityId, kind: "COVER_LETTER", status: "DRAFT" },
    }),
    prisma.applicationDocument.findFirst({
      where: { opportunityId, kind: "RECRUITER_MESSAGE", status: "DRAFT" },
    }),
  ]);

  const parsedData = bestResume.resume.parsedData as unknown as ResumeData | null;
  const hasPortfolioLink = Boolean(parsedData?.contact?.links?.length);

  const aiResult = await generateStrategyFactors({
    resumeText: bestResume.resume.rawText!,
    jobDescription: opportunity.description,
    companyName: opportunity.companyName,
    roleTitle: opportunity.title,
  });

  const factors: StrategyFactors = {
    ...aiResult.factors,
    needsCoverLetter: existingCoverLetter
      ? { value: false, reasoning: "A cover letter has already been drafted for this application." }
      : { value: true, reasoning: "No cover letter has been drafted for this application yet." },
    needsRecruiterMessage: existingRecruiterMessage
      ? { value: false, reasoning: "A recruiter message has already been drafted for this application." }
      : { value: true, reasoning: "No recruiter message has been drafted for this application yet." },
    needsPortfolio: hasPortfolioLink
      ? { value: false, reasoning: "The selected resume already lists a portfolio or profile link." }
      : { value: true, reasoning: "The selected resume has no portfolio or profile links listed." },
    needsLinkedinUpdate: {
      value: false,
      reasoning:
        "LinkedIn isn't connected — CareerOS has no verified LinkedIn data to base this recommendation on.",
    },
  };

  const bestResumeReasoning =
    bestResume.matchScore !== null
      ? `Best match among your resumes (job match score ${bestResume.matchScore}/100): ${bestResume.matchSummary}`
      : bestResume.matchSummary;

  const reasoning: Record<string, string> = {
    ...Object.fromEntries(
      (Object.keys(factors) as StrategyFactorKey[]).map((key) => [key, factors[key].reasoning]),
    ),
    bestResume: bestResumeReasoning,
  };

  const row = await prisma.applicationStrategy.create({
    data: {
      opportunityId,
      bestResumeId: bestResume.resume.id,
      needsTailoring: factors.needsTailoring.value,
      needsAtsOptimization: factors.needsAtsOptimization.value,
      needsCoverLetter: factors.needsCoverLetter.value,
      needsRecruiterMessage: factors.needsRecruiterMessage.value,
      needsPortfolio: factors.needsPortfolio.value,
      needsCertifications: factors.needsCertifications.value,
      needsLinkedinUpdate: factors.needsLinkedinUpdate.value,
      needsResumeRewrite: factors.needsResumeRewrite.value,
      needsSkillImprovement: factors.needsSkillImprovement.value,
      confidence: Math.round(aiResult.confidence),
      reasoning: reasoning as Prisma.InputJsonValue,
      aiModel: "ai-router",
    },
  });

  return {
    id: row.id,
    createdAt: row.createdAt,
    bestResumeId: bestResume.resume.id,
    bestResumeReasoning,
    confidence: row.confidence,
    factors,
  };
}

/** Sprint 9, Module 8 — Career Gap Engine for one specific opportunity.
 * Persists a new `ExperienceGapAssessment` row per run (same
 * versioned-AI-output convention as `generateApplicationStrategy` right
 * above), which is also what Module 7's `careerGapReadiness` score factor
 * reads back later without triggering a fresh AI call. Uses the same
 * `selectBestResume` resolution as the Strategy engine rather than
 * requiring `Opportunity.resumeId` to be set. */
export async function generateExperienceGapAssessment(
  opportunityId: string,
  userId: string,
): Promise<ExperienceGapAssessmentOutput> {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);
  const bestResume = await selectBestResume(userId, opportunity.description);

  const aiResult = await analyzeExperienceGap({
    resumeText: bestResume.resume.rawText!,
    targetJobDescription: opportunity.description,
  });

  const row = await prisma.experienceGapAssessment.create({
    data: {
      opportunityId,
      gaps: aiResult.gaps as unknown as Prisma.InputJsonValue,
      overallReadiness: aiResult.overallReadiness,
      mitigationSuggestions: aiResult.mitigationSuggestions as unknown as Prisma.InputJsonValue,
      aiModel: "ai-router",
    },
  });

  return toExperienceGapAssessmentOutput(row);
}

// ---------------------------------------------------------------------------
// Module 9 — AI Follow-up Engine
// ---------------------------------------------------------------------------

/** Computes real day-counts from `Opportunity.statusHistory` (never
 * estimated) to ground the Follow-up Engine's recommendation — the AI is
 * only ever given real elapsed time and status, never asked to guess at
 * dates itself. */
function computeFollowUpTiming(opportunity: Opportunity) {
  const history = (opportunity.statusHistory ?? []) as Array<{
    status: string;
    changedAt: string;
  }>;

  const lastChangeAt =
    history.length > 0
      ? new Date(history[history.length - 1].changedAt)
      : opportunity.updatedAt;
  const daysSinceLastUpdate = Math.max(
    0,
    Math.floor((Date.now() - lastChangeAt.getTime()) / (24 * 60 * 60 * 1000)),
  );

  const appliedEntry = history.find((entry) => entry.status === "APPLIED");
  const daysSinceApplied = appliedEntry
    ? Math.max(0, Math.floor((Date.now() - new Date(appliedEntry.changedAt).getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  const hasRecruiterContact =
    opportunity.status === "RECRUITER_CONTACT" ||
    history.some((entry) => entry.status === "RECRUITER_CONTACT");

  return { daysSinceLastUpdate, daysSinceApplied, hasRecruiterContact };
}

export interface FollowUpRecommendationResult {
  id: string;
  createdAt: Date;
  recommendationType: string;
  reasoning: string;
  confidence: number;
}

/** Runs the AI Follow-up Engine for one opportunity — only meaningful once
 * an application has actually been submitted (or further along); throws
 * for anything still in a pre-submission state rather than fabricating a
 * recommendation about a follow-up that can't exist yet. A new row per
 * run, same versioned-AI-output convention as the other AI features. */
export async function generateFollowUpRecommendation(
  opportunityId: string,
  userId: string,
): Promise<FollowUpRecommendationResult> {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);

  if ((PRE_APPLICATION_STATUSES as readonly string[]).includes(opportunity.status)) {
    throw new ValidationError(
      "This application hasn't been submitted yet — there's nothing to follow up on.",
    );
  }

  const timing = computeFollowUpTiming(opportunity);

  const result = await recommendFollowUp({
    roleTitle: opportunity.title,
    companyName: opportunity.companyName,
    currentStatus: opportunity.status,
    daysSinceLastUpdate: timing.daysSinceLastUpdate,
    daysSinceApplied: timing.daysSinceApplied,
    hasRecruiterContact: timing.hasRecruiterContact,
  });

  const row = await prisma.followUpRecommendation.create({
    data: {
      opportunityId,
      recommendationType: result.recommendationType,
      reasoning: result.reasoning,
      confidence: Math.round(result.confidence),
      aiModel: "ai-router",
    },
  });

  return {
    id: row.id,
    createdAt: row.createdAt,
    recommendationType: row.recommendationType,
    reasoning: row.reasoning,
    confidence: row.confidence,
  };
}

// ---------------------------------------------------------------------------
// Module 7 — Submission Engine (honest, user-confirmed manual workflows)
// ---------------------------------------------------------------------------

/**
 * CareerOS has no real third-party application-submission API for any
 * connector (confirmed during this sprint's audit — Greenhouse/Lever's
 * public APIs are read-only job-board listing APIs, not submission APIs),
 * and the platform must never bypass a site's login or anti-automation
 * protections. Every submission this creates is therefore the record of
 * something the *user* did themselves in their own browser/inbox, which
 * they then confirm back to CareerOS — never something CareerOS did on
 * their behalf. See `SubmissionMethod`'s doc comment in
 * `prisma/schema.prisma`.
 */
export async function recordApplicationSubmission(
  opportunityId: string,
  userId: string,
  input: {
    method: "COMPANY_CAREER_PAGE_MANUAL" | "EMAIL_MANUAL" | "USER_APPROVED_BROWSER_MANUAL";
    coverLetterDocumentId?: string;
    recruiterMessageDocumentId?: string;
    emailDocumentId?: string;
    notes?: string;
  },
) {
  const opportunity = await getOwnedOpportunityOrThrow(opportunityId, userId);
  const resume = opportunity.resumeId
    ? await prisma.resume.findUnique({ where: { id: opportunity.resumeId } })
    : await getLatestParsedResume(userId);

  const submission = await prisma.applicationSubmission.create({
    data: {
      opportunityId,
      method: input.method,
      result: "CONFIRMED",
      connectorSource: opportunity.source,
      resumeId: resume?.id,
      coverLetterDocumentId: input.coverLetterDocumentId,
      recruiterMessageDocumentId: input.recruiterMessageDocumentId,
      emailDocumentId: input.emailDocumentId,
      submittedAt: new Date(),
      notes: input.notes,
    },
  });

  await transitionOpportunityStatus(opportunity, "APPLIED");

  logger.info("applications.submission_recorded", {
    opportunityId,
    method: input.method,
  });

  return submission;
}

/** Marks a submission attempt as failed and increments its retry count —
 * the retry itself is a brand new `recordApplicationSubmission` call once
 * the user confirms they actually completed it; this just closes out the
 * failed attempt so its history stays visible. */
export async function recordFailedSubmission(
  submissionId: string,
  userId: string,
  failureReason: string,
) {
  const submission = await getOwnedApplicationSubmissionOrThrow(submissionId, userId);

  return prisma.applicationSubmission.update({
    where: { id: submission.id },
    data: {
      result: "FAILED",
      failureReason,
      retryCount: submission.retryCount + 1,
    },
  });
}

/** Appends to `Opportunity.statusHistory` and updates `status` in one
 * transaction — the one place any code path is allowed to change an
 * opportunity's lifecycle status, so the audit trail can never drift out
 * of sync with the actual status. */
export async function transitionOpportunityStatus(
  opportunity: Opportunity,
  nextStatus: Opportunity["status"],
) {
  const history = (opportunity.statusHistory ?? []) as Array<{
    status: string;
    changedAt: string;
  }>;

  return prisma.opportunity.update({
    where: { id: opportunity.id },
    data: {
      status: nextStatus,
      statusHistory: [
        ...history,
        { status: nextStatus, changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}
