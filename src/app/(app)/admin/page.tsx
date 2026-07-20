import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Send, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { verifyRole } from "@/lib/auth/dal";
import {
  getAiUsageSummary,
  getConnectorHealth,
  getDiscoveryGrowthTrend,
  getFleetDiscoveryAnalytics,
  listCompaniesForAdmin,
  listDiscoveryRunFailures,
  listFailedApplicationSubmissions,
  listRecentApplicationSubmissions,
  listRecentAuditLogs,
  listRetriedApplicationSubmissions,
} from "@/features/admin/queries";
import { SUBMISSION_METHOD_LABEL } from "@/features/applications/types";

export const metadata: Metadata = { title: "Admin — Application Center" };

export default async function AdminPage() {
  await verifyRole(["ADMIN", "SUPER_ADMIN"]);

  const [
    connectorHealth,
    recentSubmissions,
    failedSubmissions,
    retriedSubmissions,
    auditLogs,
    aiUsage,
    companies,
    discoveryAnalytics,
    discoveryFailures,
    discoveryGrowth,
  ] = await Promise.all([
    getConnectorHealth(),
    listRecentApplicationSubmissions(),
    listFailedApplicationSubmissions(),
    listRetriedApplicationSubmissions(),
    listRecentAuditLogs(),
    getAiUsageSummary(),
    listCompaniesForAdmin(),
    getFleetDiscoveryAnalytics(),
    listDiscoveryRunFailures(),
    getDiscoveryGrowthTrend(),
  ]);

  const maxGrowthCount = Math.max(
    1,
    ...discoveryGrowth.map((day) => day.jobsDiscovered + day.companiesDiscovered),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin — Application Center</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connector health, submission queues, AI usage, and the audit trail — every number
            below is a real aggregate, not a synthetic status.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/admin/users">
            <ShieldCheck />
            Manage users &amp; overrides
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Connector health</h2>
          <p className="text-muted-foreground text-sm">
            Configuration status plus real usage/error counts from the last 50 discovery runs.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {connectorHealth.map((connector) => (
              <div key={connector.id} className="border-border rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{connector.name}</p>
                  <Badge variant={connector.configured ? "secondary" : "outline"}>
                    {connector.configured ? "Configured" : "Not configured"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Used in {connector.runsUsedIn} of the last 50 runs
                  {connector.errorCount > 0 && (
                    <span className="text-destructive"> — {connector.errorCount} errors</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Send className="text-muted-foreground size-4" />
              <h2 className="text-sm font-semibold">Application queue</h2>
            </div>
            {recentSubmissions.length === 0 ? (
              <EmptyState title="No submissions yet" className="py-6" />
            ) : (
              <ul className="flex flex-col gap-2">
                {recentSubmissions.slice(0, 8).map((submission) => (
                  <li key={submission.id} className="text-sm">
                    <p className="wrap-break-word font-medium">
                      {submission.opportunity.title} — {submission.opportunity.companyName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {SUBMISSION_METHOD_LABEL[submission.method] ?? submission.method} ·{" "}
                      {formatRelativeTime(new Date(submission.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4" />
              <h2 className="text-sm font-semibold">Failure queue</h2>
            </div>
            {failedSubmissions.length === 0 ? (
              <EmptyState title="No failures" className="py-6" />
            ) : (
              <ul className="flex flex-col gap-2">
                {failedSubmissions.map((submission) => (
                  <li key={submission.id} className="text-sm">
                    <p className="wrap-break-word font-medium">
                      {submission.opportunity.title} — {submission.opportunity.companyName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {submission.failureReason ?? "No reason given"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="text-muted-foreground size-4" />
              <h2 className="text-sm font-semibold">Retry queue</h2>
            </div>
            {retriedSubmissions.length === 0 ? (
              <EmptyState title="No retries" className="py-6" />
            ) : (
              <ul className="flex flex-col gap-2">
                {retriedSubmissions.map((submission) => (
                  <li key={submission.id} className="text-sm">
                    <p className="wrap-break-word font-medium">
                      {submission.opportunity.title} — {submission.opportunity.companyName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Retried {submission.retryCount}× · {submission.result}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">AI usage (last 30 days)</h2>
            {aiUsage.length === 0 ? (
              <EmptyState title="No AI usage recorded" className="py-6" />
            ) : (
              <ul className="flex flex-col gap-2">
                {aiUsage.map((row) => (
                  <li key={row.feature} className="flex items-center justify-between text-sm">
                    <span>{row.feature}</span>
                    <Badge variant="secondary">{row.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Recent audit log</h2>
            {auditLogs.length === 0 ? (
              <EmptyState title="No audit events yet" className="py-6" />
            ) : (
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {auditLogs.map((log) => (
                  <li key={log.id} className="text-sm">
                    <p className="wrap-break-word">
                      <span className="font-medium">{log.action}</span>
                      {log.user?.email && <span className="text-muted-foreground"> — {log.user.email}</span>}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(log.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Company Intelligence</h2>
          <p className="text-muted-foreground text-sm">
            The shared Company knowledge graph — 20 most recently touched companies, real counts
            of listings and tracked recruiters.
          </p>
          {companies.length === 0 ? (
            <EmptyState title="No companies yet" className="py-6" />
          ) : (
            <ul className="flex flex-col gap-2">
              {companies.map((company) => (
                <li key={company.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/opportunities/companies/${company.id}`}
                    className="wrap-break-word font-medium underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {company._count.opportunities} listing{company._count.opportunities === 1 ? "" : "s"} ·{" "}
                    {company._count.recruiters} recruiter{company._count.recruiters === 1 ? "" : "s"} tracked
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Discovery</h2>
          <p className="text-muted-foreground text-sm">
            Fleet-wide Job Discovery Engine stats — the same real aggregates each user sees on
            their own Discovery Analytics tab, summed across everyone.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Jobs discovered</p>
              <p className="text-xl font-semibold">{discoveryAnalytics.jobsDiscovered.toLocaleString()}</p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Companies discovered</p>
              <p className="text-xl font-semibold">
                {discoveryAnalytics.companiesDiscovered.toLocaleString()}
              </p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Duplicates collapsed</p>
              <p className="text-xl font-semibold">
                {discoveryAnalytics.duplicatesCollapsed.toLocaleString()}
              </p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Recommendations accepted</p>
              <p className="text-xl font-semibold">
                {discoveryAnalytics.recommendationsAccepted.toLocaleString()}
              </p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Applications started</p>
              <p className="text-xl font-semibold">
                {discoveryAnalytics.applicationsStarted.toLocaleString()}
              </p>
            </div>
            <div className="border-border rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Interview conversion</p>
              <p className="text-xl font-semibold">
                {discoveryAnalytics.interviewConversionRate === null
                  ? "—"
                  : `${discoveryAnalytics.interviewConversionRate}%`}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Growth — last 14 days</h3>
            <div className="mt-2 flex h-24 items-end gap-1">
              {discoveryGrowth.map((day) => {
                const total = day.jobsDiscovered + day.companiesDiscovered;
                const heightPct = Math.max(4, Math.round((total / maxGrowthCount) * 100));
                return (
                  <div
                    key={day.date}
                    className="bg-primary/70 min-w-0 flex-1 rounded-t"
                    style={{ height: `${heightPct}%` }}
                    title={`${day.date}: ${day.jobsDiscovered} jobs, ${day.companiesDiscovered} companies`}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Recent connector failures</h3>
            {discoveryFailures.length === 0 ? (
              <EmptyState title="No recent failures" className="py-6" />
            ) : (
              <ul className="mt-2 flex max-h-60 flex-col gap-2 overflow-y-auto">
                {discoveryFailures.map((failure, index) => (
                  <li key={`${failure.runId}-${index}`} className="text-sm">
                    <p className="font-medium">{failure.connectorId}</p>
                    <p className="text-muted-foreground wrap-break-word text-xs">
                      {failure.message} · {formatRelativeTime(new Date(failure.startedAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
