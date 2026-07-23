"use client";

import Link from "next/link";
import { CalendarDays, Circle, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { disconnectConnectorAction } from "@/actions/connectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import type { ConnectionSummary } from "@/features/connectors/manager";
import type { ConnectionProvider } from "@/generated/prisma/client";

/** Falls back to a plain dot for any future connector's row whose label
 * isn't one of these — never guesses at a "close enough" icon. */
const ROW_ICON: Record<string, LucideIcon> = {
  Jobs: ShieldCheck,
  Calendar: CalendarDays,
  Gmail: Mail,
  "Outlook Mail": Mail,
};

export interface AccountConnectionCapabilityRow {
  label: string;
  /** `"unsupported"` renders as a fixed "Not supported" badge — for a
   * capability this connector's `capabilities` object never claims (e.g.
   * job search), never something the UI should let a user think might
   * turn on. `true`/`false` render "Connected"/"Not granted", driven by
   * whether the scope backing that row is actually present on `summary`. */
  granted: boolean | "unsupported";
}

/**
 * The Connection Dashboard's generic per-provider detail card — extracted
 * (Sprint 14) from what was `GoogleConnectionCard`'s own markup, so the
 * second OAuth connector (Microsoft) reuses this layout instead of a
 * copy-pasted twin. `summary` is always `ConnectionSummary`, the
 * token-free DTO from `listConnectionSummaries` — this component
 * structurally cannot see an access/refresh token regardless of provider.
 */
export function AccountConnectionCard({
  provider,
  providerLabel,
  authorizeHref,
  summary,
  capabilityRows,
}: {
  provider: ConnectionProvider;
  providerLabel: string;
  authorizeHref: string;
  summary: ConnectionSummary;
  capabilityRows: AccountConnectionCapabilityRow[];
}) {
  const disconnectAction = useAsyncAction(disconnectConnectorAction);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{providerLabel}</h3>
          <Badge variant="secondary">Connected</Badge>
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2">
            <UserRound className="text-muted-foreground size-4 shrink-0" />
            <span>{summary.externalAccountEmail ?? summary.externalAccountName ?? "Signed in"}</span>
          </li>
          {capabilityRows.map((row) => {
            const Icon = ROW_ICON[row.label] ?? Circle;
            const badgeLabel =
              row.granted === "unsupported" ? "Not supported" : row.granted ? "Connected" : "Not granted";
            return (
              <li key={row.label} className="flex items-center gap-2">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <span>{row.label}</span>
                <Badge variant={row.granted === true ? "secondary" : "outline"} className="ml-auto">
                  {badgeLabel}
                </Badge>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground text-xs">
          {summary.lastSyncedAt
            ? `Last synced ${formatRelativeTime(summary.lastSyncedAt)}`
            : "Never synced"}
        </p>

        {disconnectAction.error && <p className="text-destructive text-sm">{disconnectAction.error}</p>}

        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={authorizeHref}>Reconnect</Link>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disconnectAction.isPending}
            onClick={() => disconnectAction.run(provider)}
          >
            {disconnectAction.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
