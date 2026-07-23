import Link from "next/link";
import { Clock, Handshake, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RECRUITER_PRIORITY_LABEL, REFERRAL_STATUS_LABEL } from "@/features/recruiters/types";
import { RELATIONSHIP_HEALTH_LABEL } from "@/features/recruiters/scoring";
import type { EnrichedRecruiter, NetworkHealthSummary } from "@/features/recruiters/orchestrator";
import type { Referral } from "@/generated/prisma/client";

const ROW_LIMIT = 3;
const OPEN_REFERRAL_STATUSES = new Set(["REQUESTED", "PENDING"]);

/**
 * Mission Control's Recruiter Network card — Sprint 21 (Recruiter
 * Intelligence & Networking Operating System), Module 10. Every field is
 * a direct read of Career Brain's new top-level `recruiters`/
 * `networkHealth`/`pendingFollowUps`/`referrals` (`features/recruiters/
 * orchestrator.ts`'s pure derivation over the one additional recruiter
 * query batch — Module 16), the same "no page-render computation" rule
 * `InterviewCalendarIntelligenceCard` already follows. This is a new
 * widget (not an extension of an existing card) because networking is a
 * genuinely new Mission Control concern — no existing card shows
 * recruiter/referral data — but it is still added to the *same*
 * dashboard page, never a second dashboard.
 */
export function RecruiterNetworkCard({
  recruiters,
  networkHealth,
  pendingFollowUps,
  referrals,
}: {
  recruiters: EnrichedRecruiter[];
  networkHealth: NetworkHealthSummary;
  pendingFollowUps: EnrichedRecruiter[];
  referrals: Referral[];
}) {
  const topRecruiters = [...recruiters]
    .sort((a, b) => b.relationship.score - a.relationship.score)
    .slice(0, ROW_LIMIT);
  const openReferrals = referrals.filter((referral) => OPEN_REFERRAL_STATUSES.has(referral.status));
  const activeHealthBuckets = Object.entries(networkHealth.byHealth).filter(([, count]) => count > 0);

  if (recruiters.length === 0) {
    return (
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            Recruiter Network
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            No recruiters tracked yet — add one to start building your networking intelligence.
          </p>
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/recruiters">Go to Recruiters</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            Recruiter Network
          </span>
          <Badge variant="secondary">
            <TrendingUp className="mr-1 size-3" />
            {networkHealth.averageScore}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {activeHealthBuckets.map(([health, count]) => (
            <Badge key={health} variant="outline">
              {count} {RELATIONSHIP_HEALTH_LABEL[health as keyof typeof RELATIONSHIP_HEALTH_LABEL]}
            </Badge>
          ))}
        </div>

        {pendingFollowUps.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Awaiting reply</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {pendingFollowUps.slice(0, ROW_LIMIT).map((recruiter) => (
                <li key={recruiter.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/recruiters/${recruiter.id}`} className="min-w-0 truncate hover:underline">
                    {recruiter.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">{recruiter.daysSinceLastInteraction}d</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openReferrals.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <Handshake className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Referral requests</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {openReferrals.slice(0, ROW_LIMIT).map((referral) => (
                <li key={referral.id} className="text-sm">
                  <Badge variant="secondary" className="mr-1.5">
                    {REFERRAL_STATUS_LABEL[referral.status]}
                  </Badge>
                  {referral.notes ?? "Referral"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {topRecruiters.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Top recruiters</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {topRecruiters.map((recruiter) => (
                <li key={recruiter.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/recruiters/${recruiter.id}`} className="min-w-0 truncate hover:underline">
                    {recruiter.name}
                    {recruiter.priority === "HIGH" && (
                      <Badge variant="outline" className="ml-1.5">
                        {RECRUITER_PRIORITY_LABEL[recruiter.priority]}
                      </Badge>
                    )}
                  </Link>
                  <span className="text-muted-foreground text-xs">{recruiter.relationship.score}/100</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
          <Link href="/recruiters">View all recruiters</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
