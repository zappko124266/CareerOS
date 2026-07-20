import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ApplicationAnalyticsDashboard } from "@/components/opportunities/application-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { computeApplicationAnalytics } from "@/features/analytics/service";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Application Analytics" };

export default async function ApplicationAnalyticsPage() {
  const user = await verifySession();
  const analytics = await computeApplicationAnalytics(user.id);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every number below is a real aggregate computed from your own application history —
          nothing here is estimated or fabricated.
        </p>
      </div>

      <ApplicationAnalyticsDashboard analytics={analytics} />
    </div>
  );
}
