"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/actions/auth";
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

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    updatePasswordAction,
    IDLE_ACTION_STATE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Make it at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldError
              messages={
                state.status === "error"
                  ? state.fieldErrors?.password
                  : undefined
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldError
              messages={
                state.status === "error"
                  ? state.fieldErrors?.confirmPassword
                  : undefined
              }
            />
          </div>
          {state.status === "error" && !state.fieldErrors && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <SubmitButton className="w-full" pendingText="Updating…">
            Update password
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
