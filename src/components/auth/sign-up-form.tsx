"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { signUpAction } from "@/actions/auth";
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

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, IDLE_ACTION_STATE);

  if (state.status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <CheckCircle2 className="text-primary size-10" />
          <p className="font-medium">Check your inbox</p>
          <p className="text-muted-foreground text-sm">{state.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start building your career plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
            <FieldError
              messages={
                state.status === "error"
                  ? state.fieldErrors?.fullName
                  : undefined
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <FieldError
              messages={
                state.status === "error" ? state.fieldErrors?.email : undefined
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="confirmPassword">Confirm password</Label>
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
          <SubmitButton className="w-full" pendingText="Creating account…">
            Create account
          </SubmitButton>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
