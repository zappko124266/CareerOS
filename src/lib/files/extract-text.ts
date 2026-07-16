import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import { ParsingError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Extracts plain text from a resume file's raw bytes. Takes a buffer +
 * mimeType (rather than a `File`/`Blob`) so it works the same whether the
 * bytes came from an in-memory upload or a re-download from Storage. PDF
 * uses `unpdf` (PDF.js compiled for serverless/edge — no filesystem access
 * needed); DOCX uses `mammoth`. Anything else is rejected before reaching
 * this point (see `RESUME_ALLOWED_MIME_TYPES` in
 * `src/lib/storage/resume-bucket.ts`).
 */
export async function extractResumeText(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return text.trim();
    }

    if (mimeType === DOCX_MIME_TYPE) {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      return result.value.trim();
    }

    throw new ParsingError(`Unsupported file type: ${mimeType}`);
  } catch (error) {
    if (error instanceof ParsingError) throw error;

    logger.error("files.extract_text_failed", {
      mimeType,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ParsingError(
      "We couldn't read that file. Make sure it's a valid PDF or DOCX.",
      {
        cause: error,
      },
    );
  }
}
