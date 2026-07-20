"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateAnalyticsInsightsAction } from "@/actions/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { ApplicationAnalytics, GroupedRate } from "@/features/analytics/service";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}

function GroupedRateList({ items, emptyLabel }: { items: GroupedRate[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
          <span className="wrap-break-word">{item.label}</span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-xs">{item.applications} applied</span>
            <Badge variant="secondary">{item.responseRate}% response</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ApplicationAnalyticsDashboard({ analytics }: { analytics: ApplicationAnalytics }) {
  const insightsAction = useAsyncAction(generateAnalyticsInsightsAction);

  async function handleGenerateInsights() {
    const result = await insightsAction.run();
    if (result) {
      toast.success("Insights generated");
    } else if (insightsAction.error) {
      toast.error(insightsAction.error);
    }
  }

  if (analytics.totalApplications === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Once you record applications, your response, interview, and offer rates will show up here — computed from real data, never estimated."
        className="py-16"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Applications" value={String(analytics.totalApplications)} />
            <StatTile label="Interviews" value={String(analytics.totalInterviews)} />
            <StatTile label="Offers" value={String(analytics.totalOffers)} />
            <StatTile label="Response rate" value={`${analytics.responseRate}%`} />
            <StatTile label="Interview rate" value={`${analytics.interviewRate}%`} />
            <StatTile label="Offer rate" value={`${analytics.offerRate}%`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Resume performance</h2>
            <p className="text-muted-foreground text-sm">
              Response rate by which resume you used — computed from your real application history.
            </p>
            <GroupedRateList
              items={analytics.resumePerformance}
              emptyLabel="No resume was linked to any application yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Cover letter performance</h2>
            <p className="text-muted-foreground text-sm">
              Whether including a cover letter correlates with a response, in your own data.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>With a cover letter ({analytics.coverLetterApplicationsWith} applications)</span>
                <Badge variant="secondary">
                  {analytics.coverLetterResponseRateWith === null
                    ? "N/A"
                    : `${analytics.coverLetterResponseRateWith}%`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Without a cover letter ({analytics.coverLetterApplicationsWithout} applications)</span>
                <Badge variant="secondary">
                  {analytics.coverLetterResponseRateWithout === null
                    ? "N/A"
                    : `${analytics.coverLetterResponseRateWithout}%`}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Best companies</h2>
            <p className="text-muted-foreground text-sm">By response rate among companies you&apos;ve applied to.</p>
            <GroupedRateList items={analytics.bestCompanies} emptyLabel="No applications yet." />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Best roles</h2>
            <p className="text-muted-foreground text-sm">By response rate among role titles you&apos;ve applied to.</p>
            <GroupedRateList items={analytics.bestRoles} emptyLabel="No applications yet." />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Best locations</h2>
            <p className="text-muted-foreground text-sm">By response rate among locations you&apos;ve applied to.</p>
            <GroupedRateList items={analytics.bestLocations} emptyLabel="No applications yet." />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Industries</h2>
            <p className="text-muted-foreground text-sm">
              Not tracked — CareerOS doesn&apos;t collect an industry classification for
              opportunities, so this can&apos;t be shown without fabricating one.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">AI recommendations</h2>
            <p className="text-muted-foreground text-sm">
              Grounded entirely in the real numbers above — never a prediction about a specific outcome.
            </p>
          </div>

          {!insightsAction.result ? (
            <div className="flex flex-col items-start gap-2">
              <Button onClick={handleGenerateInsights} disabled={insightsAction.isPending} size="sm">
                <Sparkles />
                {insightsAction.isPending ? "Analyzing…" : "Get recommendations"}
              </Button>
              {insightsAction.error && <p className="text-destructive text-sm">{insightsAction.error}</p>}
              {insightsAction.isPending && insightsAction.isSlow && (
                <p className="text-muted-foreground text-sm">Still working — this can take up to a minute or two.</p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {insightsAction.result.insights.map((insight) => (
                <li key={insight.recommendation} className="border-border border-l-2 pl-3">
                  <p className="text-sm font-medium">{insight.recommendation}</p>
                  <p className="text-muted-foreground text-sm">{insight.reasoning}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
