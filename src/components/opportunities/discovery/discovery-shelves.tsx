"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildDiscoveryShelves } from "@/features/discovery/shelves";
import type { JobMatchFactors } from "@/features/discovery/types";
import type { DiscoveredCompany, DiscoveredListing } from "@/generated/prisma/client";

function formatSalary(listing: DiscoveredListing): string | null {
  if (!listing.salaryMax) return null;
  const currency = listing.salaryCurrency ?? "";
  return `${currency}${listing.salaryMax.toLocaleString()}`;
}

function ShelfListingCard({ listing, shelfKey }: { listing: DiscoveredListing; shelfKey: string }) {
  const factors = listing.matchFactors as unknown as JobMatchFactors | null;
  const salary = formatSalary(listing);

  return (
    <Card className="w-64 shrink-0">
      <CardContent className="flex flex-col gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{listing.title}</h4>
          <p className="text-muted-foreground truncate text-xs">{listing.companyName}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {listing.matchScore !== null && (
            <Badge variant="secondary">{listing.matchScore}/100</Badge>
          )}
          {shelfKey === "highest-salary" && salary && <Badge variant="outline">{salary}</Badge>}
          {shelfKey === "fastest-hiring" && factors?.recentHiringActivity.available && (
            <Badge variant="outline">{factors.recentHiringActivity.score}/100 hiring pace</Badge>
          )}
          {listing.remote && <Badge variant="outline">Remote</Badge>}
        </div>
        <a
          href={listing.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground mt-1 flex w-fit items-center gap-1 text-xs underline-offset-2 hover:underline"
        >
          View listing
          <ExternalLink className="size-3" />
        </a>
      </CardContent>
    </Card>
  );
}

function ShelfCompanyCard({ company }: { company: DiscoveredCompany }) {
  return (
    <Card className="w-64 shrink-0">
      <CardContent className="flex flex-col gap-2">
        <h4 className="truncate text-sm font-semibold">{company.companyName}</h4>
        <p className="text-muted-foreground text-xs">
          {company.openRoles} open role{company.openRoles === 1 ? "" : "s"} found
        </p>
        {company.matchScore !== null && (
          <Badge variant="secondary" className="w-fit">
            {company.matchScore}/100 match
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Sprint 9, Module 9 — categorized shelves rendered above the flat Job
 * Feed tab. Purely a different view over the same `newListings`/
 * `newCompanies` arrays the Discovery page already fetches — see
 * `buildDiscoveryShelves`'s doc comment for why this needs no new
 * queries or AI calls.
 */
export function DiscoveryShelves({
  listings,
  companies,
}: {
  listings: DiscoveredListing[];
  companies: DiscoveredCompany[];
}) {
  const { jobShelves, companyShelves } = buildDiscoveryShelves(listings, companies);
  const shelves = [...jobShelves.filter((shelf) => shelf.items.length > 0), ...companyShelves.filter((shelf) => shelf.items.length > 0)];

  if (shelves.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {jobShelves
        .filter((shelf) => shelf.items.length > 0)
        .map((shelf) => (
          <div key={shelf.key} className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold">{shelf.title}</h3>
              <p className="text-muted-foreground text-xs">{shelf.description}</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {shelf.items.map((listing) => (
                <ShelfListingCard key={listing.id} listing={listing} shelfKey={shelf.key} />
              ))}
            </div>
          </div>
        ))}
      {companyShelves
        .filter((shelf) => shelf.items.length > 0)
        .map((shelf) => (
          <div key={shelf.key} className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold">{shelf.title}</h3>
              <p className="text-muted-foreground text-xs">{shelf.description}</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {shelf.items.map((company) => (
                <ShelfCompanyCard key={company.id} company={company} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
