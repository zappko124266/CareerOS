import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { DiscoveryRun } from "@/generated/prisma/client";

export function DiscoveryHistoryPanel({ runs }: { runs: DiscoveryRun[] }) {
  if (runs.length === 0) {
    return (
      <EmptyState
        title="No discovery runs yet"
        description="Run discovery once (manually or on a schedule) to start building history here."
        className="py-12"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => {
        const errors = (run.errors as unknown as { connectorId: string; message: string }[]) ?? [];
        const connectors = (run.connectorsUsed as unknown as string[]) ?? [];

        return (
          <Card key={run.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={run.triggeredBy === "MANUAL" ? "secondary" : "outline"}>
                    {run.triggeredBy === "MANUAL" ? "Manual" : "Scheduled"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {formatRelativeTime(run.startedAt)}
                  </span>
                </div>
                {!run.completedAt && <Badge variant="outline">In progress</Badge>}
              </div>
              <p className="text-sm">
                {run.newJobsFound} new job{run.newJobsFound === 1 ? "" : "s"} · {run.jobsFound} total
                found · {run.companiesFound} compan{run.companiesFound === 1 ? "y" : "ies"}
              </p>
              {connectors.length > 0 && (
                <p className="text-muted-foreground text-xs">Connectors: {connectors.join(", ")}</p>
              )}
              {errors.length > 0 && (
                <div className="text-xs">
                  {errors.map((error, index) => (
                    <p key={index} className="text-destructive">
                      {error.connectorId}: {error.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
