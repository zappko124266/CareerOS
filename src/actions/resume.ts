"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  createResume,
  deleteResume,
  parseResume,
  scoreResume,
} from "@/features/resume/service";
import type { ActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): ActionResult {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("resume.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function uploadResumeAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await verifySession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a PDF or DOCX file to upload." };
  }

  const titleInput = formData.get("title");
  const title =
    typeof titleInput === "string" && titleInput.trim()
      ? titleInput.trim()
      : file.name.replace(/\.[^/.]+$/, "");

  const supabase = await createClient();
  let resumeId: string;

  try {
    const resume = await createResume(supabase, {
      userId: user.id,
      title,
      file,
    });
    resumeId = resume.id;
  } catch (error) {
    return toActionError(
      error,
      "We couldn't upload that file. Please try again.",
    );
  }

  // Parsing runs in the same request (the file is already in memory) — any
  // failure here is captured on the Resume row itself (status = FAILED),
  // not surfaced as an action error, so the redirect below always succeeds.
  await parseResume(supabase, resumeId, user.id, { file });

  revalidatePath("/resume");
  redirect(`/resume/${resumeId}`);
}

const rescoreSchema = z.object({
  resumeId: z.uuid(),
  targetJobDescription: z.string().trim().max(10_000).optional(),
});

export async function rescoreResumeAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await verifySession();

  const parsed = rescoreSchema.safeParse({
    resumeId: formData.get("resumeId"),
    targetJobDescription: formData.get("targetJobDescription") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "That request wasn't valid." };
  }

  try {
    await scoreResume(
      parsed.data.resumeId,
      user.id,
      parsed.data.targetJobDescription,
    );
  } catch (error) {
    return toActionError(
      error,
      "We couldn't analyze that resume. Please try again.",
    );
  }

  revalidatePath(`/resume/${parsed.data.resumeId}`);
  return { status: "success" };
}

export async function deleteResumeAction(formData: FormData) {
  const user = await verifySession();
  const resumeId = formData.get("resumeId");

  if (typeof resumeId !== "string") {
    return;
  }

  const supabase = await createClient();
  await deleteResume(supabase, resumeId, user.id);

  revalidatePath("/resume");
  redirect("/resume");
}
