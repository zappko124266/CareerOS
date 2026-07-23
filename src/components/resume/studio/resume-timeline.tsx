import { FileText, LineChart, Save } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { ResumeAnalysis, ResumeVersion } from "@/generated/prisma/client";

type TimelineEventKind = "created" | "analyzed" | "version_saved";

interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  title: string;
  description: string;
  timestamp: Date;
}

const KIND_ICON: Record<TimelineEventKind, typeof FileText> = {
  created: FileText,
  analyzed: LineChart,
  version_saved: Save,
};

/**
 * The Resume Timeline — Sprint 11, requirement 6. A pure client-side
 * merge of three already-fetched, already-timestamped sources — no new
 * query: when the resume was created, every ATS re-analysis
 * (`ResumeAnalysis`, already fetched by `getResumeWithAnalyses`), and
 * every saved version (`ResumeVersion`, already fetched for the Versions
 * tab). Same "icon + label + relative time" list pattern already used by
 * `RecentActivityFeed`/`CareerInboxCard`.
 */
export function ResumeTimeline({
  resumeCreatedAt,
  resumeTitle,
  analyses,
  versions,
}: {
  resumeCreatedAt: Date;
  resumeTitle: string;
  analyses: ResumeAnalysis[];
  versions: ResumeVersion[];
}) {
  const events: TimelineEvent[] = [
    {
      id: "created",
      kind: "created" as const,
      title: `Uploaded "${resumeTitle}"`,
      description: "Resume added to CareerOS.",
      timestamp: resumeCreatedAt,
    },
    ...analyses.map((analysis): TimelineEvent => ({
      id: `analysis-${analysis.id}`,
      kind: "analyzed",
      title: "ATS analysis run",
      description: `Scored ${analysis.overallScore}/100`,
      timestamp: analysis.createdAt,
    })),
    ...versions.map((version): TimelineEvent => ({
      id: `version-${version.id}`,
      kind: "version_saved",
      title: `Saved version: ${version.label}`,
      description: version.targetCompanyName
        ? `Tailored for ${version.targetCompanyName}`
        : "Manual save",
      timestamp: version.createdAt,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <Card>
      <CardContent>
        <h2 className="text-sm font-semibold">Timeline</h2>
        <ul className="mt-3 flex flex-col gap-1">
          {events.map((event) => {
            const Icon = KIND_ICON[event.kind];
            return (
              <li key={event.id} className="flex items-start gap-3 rounded-lg px-2 py-2">
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
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
