"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  completeOnboarding,
  saveOnboardingProgress,
} from "@/features/onboarding/service";
import { OnboardingProgressInputSchema } from "@/features/onboarding/schema";
import type { DataActionResult } from "@/types/action";

function toActionError(error: unknown, fallbackMessage: string): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("onboarding.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

/**
 * Saves just the wizard's step position — the actual step *data* (career
 * stage, target roles, location, skills, salary, company preferences,
 * career goals) is saved by the existing `updateDiscoveryPreferenceAction`
 * / `updateCareerGoalAction`, called directly from the wizard. This is
 * what makes the wizard resumable: reloading `/onboarding` reads
 * `onboardingStep` back and jumps straight to it.
 */
export async function saveOnboardingProgressAction(
  input: unknown,
): Promise<DataActionResult<{ step: number }>> {
  const user = await verifySession();

  const parsed = OnboardingProgressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That step wasn't valid." };
  }

  try {
    await saveOnboardingProgress(user.id, parsed.data.step);
    return { status: "success", data: { step: parsed.data.step } };
  } catch (error) {
    return toActionError(error, "We couldn't save your progress.");
  }
}

export async function completeOnboardingAction(): Promise<DataActionResult<{ completed: true }>> {
  const user = await verifySession();

  try {
    await completeOnboarding(user.id);
    await logAuditEvent("onboarding.completed", { userId: user.id });
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    return { status: "success", data: { completed: true } };
  } catch (error) {
    return toActionError(error, "We couldn't finish onboarding right now.");
  }
}
