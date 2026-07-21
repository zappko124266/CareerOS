import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, LogOut, Sparkles } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

function initials(fullName: string | null, email: string) {
  const source = fullName ?? email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A minimal Settings hub — reuses `verifySession()`'s already-fetched
 * user, the existing Billing & Usage page, and the existing sign-out
 * action. No new account-management logic; this is a place to land those
 * links, not a new feature.
 */
export default async function SettingsPage() {
  const user = await verifySession();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Your account, billing, and session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{initials(user.fullName, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user.fullName ?? "Account"}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {user.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/onboarding">
              <Sparkles />
              Update career preferences
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/billing">
              <CreditCard />
              Billing &amp; usage
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <form action={signOutAction}>
            <Button type="submit" variant="destructive">
              <LogOut />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
