import Link from "next/link";
import { Sparkle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "@/features/dashboard/types";

// Presentational relabeling only — same `ActivityItem[]` data
// (`getDashboardData`'s `recentActivity`) the old Recent Activity card
// used, just framed as accomplishments instead of technical log lines
// (the underlying query/service is untouched).
const ACCOMPLISHMENT_TITLE: Record<ActivityType, string> = {
  resume_uploaded: "You added a new resume",
  resume_analyzed: "Your resume health was checked",
  resume_parse_failed: "A resume needs a quick fix",
};

export function AccomplishmentsFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkle className="text-muted-foreground size-4" />
          What you&apos;ve accomplished
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={Sparkle}
            title="Nothing here yet"
            description="Add a resume to start building your career journey."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const content = (
                <div className="hover:bg-muted -mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word text-sm font-medium">
                      {ACCOMPLISHMENT_TITLE[item.type]}
                    </p>
                    <p className="text-muted-foreground wrap-break-word text-xs">
                      {item.description}
                    </p>
                  </div>
                  <time
                    dateTime={item.timestamp.toISOString()}
                    className="text-muted-foreground shrink-0 text-xs"
                  >
                    {formatRelativeTime(item.timestamp)}
                  </time>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="focus-visible:ring-ring block rounded-lg focus-visible:ring-3 focus-visible:outline-none"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
