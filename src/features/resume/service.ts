import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateStructured } from "@/lib/ai/client";
import { DEFAULT_MODEL } from "@/lib/ai/models";
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
import { getOwnedResumeOrThrow } from "@/features/resume/queries";
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

    const parsedData = await generateStructured({
      schema: ResumeDataSchema,
      system: RESUME_PARSE_SYSTEM_PROMPT,
      prompt: buildResumeParsePrompt(rawText),
    });

    return await prisma.resume.update({
      where: { id: resumeId },
      data: {
        rawText,
        parsedData,
        status: "PARSED",
        aiModel: DEFAULT_MODEL,
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

  const result = await generateStructured({
    schema: ResumeAnalysisResultSchema,
    system: RESUME_SCORE_SYSTEM_PROMPT,
    prompt: buildResumeScorePrompt({
      resumeText: resume.rawText,
      targetJobDescription,
    }),
  });

  const overallScore = Math.round(
    Object.values(result.breakdown).reduce((sum, value) => sum + value, 0) /
      Object.values(result.breakdown).length,
  );

  return prisma.resumeAnalysis.create({
    data: {
      resumeId,
      overallScore,
      breakdown: result.breakdown,
      suggestions: result.suggestions,
      aiModel: DEFAULT_MODEL,
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
