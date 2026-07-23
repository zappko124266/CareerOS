import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Link2, Link2Off } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleConnectionCard } from "@/components/opportunities/google-connection-card";
import { MicrosoftConnectionCard } from "@/components/opportunities/microsoft-connection-card";
import { listConnectionSummaries, listConnectorSources } from "@/features/connectors/manager";
import type { ConnectorSourceSummary } from "@/features/connectors/types";
import type { ConnectionProvider } from "@/generated/prisma/client";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Account Connections" };

const SECTIONS: {
  state: ConnectorSourceSummary["state"];
  title: string;
  description: string;
  icon: typeof Link2;
  badgeLabel: string;
  badgeVariant: "secondary" | "outline";
}[] = [
  {
    state: "CONNECTED",
    title: "Connected",
    description: "CareerOS has an active connection to these platforms.",
    icon: Link2,
    badgeLabel: "Connected",
    badgeVariant: "secondary",
  },
  {
    state: "SUPPORTED",
    title: "Supported",
    description: "CareerOS can already search these — connect or start finding jobs from Discovery.",
    icon: CheckCircle2,
    badgeLabel: "Supported",
    badgeVariant: "outline",
  },
  {
    state: "UNAVAILABLE",
    title: "Not yet available",
    description: "No officially supported way to connect these today — shown so you know the full landscape.",
    icon: Link2Off,
    badgeLabel: "Not available",
    badgeVariant: "outline",
  },
];

/**
 * The OAuth account connectors this page's "Connected services" section
 * shows — deliberately separate from `CONNECTOR_CATALOG` (job-search
 * portals only; neither Google nor Microsoft has a job-search
 * capability, see each connector's own `jobs.ts`). Adding a third OAuth
 * connector here means one more entry in this array plus one more
 * component in `CARD_BY_PROVIDER` — no other part of this page changes,
 * the same "register once" discipline as the connector registry itself
 * (`features/connectors/registry.ts`).
 */
const ACCOUNT_CONNECTORS: {
  provider: ConnectionProvider;
  label: string;
  authorizeHref: string;
  successValue: string;
  description: string;
  notConnectedCopy: string;
}[] = [
  {
    provider: "GOOGLE",
    label: "Google",
    authorizeHref: "/api/connectors/google/authorize",
    successValue: "google",
    description: "Identity, Calendar, and Gmail — connected via Google's own OAuth sign-in.",
    notConnectedCopy:
      "Connect your Google account for identity, Calendar, and Gmail. Job search isn't supported — Google has no API for that.",
  },
  {
    provider: "MICROSOFT",
    label: "Microsoft",
    authorizeHref: "/api/connectors/microsoft/authorize",
    successValue: "microsoft",
    description: "Identity, Calendar, and Outlook Mail — connected via Microsoft's own OAuth sign-in.",
    notConnectedCopy:
      "Connect your Microsoft account for identity, Calendar, and Outlook Mail. Job search isn't supported — Microsoft Graph has no API for that.",
  },
];

const CARD_BY_PROVIDER: Record<string, typeof GoogleConnectionCard> = {
  GOOGLE: GoogleConnectionCard,
  MICROSOFT: MicrosoftConnectionCard,
};

/**
 * Sprint 6 (Universal Job Connector Framework) — this page used to
 * render a hardcoded array that always said "Not available" for every
 * platform, never reading the database. It now reads real state via
 * `listConnectorSources` (`features/connectors/manager.ts`), which
 * merges the existing Connector Marketplace catalog with real per-user
 * `AccountConnection` rows and the new connector registry. "Connected"
 * and "Supported" will legitimately be sparse today (a handful of
 * connectors already have live search) — that's honest, not a
 * placeholder.
 *
 * Sprint 7 added a separate "Connected services" section, sourced from
 * `listConnectionSummaries` (a token-free DTO — this page never sees an
 * access/refresh token). It's kept apart from the job-portal catalog
 * list above: `CONNECTOR_CATALOG` is specifically job-search portals.
 *
 * Sprint 14 generalized that section from Google-only to
 * `ACCOUNT_CONNECTORS`/`CARD_BY_PROVIDER` above, and added Microsoft as
 * the second entry — the same real OAuth flow, the same token-free DTO,
 * no new page structure.
 */
export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connector_success?: string; connector_error?: string }>;
}) {
  const user = await verifySession();
  const [sources, connectionSummaries, params] = await Promise.all([
    listConnectorSources(user.id),
    listConnectionSummaries(user.id),
    searchParams,
  ]);

  const connectionByProvider = new Map(
    connectionSummaries
      .filter((summary) => summary.status === "CONNECTED")
      .map((summary) => [summary.provider, summary]),
  );

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Account connections
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          CareerOS never collects a password for any external site. Every
          connection below either uses that platform&apos;s own officially
          supported sign-in flow, or isn&apos;t offered at all until one
          exists.
        </p>
      </div>

      {ACCOUNT_CONNECTORS.some((connector) => params.connector_success === connector.successValue) && (
        <Card className="border-emerald-600/30 bg-emerald-600/5">
          <CardContent className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="text-emerald-600 size-4 shrink-0" />
            {ACCOUNT_CONNECTORS.find((connector) => connector.successValue === params.connector_success)?.label}{" "}
            account connected.
          </CardContent>
        </Card>
      )}
      {params.connector_error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 text-sm">
            <AlertCircle className="text-destructive size-4 shrink-0" />
            {params.connector_error}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">Connected services</h2>
          <p className="text-muted-foreground text-sm">
            Sign in with an account for identity, Calendar, and mail access — Job search isn&apos;t offered
            by either provider.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ACCOUNT_CONNECTORS.map((connector) => {
            const connection = connectionByProvider.get(connector.provider);
            const ConnectionCard = CARD_BY_PROVIDER[connector.provider];

            if (connection && ConnectionCard) {
              return <ConnectionCard key={connector.provider} summary={connection} />;
            }

            return (
              <Card key={connector.provider}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{connector.label}</h3>
                    <Badge variant="outline">Not connected</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{connector.notConnectedCopy}</p>
                  <Button asChild size="sm" className="w-fit">
                    <Link href={connector.authorizeHref}>Connect {connector.label}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {SECTIONS.map((section) => {
        const rows = sources.filter((source) => source.state === section.state);
        if (rows.length === 0) return null;

        const Icon = section.icon;

        return (
          <div key={section.state} className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">{section.title}</h2>
              <p className="text-muted-foreground text-sm">{section.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rows.map((source) => (
                <Card key={source.id}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{source.name}</h3>
                      <Badge variant={section.badgeVariant}>{section.badgeLabel}</Badge>
                    </div>
                    {source.reason && (
                      <p className="text-muted-foreground flex items-start gap-2 text-sm">
                        <Icon className="mt-0.5 size-4 shrink-0" />
                        {source.reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
