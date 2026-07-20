"use client";

import { useState } from "react";
import { Bookmark, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

import { setCompanyDispositionAction } from "@/actions/discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { COMPANY_MATCH_FACTOR_LABEL } from "@/features/discovery/types";
import type { CompanyMatchFactors, RankingFactor } from "@/features/discovery/types";
import type { DiscoveredCompany } from "@/generated/prisma/client";

import { MatchFactorsList } from "./match-factors-list";

function CompanyFeedCard({
  company,
  onDispositionChange,
}: {
  company: DiscoveredCompany;
  onDispositionChange: (company: DiscoveredCompany) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<"SAVED" | "HIDDEN" | "REJECTED" | null>(null);
  const factors = company.matchFactors as unknown as CompanyMatchFactors | null;
  const eligibilityNotes = Array.isArray(company.eligibilityNotes)
    ? (company.eligibilityNotes as unknown[]).filter((note): note is string => typeof note === "string")
    : [];

  async function handleAction(disposition: "SAVED" | "HIDDEN" | "REJECTED") {
    setPending(disposition);
    const result = await setCompanyDispositionAction({ companyId: company.id, disposition });
    setPending(null);

    if (result.status === "success") {
      onDispositionChange(result.data);
      toast.success(disposition === "SAVED" ? "Saved" : disposition === "HIDDEN" ? "Hidden" : "Dismissed");
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{company.companyName}</h3>
            <p className="text-muted-foreground text-sm">
              {company.openRoles} open role{company.openRoles === 1 ? "" : "s"} found
            </p>
          </div>
          {company.matchScore !== null && (
            <Badge variant="secondary" className="shrink-0">
              {company.matchScore}/100 match
            </Badge>
          )}
        </div>

        {eligibilityNotes.length > 0 && (
          <div>
            <p className="text-sm font-medium">Improve these to qualify for more roles here</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {eligibilityNotes.map((note) => (
                <Badge key={note} variant="outline">
                  {note}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {factors && (
          <>
            <Button size="sm" variant="ghost" className="w-fit" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Hide match details" : "Why this match?"}
            </Button>
            {expanded && (
              <MatchFactorsList
                overallScore={company.matchScore ?? 0}
                factors={factors as unknown as Record<string, RankingFactor>}
                labels={COMPANY_MATCH_FACTOR_LABEL}
              />
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-3">
          {company.disposition !== "SAVED" && (
            <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => handleAction("SAVED")}>
              <Bookmark className="size-3.5" />
              {pending === "SAVED" ? "Saving…" : "Save"}
            </Button>
          )}
          {company.disposition !== "HIDDEN" && (
            <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => handleAction("HIDDEN")}>
              <EyeOff className="size-3.5" />
              Hide
            </Button>
          )}
          {company.disposition !== "REJECTED" && (
            <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => handleAction("REJECTED")}>
              <X className="size-3.5" />
              Not relevant
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CompanyFeed({
  companies: initialCompanies,
  emptyTitle,
  emptyDescription,
}: {
  companies: DiscoveredCompany[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [companies, setCompanies] = useState(initialCompanies);

  function handleDispositionChange(updated: DiscoveredCompany) {
    setCompanies((prev) => prev.filter((company) => company.id !== updated.id));
  }

  if (companies.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="py-12" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {companies.map((company) => (
        <CompanyFeedCard key={company.id} company={company} onDispositionChange={handleDispositionChange} />
      ))}
    </div>
  );
}
