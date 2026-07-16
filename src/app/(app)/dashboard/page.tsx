import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await verifySession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>
      <EmptyState
        icon={LayoutDashboard}
        title="Nothing here yet"
        description="This is a placeholder — build the first feature on top of this scaffold."
      />
    </div>
  );
}
