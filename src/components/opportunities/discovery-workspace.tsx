"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";

import {
  saveOpportunityAction,
  searchOpportunitiesAction,
  type ProviderAvailability,
} from "@/actions/opportunities";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { useAsyncAction } from "@/hooks/use-async-action";
import type {
  OpportunitySearchInput,
  SaveOpportunityInput,
} from "@/features/opportunities/types";

const DEFAULT_FILTERS: OpportunitySearchInput = { page: 1 };

function ProviderNotConfiguredEmptyState() {
  return (
    <EmptyState
      icon={Sparkles}
      title="No opportunity source is configured yet"
      description="Opportunity Discovery searches real listings from several connectors (Adzuna, Jooble, Arbeitnow, RemoteOK, Greenhouse, Lever, USAJobs, Reed) — nothing is shown until at least one is configured. Arbeitnow, RemoteOK, Greenhouse, and Lever need no API key; the rest need a free developer key. See docs/ARCHITECTURE.md#job-discovery-engine for setup and env vars, or the Connectors tab in AI Job Discovery."
      className="py-16"
    />
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="ring-foreground/10 flex h-56 flex-col gap-3 rounded-xl p-4 ring-1"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-auto h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function DiscoveryWorkspace({
  providers,
  initialSavedSourceIds,
  initialFilters = DEFAULT_FILTERS,
}: {
  providers: ProviderAvailability[];
  initialSavedSourceIds: string[];
  /** Sprint 1.5 (Personalization) — seeded from the user's own onboarding
   * answers (`DiscoveryPreference`) by the page; defaults to the plain
   * `{ page: 1 }` search when nothing's been set, same as before. */
  initialFilters?: OpportunitySearchInput;
}) {
  const configuredProviders = providers.filter((provider) => provider.configured);
  const [filters, setFilters] = useState<OpportunitySearchInput>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedKeys, setSavedKeys] = useState(new Set(initialSavedSourceIds));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const search = useAsyncAction(searchOpportunitiesAction);

  useEffect(() => {
    if (configuredProviders.length > 0) {
      search.run(initialFilters);
    }
    // Auto-run once on mount only — subsequent searches are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runSearch(next: OpportunitySearchInput) {
    setFilters(next);
    search.run(next);
  }

  async function handleSave(job: SaveOpportunityInput, key: string) {
    setSavingKey(key);
    const result = await saveOpportunityAction(job);
    setSavingKey(null);
    if (result.status === "success") {
      setSavedKeys((prev) => new Set(prev).add(key));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground text-sm">
            Real listings, scored against your resume — never invented.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default" size="sm" className="w-fit">
            <Link href="/opportunities/discovery">
              <Sparkles />
              AI Job Discovery
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/opportunities/analytics">
              <BarChart3 />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/recruiters">
              <Users />
              Recruiters
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/opportunities/connections">Account connections</Link>
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground -mt-4 text-sm">
        Searching manually here? <Link href="/opportunities/discovery" className="underline underline-offset-4">AI Job Discovery</Link> continuously
        finds and ranks opportunities for you in the background instead.
      </p>

      {configuredProviders.length === 0 ? (
        <ProviderNotConfiguredEmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Job title, skills, or company…"
                defaultValue={filters.query}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    runSearch({
                      ...filters,
                      query: event.currentTarget.value || undefined,
                      page: 1,
                    });
                  }
                }}
              />
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="sm:w-auto">
                  <SlidersHorizontal />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Filter opportunities</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="filter-location">Location</Label>
                    <Input
                      id="filter-location"
                      placeholder="e.g. Austin, TX"
                      defaultValue={filters.location}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          location: event.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="filter-remote">Remote only</Label>
                    <Switch
                      id="filter-remote"
                      checked={filters.remote ?? false}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, remote: checked }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="filter-salary">Minimum salary</Label>
                    <Input
                      id="filter-salary"
                      type="number"
                      min={0}
                      placeholder="e.g. 80000"
                      defaultValue={filters.salaryMin}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          salaryMin: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="filter-employment">Employment type</Label>
                    <Input
                      id="filter-employment"
                      placeholder="e.g. full_time, contract"
                      defaultValue={filters.employmentType}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          employmentType: event.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button
                    onClick={() => {
                      runSearch({ ...filters, page: 1 });
                      setFiltersOpen(false);
                    }}
                  >
                    Apply filters
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {search.result && search.result.providerFailures.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {search.result.providerFailures
                .map((failure) => failure.provider)
                .join(", ")}{" "}
              didn&apos;t respond this time — showing results from the rest.
            </p>
          )}

          {search.isPending ? (
            <ResultsSkeleton />
          ) : search.error ? (
            <EmptyState
              icon={Search}
              title="That search didn't work"
              description={search.error}
              action={
                <Button size="sm" onClick={() => runSearch(filters)}>
                  Try again
                </Button>
              }
              className="py-16"
            />
          ) : search.result && search.result.results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No opportunities found"
              description="Try a broader search — remove filters, or search a different title or location."
              className="py-16"
            />
          ) : search.result ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {search.result.results.map((job) => {
                const key = `${job.source}:${job.sourceId}`;
                return (
                  <OpportunityCard
                    key={key}
                    job={job}
                    saved={savedKeys.has(key)}
                    saving={savingKey === key}
                    onSave={() =>
                      handleSave(
                        {
                          source: job.source,
                          sourceId: job.sourceId,
                          type: job.type,
                          title: job.title,
                          companyName: job.companyName,
                          location: job.location,
                          remote: job.remote,
                          employmentType: job.employmentType,
                          salaryMin: job.salaryMin,
                          salaryMax: job.salaryMax,
                          salaryCurrency: job.salaryCurrency,
                          description: job.description,
                          skills: job.skills,
                          applyUrl: job.applyUrl,
                        },
                        key,
                      )
                    }
                  />
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
