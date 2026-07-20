import Link from "next/link";
import { Activity, FileText, FileWarning, LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "@/features/dashboard/types";

const ACTIVITY_ICON: Record<ActivityType, typeof FileText> = {
  resume_uploaded: FileText,
  resume_analyzed: LineChart,
  resume_parse_failed: FileWarning,
};

export function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="text-muted-foreground size-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nothing here yet"
            description="Upload and analyze a resume to start building your activity history."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = ACTIVITY_ICON[item.type];
              const content = (
                <div className="hover:bg-muted -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors">
                  <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word text-sm font-medium">
                      {item.title}
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
                    <Link href={item.href} className="focus-visible:ring-ring block rounded-lg focus-visible:ring-3 focus-visible:outline-none">
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
