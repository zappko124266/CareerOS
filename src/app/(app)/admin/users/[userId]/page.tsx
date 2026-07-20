import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EntitlementOverridePanel } from "@/components/admin/entitlement-override-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { verifyRole } from "@/lib/auth/dal";
import {
  getUserApplicationTimeline,
  getUserCareerHealthHistory,
  getUserForAdmin,
  getUserInterviewTimeline,
  getUserOfferHistory,
  getUserRecruiterHistory,
} from "@/features/admin/queries";
import { listEntitlementOverridesForUser } from "@/features/entitlements/queries";
import { INTERVIEW_STAGE_LABEL } from "@/features/interviews/types";
import type { InterviewStage } from "@/features/interviews/types";
import { STATUS_LABEL } from "@/features/opportunities/types";
import type { OpportunityStatus } from "@/features/opportunities/types";

export const metadata: Metadata = { title: "Admin — User Detail" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await verifyRole(["ADMIN", "SUPER_ADMIN"]);
  const { userId } = await params;

  const user = await getUserForAdmin(userId);
  if (!user) {
    notFound();
  }

  const [timeline, overrides, interviews, recruiters, offers, healthHistory] = await Promise.all([
    getUserApplicationTimeline(userId),
    listEntitlementOverridesForUser(userId),
    getUserInterviewTimeline(userId),
    getUserRecruiterHistory(userId),
    getUserOfferHistory(userId),
    getUserCareerHealthHistory(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/admin/users">
          <ArrowLeft />
          Back to Users
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{user.fullName ?? user.email}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{user.planTier}</Badge>
          <Badge variant="secondary">{user.role}</Badge>
        </div>
      </div>

      <EntitlementOverridePanel userId={userId} overrides={overrides} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Application timeline</h2>
          <p className="text-muted-foreground text-sm">
            Every opportunity this user has saved, with its self-reported status.
          </p>
          {timeline.length === 0 ? (
            <EmptyState title="No applications yet" className="py-8" />
          ) : (
            <ul className="flex flex-col gap-2">
              {timeline.map((opportunity) => (
                <li key={opportunity.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="wrap-break-word font-medium">
                      {opportunity.title} — {opportunity.companyName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(opportunity.updatedAt))}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {STATUS_LABEL[opportunity.status as OpportunityStatus] ?? opportunity.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Interview timeline</h2>
            {interviews.length === 0 ? (
              <EmptyState title="No interviews tracked yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-2">
                {interviews.map((interview) => (
                  <li key={interview.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="wrap-break-word font-medium">
                        {interview.opportunity.title} — {interview.opportunity.companyName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {interview.recruiter?.name ?? "No recruiter linked"} ·{" "}
                        {formatRelativeTime(new Date(interview.updatedAt))}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {INTERVIEW_STAGE_LABEL[interview.stage as InterviewStage] ?? interview.stage}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Recruiter history</h2>
            {recruiters.length === 0 ? (
              <EmptyState title="No recruiters tracked yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-2">
                {recruiters.map((recruiter) => (
                  <li key={recruiter.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="wrap-break-word font-medium">{recruiter.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {recruiter.company?.name ?? "No company linked"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {recruiter._count.interactions} interaction{recruiter._count.interactions === 1 ? "" : "s"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Offer history</h2>
            {offers.length === 0 ? (
              <EmptyState title="No offers recorded yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-2">
                {offers.map((offer) => (
                  <li key={offer.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="wrap-break-word font-medium">
                        {offer.opportunity.title} — {offer.opportunity.companyName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {offer.baseSalary ? `${offer.currency ?? ""}${offer.baseSalary.toLocaleString()}` : "No base salary entered"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {STATUS_LABEL[offer.opportunity.status as OpportunityStatus] ?? offer.opportunity.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Career Health history</h2>
            {healthHistory.length === 0 ? (
              <EmptyState title="No Career Health snapshots yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-2">
                {healthHistory.map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {formatRelativeTime(new Date(snapshot.createdAt))}
                    </span>
                    <Badge variant="secondary">{snapshot.overallScore}/100</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
