import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { verifyRole } from "@/lib/auth/dal";
import { listUsersForAdmin } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Admin — Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await verifyRole(["ADMIN", "SUPER_ADMIN"]);
  const { q } = await searchParams;

  const users = await listUsersForAdmin(q);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/admin">
          <ArrowLeft />
          Back to Admin
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search by email or name to view a user&apos;s application timeline and set entitlement overrides.
        </p>
      </div>

      <form method="get" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by email or name…" aria-label="Search users" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">No users found.</p>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-medium">{user.fullName ?? user.email}</p>
                  <p className="text-muted-foreground wrap-break-word text-xs">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.planTier}</Badge>
                  <Badge variant="secondary">{user.role}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/users/${user.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
