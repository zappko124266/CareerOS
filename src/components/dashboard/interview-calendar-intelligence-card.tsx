import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, Clock, ExternalLink, FileCheck2, ShieldAlert, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { EnrichedInterviewEvent, InterviewIntelligenceSummary } from "@/features/career-brain/types";
import type { GmailIntelligenceSummary } from "@/features/gmail-intelligence/types";

const ROW_LIMIT = 3;

function InterviewRow({ interview }: { interview: EnrichedInterviewEvent }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <Link href={`/opportunities/${interview.opportunity.id}`} className="min-w-0 truncate hover:underline">
        {interview.opportunity.companyName}
        {interview.roundLabel ? ` — ${interview.roundLabel}` : ""}
      </Link>
      <span className="flex shrink-0 items-center gap-2">
        {interview.meetingLink && (
          <Button asChild size="icon" variant="ghost" className="size-6">
            <a href={interview.meetingLink} target="_blank" rel="noreferrer noopener" aria-label="Join meeting">
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
        {interview.scheduledAt && (
          <span className="text-muted-foreground text-xs">{formatRelativeTime(interview.scheduledAt)}</span>
        )}
      </span>
    </li>
  );
}

/**
 * Mission Control's Interview & Calendar Intelligence card (Sprint 17,
 * Step 12). Every field is a direct read of
 * `CareerBrain.interviewIntelligence` — a pure derivation Career Brain
 * already computed over persisted `Interview` rows (Hard Lock 7: no
 * calendar API call, no recomputation, happens in this component or on
 * this page render). "Interview Timeline" itself is deliberately **not**
 * re-rendered here — that's `CareerInboxCard`'s existing merged timeline
 * (now including meeting-status transitions, `features/career-agent/inbox.ts`),
 * reused via the "View timeline" link rather than duplicated (Hard Lock:
 * "Never build a second timeline").
 */
export function InterviewCalendarIntelligenceCard({
  intelligence,
  pendingAssessments = [],
}: {
  intelligence: InterviewIntelligenceSummary;
  /** Sprint 20 (Interview Intelligence & Interview Operating System),
   * Module 11 — reuses `brain.gmailIntelligence.pendingAssessments`
   * as-is (Sprint 16), no new query or derivation. */
  pendingAssessments?: GmailIntelligenceSummary["pendingAssessments"];
}) {
  const { todaysInterviews, upcomingInterviews, conflicts, calendarHealth, waitingTooLong, offers, needsPreparation } =
    intelligence;
  const hasBrokenCalendar = calendarHealth.brokenProviders.length > 0;
  const hasAnyContent =
    todaysInterviews.length > 0 ||
    upcomingInterviews.length > 0 ||
    conflicts.length > 0 ||
    waitingTooLong.length > 0 ||
    offers.length > 0 ||
    needsPreparation.length > 0 ||
    pendingAssessments.length > 0;

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground size-4" />
            Interview &amp; Calendar Intelligence
          </span>
          {conflicts.length > 0 && <Badge variant="destructive">{conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium tracking-wide uppercase">Calendar health</span>
          {calendarHealth.connectedProviders.length === 0 && !hasBrokenCalendar && (
            <span className="text-muted-foreground">No calendar connected</span>
          )}
          {calendarHealth.connectedProviders.map((provider) => (
            <Badge key={provider} variant="secondary">
              {provider.charAt(0)}
              {provider.slice(1).toLowerCase()}
            </Badge>
          ))}
          {hasBrokenCalendar && (
            <span className="text-destructive flex items-center gap-1">
              <ShieldAlert className="size-3.5" />
              Reconnect needed
            </span>
          )}
        </div>

        {conflicts.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Conflict alerts</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {conflicts.slice(0, ROW_LIMIT).map((interview) => (
                <li key={interview.id} className="text-sm">
                  <Link href={`/opportunities/${interview.opportunity.id}`} className="hover:underline">
                    {interview.opportunity.companyName}
                  </Link>
                  <p className="text-muted-foreground text-xs">{interview.conflictNote}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {todaysInterviews.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Today</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {todaysInterviews.slice(0, ROW_LIMIT).map((interview) => (
                <InterviewRow key={interview.id} interview={interview} />
              ))}
            </ul>
          </div>
        )}

        {upcomingInterviews.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Upcoming</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {upcomingInterviews.slice(0, ROW_LIMIT).map((interview) => (
                <InterviewRow key={interview.id} interview={interview} />
              ))}
            </ul>
          </div>
        )}

        {offers.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Offers</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {offers.slice(0, ROW_LIMIT).map((interview) => (
                <InterviewRow key={interview.id} interview={interview} />
              ))}
            </ul>
          </div>
        )}

        {waitingTooLong.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Waiting for response</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {waitingTooLong.slice(0, ROW_LIMIT).map((interview) => (
                <li key={interview.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/opportunities/${interview.opportunity.id}`} className="min-w-0 truncate hover:underline">
                    {interview.opportunity.companyName}
                  </Link>
                  <span className="text-muted-foreground text-xs">{interview.daysWaiting}d</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {needsPreparation.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Needs preparation</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {needsPreparation.slice(0, ROW_LIMIT).map((interview) => (
                <InterviewRow key={interview.id} interview={interview} />
              ))}
            </ul>
          </div>
        )}

        {pendingAssessments.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Assessments</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {pendingAssessments.slice(0, ROW_LIMIT).map((event) => (
                <li key={event.id} className="text-sm">
                  {event.company ?? event.subject}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasAnyContent && (
          <p className="text-muted-foreground text-sm">No interviews on your calendar right now.</p>
        )}

        <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
          <Link href="/settings/identity?tab=timeline">View timeline</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
