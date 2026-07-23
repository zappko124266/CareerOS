import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateObject } from "@/lib/ai";
import { ValidationError } from "@/lib/errors";
import { extractResumeText } from "@/lib/files/extract-text";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  RESUME_ALLOWED_MIME_TYPES,
  RESUME_MAX_FILE_SIZE_BYTES,
  deleteResumeFile,
  downloadResumeFile,
  uploadResumeFile,
} from "@/lib/storage/resume-bucket";
import {
  buildResumeParsePrompt,
  buildResumeScorePrompt,
  RESUME_PARSE_SYSTEM_PROMPT,
  RESUME_SCORE_SYSTEM_PROMPT,
} from "@/features/resume/prompts";
import {
  getOwnedResumeOrThrow,
  getOwnedResumeVersionOrThrow,
} from "@/features/resume/queries";
import {
  ResumeAnalysisResultSchema,
  ResumeDataSchema,
} from "@/features/resume/schema";
import type { Resume } from "@/generated/prisma/client";

export function assertValidResumeFile(file: File) {
  if (
    !RESUME_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof RESUME_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new ValidationError("Only PDF and DOCX files are supported.");
  }

  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    throw new ValidationError("File is too large — the limit is 5 MB.");
  }

  if (file.size === 0) {
    throw new ValidationError("That file appears to be empty.");
  }
}

/** Uploads the file to Storage and creates the Resume row (status UPLOADED). */
export async function createResume(
  supabase: SupabaseClient,
  params: { userId: string; title: string; file: File },
): Promise<Resume> {
  const { userId, title, file } = params;
  assertValidResumeFile(file);

  const resumeId = crypto.randomUUID();

  const { path } = await uploadResumeFile(supabase, {
    userId,
    resumeId,
    filename: file.name,
    file,
  });

  try {
    return await prisma.resume.create({
      data: {
        id: resumeId,
        userId,
        title,
        originalFilename: file.name,
        storagePath: path,
        mimeType: file.type,
        fileSizeBytes: file.size,
        status: "UPLOADED",
      },
    });
  } catch (error) {
    // Best-effort cleanup — don't leave an orphaned file if the DB write failed.
    await deleteResumeFile(supabase, path).catch(() => undefined);
    throw error;
  }
}

/**
 * Extracts text and runs the AI structured-parse. Pass `file` when it's
 * still in memory from the same request (the common case, right after
 * upload) to skip a round-trip back to Storage; omit it to re-parse an
 * existing resume (re-downloads via Storage instead).
 */
export async function parseResume(
  supabase: SupabaseClient,
  resumeId: string,
  userId: string,
  options: { file?: File } = {},
): Promise<Resume> {
  const resume = await getOwnedResumeOrThrow(resumeId, userId);

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "PARSING" },
  });

  try {
    const buffer = options.file
      ? await options.file.arrayBuffer()
      : await (
          await downloadResumeFile(supabase, resume.storagePath)
        ).arrayBuffer();

    const rawText = await extractResumeText(buffer, resume.mimeType);

    const parsed = await generateObject({
      schema: ResumeDataSchema,
      system: RESUME_PARSE_SYSTEM_PROMPT,
      prompt: buildResumeParsePrompt(rawText),
    });

    return await prisma.resume.update({
      where: { id: resumeId },
      data: {
        rawText,
        parsedData: parsed.object,
        status: "PARSED",
        aiModel: parsed.model,
        failureReason: null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error.";
    logger.error("resume.parse_failed", { resumeId, userId, message });

    return prisma.resume.update({
      where: { id: resumeId },
      data: { status: "FAILED", failureReason: message },
    });
  }
}

/** Scores an already-parsed resume, optionally against a target job description. */
export async function scoreResume(
  resumeId: string,
  userId: string,
  targetJobDescription?: string,
) {
  const resume = await getOwnedResumeOrThrow(resumeId, userId);

  if (resume.status !== "PARSED" || !resume.rawText) {
    throw new ValidationError(
      "This resume needs to finish parsing before it can be scored.",
    );
  }

  const result = await generateObject({
    schema: ResumeAnalysisResultSchema,
    system: RESUME_SCORE_SYSTEM_PROMPT,
    prompt: buildResumeScorePrompt({
      resumeText: resume.rawText,
      targetJobDescription,
    }),
  });

  const overallScore = Math.round(
    Object.values(result.object.breakdown).reduce(
      (sum, value) => sum + value,
      0,
    ) / Object.values(result.object.breakdown).length,
  );

  return prisma.resumeAnalysis.create({
    data: {
      resumeId,
      overallScore,
      breakdown: result.object.breakdown,
      suggestions: result.object.suggestions,
      aiModel: result.model,
    },
  });
}

export async function deleteResume(
  supabase: SupabaseClient,
  resumeId: string,
  userId: string,
) {
  const resume = await getOwnedResumeOrThrow(resumeId, userId);
  await deleteResumeFile(supabase, resume.storagePath);
  await prisma.resume.delete({ where: { id: resumeId } });
}

/**
 * Resume Studio's auto-save — updates the live, editable content in place.
 * Deliberately does *not* create a `ResumeVersion`; that's an explicit,
 * user-triggered checkpoint (`createResumeVersion` below), not something
 * that happens on every debounced keystroke-driven save.
 */
export async function saveResumeDraft(
  resumeId: string,
  userId: string,
  data: unknown,
): Promise<Resume> {
  await getOwnedResumeOrThrow(resumeId, userId);
  const parsed = ResumeDataSchema.parse(data);

  return prisma.resume.update({
    where: { id: resumeId },
    data: { parsedData: parsed },
  });
}

export async function createResumeVersion(
  resumeId: string,
  userId: string,
  label: string,
  /** Sprint 11 — set when this version was saved from the Resume Studio's
   * "tailor for a saved opportunity" flow, making "company-specific
   * variant" a real, queryable concept. `targetCompanyName` is a
   * denormalized snapshot alongside the relation (same pattern as
   * `ApplicationSubmission.connectorSource`) so the label stays
   * meaningful even if the opportunity is later deleted. */
  target?: { opportunityId: string; companyName: string },
) {
  const resume = await getOwnedResumeOrThrow(resumeId, userId);

  if (!resume.parsedData) {
    throw new ValidationError(
      "This resume has no content yet to save as a version.",
    );
  }

  return prisma.resumeVersion.create({
    data: {
      resumeId,
      label,
      data: resume.parsedData,
      targetOpportunityId: target?.opportunityId,
      targetCompanyName: target?.companyName,
    },
  });
}

/** Restores a saved version as the resume's live, editable content — the
 * version row itself is untouched, so restoring never loses history. */
export async function restoreResumeVersion(
  resumeId: string,
  userId: string,
  versionId: string,
): Promise<Resume> {
  const version = await getOwnedResumeVersionOrThrow(
    versionId,
    resumeId,
    userId,
  );

  // Re-validate against the current schema rather than trusting the
  // stored snapshot blindly — also resolves the stored `Json` value to a
  // concrete `ResumeData` object for Prisma's setter.
  const data = ResumeDataSchema.parse(version.data);

  return prisma.resume.update({
    where: { id: resumeId },
    data: { parsedData: data },
  });
}
