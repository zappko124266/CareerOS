"use server";

import { redirect } from "next/navigation";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit";
import { clientEnv } from "@/lib/env.client";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types/action";

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

// Temporary diagnostic for the Supabase Auth connectivity investigation —
// remove once diagnosed.
function logIfAuthRetryableFetchError(error: unknown) {
  if (!(error instanceof AuthRetryableFetchError)) return;

  console.log("SIGNUP AUTH RETRYABLE FETCH ERROR NAME", error.name);
  console.log("SIGNUP AUTH RETRYABLE FETCH ERROR MESSAGE", error.message);
  console.log("SIGNUP AUTH RETRYABLE FETCH ERROR STATUS", error.status);
  console.log("SIGNUP AUTH RETRYABLE FETCH ERROR CAUSE", error.cause);
  console.dir(error, { depth: null });
}

export async function signInAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    await logAuditEvent("auth.sign_in_failed", {
      metadata: { email: parsed.data.email },
    });
    return { status: "error", message: error.message };
  }

  await logAuditEvent("auth.sign_in", { userId: data.user.id });

  const redirectTo = formData.get("redirectTo");
  redirect(
    typeof redirectTo === "string" && redirectTo ? redirectTo : "/dashboard",
  );
}

export async function signUpAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const supabase = await createClient();
  const { fullName, email, password } = parsed.data;

  console.log("SIGNUP SUPABASE URL", clientEnv.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    "SIGNUP SUPABASE ANON KEY PRESENT",
    Boolean(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];

  try {
    ({ data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    }));
  } catch (caughtError) {
    logIfAuthRetryableFetchError(caughtError);
    throw caughtError;
  }

  console.log("SIGNUP DATA", data);
  console.log("SIGNUP ERROR", error);
  logIfAuthRetryableFetchError(error);

  if (error) {
    return { status: "error", message: error.message };
  }

  await logAuditEvent("auth.sign_up", { userId: data.user?.id });

  return {
    status: "success",
    message: "Check your email to confirm your account before signing in.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  await logAuditEvent("auth.sign_out", { userId: user?.id });

  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=/reset-password`,
    },
  );

  if (error) {
    return { status: "error", message: error.message };
  }

  await logAuditEvent("auth.password_reset_requested", {
    metadata: { email: parsed.data.email },
  });

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  await logAuditEvent("auth.password_updated", { userId: user.id });

  redirect("/dashboard");
}
