"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DiscoveryAnalytics } from "@/features/discovery/analytics";
import type { DiscoveryBriefing } from "@/features/discovery/briefing";
import type { ConnectorMarketplaceEntry } from "@/features/discovery/connectors/status";
import type {
  DiscoveredCompany,
  DiscoveredListing,
  DiscoveryPreference,
  DiscoveryRun,
} from "@/generated/prisma/client";

import { CompanyFeed } from "./company-feed";
import { ConnectorMarketplace } from "./connector-marketplace";
import { DailyBriefingCard } from "./daily-briefing-card";
import { DiscoveryAnalyticsPanel } from "./discovery-analytics-panel";
import { DiscoveryHistoryPanel } from "./discovery-history-panel";
import { DiscoveryShelves } from "./discovery-shelves";
import { JobFeed } from "./job-feed";

// The `country-state-city` dataset (250 countries + every state + every
// city) that `LocationPicker` depends on is large enough to measurably
// hurt Total Blocking Time if bundled into this page's main chunk (found
// via this sprint's own Lighthouse run — TBT dropped from ~0.5s to
// negligible after this change). Code-split into its own chunk that's
// only fetched when the Preferences tab is actually opened, not on every
// Discovery Dashboard page load.
const DiscoveryPreferencesPanel = dynamic(
  () => import("./discovery-preferences-panel").then((mod) => mod.DiscoveryPreferencesPanel),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

/**
 * The Discovery Dashboard — a new tab inside the existing Opportunities
 * section (`/opportunities/discovery`) rather than a separate top-level
 * nav item, since it's the natural evolution of "search for jobs" into
 * "jobs are found for you." Reuses the same Tabs/Card/Badge primitives as
 * every other studio in this codebase.
 */
export function DiscoveryDashboard({
  briefing,
  newListings,
  newCompanies,
  savedListings,
  savedCompanies,
  hiddenListings,
  hiddenCompanies,
  connectorEntries,
  preference,
  runs,
  analytics,
}: {
  briefing: DiscoveryBriefing;
  newListings: DiscoveredListing[];
  newCompanies: DiscoveredCompany[];
  savedListings: DiscoveredListing[];
  savedCompanies: DiscoveredCompany[];
  hiddenListings: DiscoveredListing[];
  hiddenCompanies: DiscoveredCompany[];
  connectorEntries: ConnectorMarketplaceEntry[];
  preference: DiscoveryPreference | null;
  runs: DiscoveryRun[];
  analytics: DiscoveryAnalytics;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DailyBriefingCard briefing={briefing} />

      <Tabs defaultValue="feed">
        <TabsList className="flex-wrap">
          <TabsTrigger value="feed">Job Feed</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="flex flex-col gap-6">
          <DiscoveryShelves listings={newListings} companies={newCompanies} />
          <JobFeed
            listings={newListings}
            emptyTitle="No new jobs yet"
            emptyDescription="Run discovery (or wait for your next scheduled run) to see AI-ranked jobs here."
          />
        </TabsContent>

        <TabsContent value="companies">
          <CompanyFeed
            companies={newCompanies}
            emptyTitle="No new companies yet"
            emptyDescription="Run discovery to see AI-ranked companies here."
          />
        </TabsContent>

        <TabsContent value="saved" className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Saved jobs</h2>
            <JobFeed
              listings={savedListings}
              emptyTitle="No saved jobs"
              emptyDescription="Save a job from your feed to see it here."
            />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Saved companies</h2>
            <CompanyFeed
              companies={savedCompanies}
              emptyTitle="No saved companies"
              emptyDescription="Save a company from your feed to see it here."
            />
          </div>
        </TabsContent>

        <TabsContent value="hidden" className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Hidden & dismissed jobs</h2>
            <JobFeed
              listings={hiddenListings}
              emptyTitle="Nothing hidden"
              emptyDescription="Jobs you hide or dismiss from your feed appear here."
            />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Hidden & dismissed companies</h2>
            <CompanyFeed
              companies={hiddenCompanies}
              emptyTitle="Nothing hidden"
              emptyDescription="Companies you hide or dismiss from your feed appear here."
            />
          </div>
        </TabsContent>

        <TabsContent value="connectors">
          <ConnectorMarketplace entries={connectorEntries} />
        </TabsContent>

        <TabsContent value="preferences">
          <DiscoveryPreferencesPanel initialPreference={preference} />
        </TabsContent>

        <TabsContent value="history">
          <DiscoveryHistoryPanel runs={runs} />
        </TabsContent>

        <TabsContent value="analytics">
          <DiscoveryAnalyticsPanel analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
