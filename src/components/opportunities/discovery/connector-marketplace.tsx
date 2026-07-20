"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { updateConnectorPreferenceAction } from "@/actions/discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatRelativeTime } from "@/lib/utils";
import { CONNECTOR_CATEGORY_LABEL } from "@/features/discovery/connectors/catalog";
import type { ConnectorCategory } from "@/features/discovery/connectors/catalog";
import type { ConnectorMarketplaceEntry } from "@/features/discovery/connectors/status";

type ViewFilter = "ALL" | "ENABLED" | "DISABLED" | "FAVORITES" | "RECENTLY_USED" | "RECOMMENDED";
type SortOption = "NAME" | "CATEGORY" | "JOBS_FOUND" | "LAST_USED";

const VIEW_FILTER_LABEL: Record<ViewFilter, string> = {
  ALL: "All",
  ENABLED: "Enabled",
  DISABLED: "Disabled",
  FAVORITES: "Favorites",
  RECENTLY_USED: "Recently Used",
  RECOMMENDED: "Recommended",
};

function ConnectorLogo({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
      {initial}
    </div>
  );
}

function HealthBadge({ health }: { health: ConnectorMarketplaceEntry["health"] }) {
  if (health === "HEALTHY") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="size-3" /> Healthy
      </Badge>
    );
  }
  if (health === "ERROR") {
    // `variant="destructive"` fails WCAG AA contrast at this badge's small
    // text size (verified via axe) — the icon alone carries the red
    // signal; the label itself uses the same accessible outline style as
    // every other badge here.
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="text-destructive size-3" /> Error
      </Badge>
    );
  }
  return <Badge variant="outline">Unknown</Badge>;
}

function ConnectorCard({
  entry,
  onChange,
}: {
  entry: ConnectorMarketplaceEntry;
  onChange: (connectorId: string, patch: { enabled?: boolean; favorited?: boolean }) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleToggle(field: "enabled" | "favorited", value: boolean) {
    setPending(true);
    const result = await updateConnectorPreferenceAction({ connectorId: entry.id, [field]: value });
    setPending(false);

    if (result.status === "success") {
      onChange(entry.id, { [field]: value });
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <ConnectorLogo name={entry.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{entry.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {CONNECTOR_CATEGORY_LABEL[entry.category]} · {entry.region}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("favorited", !entry.favorited)}
            disabled={pending}
            aria-label={entry.favorited ? "Remove favorite" : "Add favorite"}
            aria-pressed={entry.favorited}
          >
            <Star className={entry.favorited ? "size-4 fill-current text-amber-500" : "text-muted-foreground size-4"} />
          </button>
        </div>

        <p className="text-muted-foreground text-sm">{entry.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {entry.hasLiveSearch ? (
            <Badge variant="secondary">Live search</Badge>
          ) : (
            <Badge variant="outline">Catalog only</Badge>
          )}
          {entry.hasLiveSearch && (
            <Badge
              variant={
                entry.authStatus === "AUTHENTICATED" || entry.authStatus === "NOT_REQUIRED"
                  ? "secondary"
                  : "outline"
              }
            >
              {entry.authStatus === "AUTHENTICATED"
                ? "Authenticated"
                : entry.authStatus === "NOT_REQUIRED"
                  ? "No key required"
                  : "Not configured"}
            </Badge>
          )}
          {entry.hasLiveSearch && <HealthBadge health={entry.health} />}
        </div>

        {!entry.hasLiveSearch && entry.unavailableReason && (
          <p className="text-muted-foreground text-xs">{entry.unavailableReason}</p>
        )}

        {entry.hasLiveSearch && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Last sync</dt>
              <dd>{entry.lastUsedAt ? formatRelativeTime(new Date(entry.lastUsedAt)) : "Never"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Jobs found</dt>
              <dd>{entry.jobsFound}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Applications sent</dt>
              <dd>{entry.applicationsSent}</dd>
            </div>
            {entry.lastErrorMessage && (
              <div className="col-span-2 flex justify-between gap-2">
                <dt className="text-destructive">Last error</dt>
                <dd className="text-destructive truncate">{entry.lastErrorMessage}</dd>
              </div>
            )}
          </dl>
        )}

        {entry.hasLiveSearch && (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium">Enabled for discovery</span>
            <Switch
              checked={entry.enabled}
              disabled={pending}
              onCheckedChange={(checked) => handleToggle("enabled", checked)}
              aria-label={`Enable ${entry.name}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The Universal Job Connector Marketplace. Adding a future connector to
 * `CONNECTOR_CATALOG` requires zero changes here — every card, filter,
 * and sort option is driven entirely by the catalog + per-user state, not
 * anything connector-specific.
 */
export function ConnectorMarketplace({
  entries: initialEntries,
}: {
  entries: ConnectorMarketplaceEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ConnectorCategory | "ALL">("ALL");
  const [view, setView] = useState<ViewFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("NAME");

  function handleChange(connectorId: string, patch: { enabled?: boolean; favorited?: boolean }) {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === connectorId ? { ...entry, ...patch } : entry)),
    );
  }

  async function handleBulkToggle(enabled: boolean) {
    const liveEntries = entries.filter((entry) => entry.hasLiveSearch);
    await Promise.all(
      liveEntries.map((entry) => updateConnectorPreferenceAction({ connectorId: entry.id, enabled })),
    );
    setEntries((prev) => prev.map((entry) => (entry.hasLiveSearch ? { ...entry, enabled } : entry)));
    toast.success(enabled ? "All connectors enabled" : "All connectors disabled");
  }

  const filtered = useMemo(() => {
    let result = entries;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) || entry.description.toLowerCase().includes(query),
      );
    }

    if (category !== "ALL") {
      result = result.filter((entry) => entry.category === category);
    }

    switch (view) {
      case "ENABLED":
        result = result.filter((entry) => entry.hasLiveSearch && entry.enabled);
        break;
      case "DISABLED":
        result = result.filter((entry) => entry.hasLiveSearch && !entry.enabled);
        break;
      case "FAVORITES":
        result = result.filter((entry) => entry.favorited);
        break;
      case "RECENTLY_USED":
        result = result.filter((entry) => entry.lastUsedAt !== null);
        break;
      case "RECOMMENDED":
        result = result.filter((entry) => entry.hasLiveSearch);
        break;
    }

    const sorted = [...result];
    switch (sort) {
      case "NAME":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "CATEGORY":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "JOBS_FOUND":
        sorted.sort((a, b) => b.jobsFound - a.jobsFound);
        break;
      case "LAST_USED":
        sorted.sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0));
        break;
    }

    return sorted;
  }, [entries, search, category, view, sort]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search connectors…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(VIEW_FILTER_LABEL) as ViewFilter[]).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={view === option ? "default" : "outline"}
                onClick={() => setView(option)}
              >
                {VIEW_FILTER_LABEL[option]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={(value) => setCategory(value as ConnectorCategory | "ALL")}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {(Object.keys(CONNECTOR_CATEGORY_LABEL) as ConnectorCategory[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {CONNECTOR_CATEGORY_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Sort connectors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAME">Sort: Name</SelectItem>
                <SelectItem value="CATEGORY">Sort: Category</SelectItem>
                <SelectItem value="JOBS_FOUND">Sort: Jobs found</SelectItem>
                <SelectItem value="LAST_USED">Sort: Last used</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 sm:ml-auto">
              <Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)}>
                Select all
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)}>
                Deselect all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No connectors match"
          description="Try a different search term or filter."
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ConnectorCard key={entry.id} entry={entry} onChange={handleChange} />
          ))}
        </div>
      )}
    </div>
  );
}
