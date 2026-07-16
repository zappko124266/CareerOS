import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const RESUME_BUCKET = "resumes";
export const RESUME_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const RESUME_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * Storage helpers scoped to the "resumes" bucket. Always called with the
 * caller's own per-request Supabase client (`src/lib/supabase/server.ts`),
 * not the admin client — Storage RLS (see `prisma/sql/002_resume_storage.sql`)
 * enforces the `{userId}/...` folder scoping via the user's own JWT.
 */

function objectPath(userId: string, resumeId: string, filename: string) {
  return `${userId}/${resumeId}/${filename}`;
}

export async function uploadResumeFile(
  supabase: SupabaseClient,
  params: { userId: string; resumeId: string; filename: string; file: File },
): Promise<{ path: string }> {
  const path = objectPath(params.userId, params.resumeId, params.filename);

  const { error } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    logger.error("storage.resume_upload_failed", {
      userId: params.userId,
      message: error.message,
    });
    throw new AppError(
      "STORAGE_UPLOAD_FAILED",
      "We couldn't save that file. Please try again.",
      {
        cause: error,
      },
    );
  }

  return { path };
}

export async function deleteResumeFile(
  supabase: SupabaseClient,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(RESUME_BUCKET).remove([path]);

  if (error) {
    logger.error("storage.resume_delete_failed", {
      path,
      message: error.message,
    });
    throw new AppError(
      "STORAGE_DELETE_FAILED",
      "We couldn't delete that file. Please try again.",
      {
        cause: error,
      },
    );
  }
}

export async function getResumeSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    logger.error("storage.resume_signed_url_failed", {
      path,
      message: error?.message,
    });
    throw new AppError(
      "STORAGE_SIGNED_URL_FAILED",
      "We couldn't open that file. Please try again.",
      {
        cause: error,
      },
    );
  }

  return data.signedUrl;
}

export async function downloadResumeFile(
  supabase: SupabaseClient,
  path: string,
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .download(path);

  if (error || !data) {
    logger.error("storage.resume_download_failed", {
      path,
      message: error?.message,
    });
    throw new AppError(
      "STORAGE_DOWNLOAD_FAILED",
      "We couldn't read that file. Please try again.",
      {
        cause: error,
      },
    );
  }

  return data;
}
