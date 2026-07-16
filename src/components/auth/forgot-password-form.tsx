"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/actions/auth";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_ACTION_STATE } from "@/types/action";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    IDLE_ACTION_STATE,
  );

  if (state.status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <MailCheck className="text-primary size-10" />
          <p className="font-medium">Check your inbox</p>
          <p className="text-muted-foreground text-sm">{state.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll email you a link to get back in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            <FieldError
              messages={state.status === "error" ? state.fieldErrors?.email : undefined}
            />
          </div>
          {state.status === "error" && !state.fieldErrors && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <SubmitButton className="w-full" pendingText="Sending link…">
            Send reset link
          </SubmitButton>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Remembered it?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
