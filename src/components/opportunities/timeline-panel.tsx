import { Circle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { STATUS_LABEL } from "@/features/opportunities/types";
import type { StatusHistory } from "@/features/opportunities/types";
import type { InterviewNote } from "@/generated/prisma/client";

export function TimelinePanel({
  history,
  notes,
}: {
  history: StatusHistory;
  notes: InterviewNote[];
}) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">Status timeline</h2>
          <p className="text-muted-foreground text-sm">
            Self-reported — each entry is a status you set, not something
            CareerOS observed from the employer.
          </p>
          {sorted.length === 0 ? (
            <EmptyState
              icon={Circle}
              title="No history yet"
              className="py-8"
            />
          ) : (
            <ol className="mt-4 flex flex-col gap-4">
              {sorted.map((entry, index) => (
                <li key={`${entry.status}-${entry.changedAt}`} className="flex gap-3">
                  <span
                    aria-hidden
                    className={
                      index === 0
                        ? "bg-foreground mt-1.5 size-2 shrink-0 rounded-full"
                        : "bg-muted-foreground/40 mt-1.5 size-2 shrink-0 rounded-full"
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {STATUS_LABEL[entry.status]}
                    </p>
                    <time
                      dateTime={entry.changedAt}
                      className="text-muted-foreground text-xs"
                    >
                      {formatRelativeTime(new Date(entry.changedAt))}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">Interview prep notes</h2>
          <p className="text-muted-foreground text-sm">
            Free-text notes tied to this opportunity — calendar sync and
            structured interview scheduling aren&apos;t built yet.
          </p>
          {notes.length === 0 ? (
            <EmptyState
              icon={Circle}
              title="No interview notes yet"
              className="py-8"
            />
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {notes.map((note) => (
                <li key={note.id} className="border-border border-l-2 pl-3">
                  <p className="text-sm wrap-break-word">{note.note}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatRelativeTime(new Date(note.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
