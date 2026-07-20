"use client";

import { useState } from "react";
import { Bookmark, ExternalLink, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

import { setListingDispositionAction } from "@/actions/discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { JOB_MATCH_FACTOR_LABEL } from "@/features/discovery/types";
import type { JobMatchFactors, RankingFactor } from "@/features/discovery/types";
import type { DiscoveredListing } from "@/generated/prisma/client";

import { MatchFactorsList } from "./match-factors-list";

function JobFeedCard({
  listing,
  onDispositionChange,
}: {
  listing: DiscoveredListing;
  onDispositionChange: (listing: DiscoveredListing) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<"SAVED" | "HIDDEN" | "REJECTED" | null>(null);
  const factors = listing.matchFactors as unknown as JobMatchFactors | null;

  async function handleAction(disposition: "SAVED" | "HIDDEN" | "REJECTED") {
    setPending(disposition);
    const result = await setListingDispositionAction({ listingId: listing.id, disposition });
    setPending(null);

    if (result.status === "success") {
      onDispositionChange(result.data);
      toast.success(
        disposition === "SAVED" ? "Saved to your applications" : disposition === "HIDDEN" ? "Hidden" : "Dismissed",
      );
    } else {
      toast.error(result.message);
    }
  }

  const skills = Array.isArray(listing.skills)
    ? (listing.skills as unknown[]).filter((skill): skill is string => typeof skill === "string")
    : [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{listing.title}</h3>
            <p className="text-muted-foreground truncate text-sm">
              {listing.companyName}
              {listing.location ? ` · ${listing.location}` : ""}
            </p>
          </div>
          {listing.matchScore !== null && (
            <Badge variant="secondary" className="shrink-0">
              {listing.matchScore}/100 match
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {listing.remote && <Badge variant="outline">Remote</Badge>}
          {listing.employmentType && <Badge variant="outline">{listing.employmentType}</Badge>}
          {skills.slice(0, 6).map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>

        {factors && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="w-fit"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Hide match details" : "Why this match?"}
            </Button>
            {expanded && (
              <MatchFactorsList
                overallScore={listing.matchScore ?? 0}
                factors={factors as unknown as Record<string, RankingFactor>}
                labels={JOB_MATCH_FACTOR_LABEL}
              />
            )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button asChild size="sm" variant="outline">
            <a href={listing.applyUrl} target="_blank" rel="noopener noreferrer">
              View listing
              <ExternalLink />
            </a>
          </Button>
          <div className="flex flex-wrap gap-2">
            {listing.disposition !== "SAVED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending !== null}
                onClick={() => handleAction("SAVED")}
              >
                <Bookmark className="size-3.5" />
                {pending === "SAVED" ? "Saving…" : "Save"}
              </Button>
            )}
            {listing.disposition !== "HIDDEN" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending !== null}
                onClick={() => handleAction("HIDDEN")}
              >
                <EyeOff className="size-3.5" />
                Hide
              </Button>
            )}
            {listing.disposition !== "REJECTED" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending !== null}
                onClick={() => handleAction("REJECTED")}
              >
                <X className="size-3.5" />
                Not relevant
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Renders a list of discovery-feed jobs — reused for the main feed
 * (`disposition="NEW"`) and the Saved/Hidden views (parameterized by the
 * parent's own filtered list), rather than three separate list
 * components. */
export function JobFeed({
  listings: initialListings,
  emptyTitle,
  emptyDescription,
}: {
  listings: DiscoveredListing[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [listings, setListings] = useState(initialListings);

  function handleDispositionChange(updated: DiscoveredListing) {
    setListings((prev) => prev.filter((listing) => listing.id !== updated.id));
  }

  if (listings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="py-12" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {listings.map((listing) => (
        <JobFeedCard key={listing.id} listing={listing} onDispositionChange={handleDispositionChange} />
      ))}
    </div>
  );
}
