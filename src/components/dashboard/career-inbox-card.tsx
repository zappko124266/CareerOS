import Link from "next/link";
import { Bot, Briefcase, FileText, Inbox, Mail, MessagesSquare, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { CareerEvent, CareerEventSource } from "@/features/career-agent/types";

const SOURCE_ICON: Record<CareerEventSource, typeof FileText> = {
  resume: FileText,
  opportunity: Briefcase,
  interview: MessagesSquare,
  automation: Bot,
  gmail: Mail,
  recruiter: Users,
};

/**
 * The Career Inbox — a unified timeline across resume, application, and
 * interview events (`buildCareerInboxEvents`), replacing the
 * resume-only `RecentActivityFeed` this dashboard showed before. Same
 * list-item visual language as that component, just sourced from the
 * broader `CareerEvent[]` union.
 */
export function CareerInboxCard({
  events,
  title = "Career Inbox",
}: {
  events: CareerEvent[];
  /** Sprint 13 (Career Identity) — the Career Timeline tab reuses this
   * exact component (same events shape, same list rendering) with a
   * higher `limit` passed to `buildCareerInboxEvents` and just a
   * different heading, rather than duplicating the list markup. */
  title?: string;
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="text-muted-foreground size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing here yet"
            description="Upload a resume, save a job, or track an interview to start building your timeline."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {events.map((event) => {
              const Icon = SOURCE_ICON[event.source];
              return (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="hover:bg-muted -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors"
                  >
                    <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="wrap-break-word text-sm font-medium">{event.title}</p>
                      <p className="text-muted-foreground wrap-break-word text-xs">
                        {event.description}
                      </p>
                    </div>
                    <time
                      dateTime={event.timestamp.toISOString()}
                      className="text-muted-foreground shrink-0 text-xs"
                    >
                      {formatRelativeTime(event.timestamp)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
