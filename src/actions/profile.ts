"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { updateProfile } from "@/features/profile/service";
import type { UserDTO } from "@/lib/auth/dto";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("profile.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function updateProfileAction(fullName: string): Promise<DataActionResult<UserDTO>> {
  const user = await verifySession();

  try {
    const updated = await updateProfile(user.id, fullName);
    await logAuditEvent("profile.updated", { userId: user.id });
    revalidatePath("/settings/identity");
    revalidatePath("/settings");
    return { status: "success", data: updated };
  } catch (error) {
    return toActionError(error, "We couldn't update your name.");
  }
}
