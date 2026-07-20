import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FEATURE_CATEGORY_ORDER,
  METERED_FEATURE_CATEGORY,
  METERED_FEATURE_LABEL,
} from "@/features/entitlements/labels";
import { getPlanTier } from "@/features/entitlements/queries";
import { getEntitlementSummary, PLAN_LIMITS } from "@/features/entitlements/service";
import type { EntitlementSummaryRow } from "@/features/entitlements/service";
import { METERED_FEATURES } from "@/features/entitlements/types";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Billing & Usage" };

function groupByCategory(rows: EntitlementSummaryRow[]) {
  const groups = new Map<string, EntitlementSummaryRow[]>();
  for (const row of rows) {
    const category = METERED_FEATURE_CATEGORY[row.feature];
    const existing = groups.get(category) ?? [];
    existing.push(row);
    groups.set(category, existing);
  }
  return FEATURE_CATEGORY_ORDER.map((category) => ({
    category,
    rows: groups.get(category) ?? [],
  })).filter((group) => group.rows.length > 0);
}

export default async function BillingPage() {
  const user = await verifySession();
  const [planTier, usage] = await Promise.all([
    getPlanTier(user.id),
    getEntitlementSummary(user.id),
  ]);

  const grouped = groupByCategory(usage);
  const hasOverride = usage.some((row) => row.overridden);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Real usage counted from your last 30 days of activity — never estimated.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Current plan</p>
              <p className="text-2xl font-semibold">{planTier === "PRO" ? "Pro" : "Free"}</p>
            </div>
            <Badge variant={planTier === "PRO" ? "default" : "secondary"}>
              {planTier === "PRO" ? "Unlimited AI features" : "Monthly limits apply"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {planTier === "PRO"
              ? "You have unlimited access to every AI feature below."
              : "Every AI feature below is capped per rolling 30-day window, reset continuously rather than on a fixed billing date. No payment processor is connected yet — CareerOS doesn't charge cards or manage subscriptions today."}
          </p>
          {hasOverride && (
            <p className="text-muted-foreground text-xs">
              One or more limits below have been manually adjusted for your account.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Usage this month</h2>
        {grouped.map((group) => (
          <Card key={group.category}>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm font-medium">{group.category}</p>
              <div className="flex flex-col gap-3">
                {group.rows.map((row) => (
                  <div key={row.feature} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{METERED_FEATURE_LABEL[row.feature]}</span>
                      <span className="text-muted-foreground">
                        {row.limit === null
                          ? "Unlimited"
                          : `${row.used} / ${row.limit} used${row.overridden ? " (adjusted)" : ""}`}
                      </span>
                    </div>
                    {row.limit !== null && (
                      <Progress
                        value={Math.min(100, (row.used / row.limit) * 100)}
                        aria-label={METERED_FEATURE_LABEL[row.feature]}
                        aria-valuetext={`${row.used} of ${row.limit} used`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Plan comparison</h2>
            <p className="text-muted-foreground text-sm">
              Pro is unlimited on every single feature below — nothing about how a feature works
              changes between plans, only how often you can run it. Free&apos;s limits:
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border border-b text-xs">
                <th className="py-2 pr-4 font-medium">Feature</th>
                <th className="py-2 font-medium">Free limit</th>
              </tr>
            </thead>
            <tbody>
              {METERED_FEATURES.map((feature) => (
                <tr key={feature} className="border-border/60 border-b last:border-0">
                  <td className="py-2 pr-4">{METERED_FEATURE_LABEL[feature]}</td>
                  <td className="text-muted-foreground py-2">
                    {PLAN_LIMITS.FREE[feature] === null
                      ? "Unlimited"
                      : `${PLAN_LIMITS.FREE[feature]}/month`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Upgrade to Pro</h2>
          <p className="text-muted-foreground text-sm">
            Self-serve upgrades aren&apos;t available yet — CareerOS doesn&apos;t have billing
            wired up to a payment processor today, so there&apos;s no working &quot;Subscribe&quot;
            button to show you here. This section will let you upgrade directly once that&apos;s
            built.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
