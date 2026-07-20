import { Card, CardContent } from "@/components/ui/card";
import type { DiscoveryAnalytics } from "@/features/discovery/analytics";

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Sprint 9, Module 11 — Discovery Analytics. Purely a rendering of
 * `getDiscoveryAnalytics`'s real aggregates — no client state, no
 * refetching, since the Discovery page already fetches this server-side
 * alongside everything else on the page.
 */
export function DiscoveryAnalyticsPanel({ analytics }: { analytics: DiscoveryAnalytics }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Jobs discovered" value={analytics.jobsDiscovered.toLocaleString()} />
        <StatCard label="Companies discovered" value={analytics.companiesDiscovered.toLocaleString()} />
        <StatCard label="Duplicates collapsed" value={analytics.duplicatesCollapsed.toLocaleString()} />
        <StatCard label="Recommendations accepted" value={analytics.recommendationsAccepted.toLocaleString()} />
        <StatCard label="Applications started" value={analytics.applicationsStarted.toLocaleString()} />
        <StatCard label="Interviews reached" value={analytics.interviewsReached.toLocaleString()} />
        <StatCard
          label="Interview conversion"
          value={
            analytics.interviewConversionRate === null
              ? "Not enough data"
              : `${analytics.interviewConversionRate}%`
          }
          detail="Applications that reached an interview stage"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">Connector latency</h3>
            <p className="text-muted-foreground text-xs">
              Average time per discovery run each connector participated in — a whole-run
              measurement (connectors aren&apos;t individually timed within a run), not a
              per-call benchmark.
            </p>
          </div>
          {analytics.connectorLatency.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed discovery runs yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {analytics.connectorLatency
                .slice()
                .sort((a, b) => b.runCount - a.runCount)
                .map((connector) => (
                  <li
                    key={connector.connectorId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{connector.connectorId}</span>
                    <span className="text-muted-foreground">
                      {(connector.averageDurationMs / 1000).toFixed(1)}s avg · {connector.runCount}{" "}
                      run{connector.runCount === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
