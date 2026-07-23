import Link from "next/link";
import { CalendarClock, ClipboardList, Handshake, Inbox, Mail, UserRound, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { GmailCareerEventDTO, GmailIntelligenceSummary } from "@/features/gmail-intelligence/types";

const TIMELINE_HREF = "/settings/identity?tab=timeline";
const ROW_LIMIT = 3;

function Section({
  icon: Icon,
  label,
  events,
}: {
  icon: LucideIcon;
  label: string;
  events: GmailCareerEventDTO[];
}) {
  if (events.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <Badge variant="outline" className="ml-auto">
          {events.length}
        </Badge>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {events.slice(0, ROW_LIMIT).map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              {event.company ?? event.subject}
              {event.role ? ` — ${event.role}` : ""}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">{formatRelativeTime(event.receivedAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mission Control's Career Inbox Intelligence card (Sprint 16, Step 8) —
 * every field here is a direct read of `CareerBrain.gmailIntelligence`
 * (`features/gmail-intelligence/`), itself built from one query
 * (`listRecentGmailCareerEvents`). No business logic lives in this
 * component: it only groups the summary's already-classified arrays into
 * labeled sections and renders them with the same list-row pattern
 * `CareerAgentStatusCard`/`AutonomousAgentPlanCard` already use. Rejections
 * are shown (Step 8 explicitly lists them) even though the Autonomous
 * Agent's planner deliberately does *not* turn them into an action item
 * (`autonomous-agent/planner.ts`) — informational here, not actionable
 * there, two different, both honest, treatments of the same data.
 */
export function CareerInboxIntelligenceCard({ summary }: { summary: GmailIntelligenceSummary }) {
  if (!summary.connected) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="text-muted-foreground size-4" />
            Career Inbox Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="Connect Google to see career emails here"
            description="CareerOS can turn interview invites, recruiter messages, assessments, and offers from Gmail into a real, structured timeline — read-only, nothing is ever sent or modified."
            action={
              <Button asChild size="sm">
                <Link href="/opportunities/connections">Connect Google</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const hasAnyEvents =
    summary.interviewInvitations.length > 0 ||
    summary.pendingAssessments.length > 0 ||
    summary.recentRecruiterActivity.length > 0 ||
    summary.recentOffers.length > 0 ||
    summary.recentRejections.length > 0;

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Inbox className="text-muted-foreground size-4" />
            Career Inbox Intelligence
          </span>
          {summary.unreadCount > 0 && <Badge variant="secondary">{summary.unreadCount} unread</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        {hasAnyEvents ? (
          <>
            <Section icon={CalendarClock} label="Upcoming interviews" events={summary.interviewInvitations} />
            <Section icon={ClipboardList} label="Pending assessments" events={summary.pendingAssessments} />
            <Section icon={UserRound} label="Recruiter activity" events={summary.recentRecruiterActivity} />
            <Section icon={Handshake} label="Offer updates" events={summary.recentOffers} />
            <Section icon={XCircle} label="Rejections" events={summary.recentRejections} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No career-related emails found in the last 30 days.</p>
        )}

        <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
          <Link href={TIMELINE_HREF}>View full timeline</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
