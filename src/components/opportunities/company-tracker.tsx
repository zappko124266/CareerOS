import Link from "next/link";
import { ArrowLeft, Building2, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { CompanyAggregates } from "@/features/companies/types";

interface TrackedCompany {
  companyId: string;
  companyName: string;
  opportunityCount: number;
  isDreamCompany: boolean;
  aggregates: CompanyAggregates;
}

export function CompanyTracker({
  trackedCompanies,
  unlinkedDreamCompanies,
}: {
  trackedCompanies: TrackedCompany[];
  unlinkedDreamCompanies: string[];
}) {
  const hasAnything = trackedCompanies.length > 0 || unlinkedDreamCompanies.length > 0;

  // Dream companies first, then by how many opportunities are on file.
  const sorted = [...trackedCompanies].sort((a, b) => {
    if (a.isDreamCompany !== b.isDreamCompany) return a.isDreamCompany ? -1 : 1;
    return b.opportunityCount - a.opportunityCount;
  });

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Tracker</h1>
        <p className="text-muted-foreground text-sm">
          Every company you&apos;ve saved a job at, plus your dream companies from onboarding —
          real hiring signal for each, computed from listings CareerOS actually has on file.
        </p>
      </div>

      {!hasAnything ? (
        <EmptyState
          icon={Building2}
          title="No companies tracked yet"
          description="Save an opportunity, or add dream companies in your preferences, to start tracking them here."
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((company) => (
            <Link key={company.companyId} href={`/opportunities/companies/${company.companyId}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="wrap-break-word text-sm font-semibold">{company.companyName}</h2>
                    {company.isDreamCompany && (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <Star className="size-3" />
                        Dream
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-lg font-semibold">{company.opportunityCount}</p>
                      <p className="text-muted-foreground text-xs">Saved by you</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {company.aggregates.hiringFrequencyLast90Days}
                      </p>
                      <p className="text-muted-foreground text-xs">New in last 90 days</p>
                    </div>
                  </div>
                  {company.aggregates.averageInterviewDifficulty !== null && (
                    <p className="text-muted-foreground text-xs">
                      Interview difficulty: {company.aggregates.averageInterviewDifficulty}/5
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}

          {unlinkedDreamCompanies.map((name) => (
            <Card key={name} className="border-dashed">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="wrap-break-word text-sm font-semibold">{name}</h2>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Star className="size-3" />
                    Dream
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Not yet linked — save an opportunity at {name} to start tracking real hiring
                  signal here.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
