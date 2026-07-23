"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { CategorizedRequirementList } from "@/components/opportunities/categorized-requirement-list";
import { OpportunityScoreCard } from "@/components/opportunities/opportunity-score-card";
import { STATUS_LABEL } from "@/features/opportunities/types";
import type { OpportunityIntelligence } from "@/features/opportunities/intelligence";
import type { OpportunityScoreV2Factors } from "@/features/discovery/types";
import type { Opportunity } from "@/generated/prisma/client";

interface ComparisonRow {
  opportunity: Opportunity;
  intelligence: OpportunityIntelligence;
  score: { factors: OpportunityScoreV2Factors; overallScore: number };
}

function formatSalary(opportunity: Opportunity) {
  if (!opportunity.salaryMin && !opportunity.salaryMax) return null;
  const currency = opportunity.salaryCurrency ?? "";
  if (opportunity.salaryMin && opportunity.salaryMax) {
    return `${currency}${opportunity.salaryMin.toLocaleString()}–${opportunity.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(opportunity.salaryMin ?? opportunity.salaryMax)!.toLocaleString()}+`;
}

export function JobComparisonWorkspace({
  allOpportunities,
  selectedIds,
  comparisons,
  maxCompare,
}: {
  allOpportunities: { id: string; title: string; companyName: string }[];
  selectedIds: string[];
  comparisons: ComparisonRow[];
  maxCompare: number;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxCompare) {
        next.add(id);
      }
      return next;
    });
  }

  function handleCompare() {
    router.push(`/opportunities/compare?ids=${Array.from(checked).join(",")}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare jobs</h1>
        <p className="text-muted-foreground text-sm">
          Pick up to {maxCompare} saved opportunities to see their real match scores, missing
          skills, and details side by side.
        </p>
      </div>

      {allOpportunities.length === 0 ? (
        <EmptyState
          title="No saved opportunities yet"
          description="Save a few jobs first, then come back here to compare them."
          className="py-12"
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allOpportunities.map((opportunity) => (
                <label
                  key={opportunity.id}
                  className="ring-foreground/10 flex items-center gap-2.5 rounded-lg p-2.5 ring-1"
                >
                  <Checkbox
                    checked={checked.has(opportunity.id)}
                    onCheckedChange={() => toggle(opportunity.id)}
                    disabled={!checked.has(opportunity.id) && checked.size >= maxCompare}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-medium">{opportunity.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {opportunity.companyName}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Button onClick={handleCompare} disabled={checked.size < 2} className="w-fit" size="sm">
              Compare {checked.size > 0 ? `(${checked.size})` : ""}
            </Button>
          </CardContent>
        </Card>
      )}

      {comparisons.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${comparisons.length}, minmax(16rem, 1fr))` }}
        >
          {comparisons.map(({ opportunity, intelligence, score }) => {
            const salary = formatSalary(opportunity);
            return (
              <div key={opportunity.id} className="flex flex-col gap-4">
                <Card>
                  <CardContent className="flex flex-col gap-2">
                    <Link
                      href={`/opportunities/${opportunity.id}`}
                      className="wrap-break-word text-sm font-semibold hover:underline"
                    >
                      {opportunity.title}
                    </Link>
                    <p className="text-muted-foreground wrap-break-word text-sm">
                      {opportunity.companyName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {opportunity.location && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" />
                          {opportunity.location}
                        </span>
                      )}
                      {opportunity.remote && <Badge variant="secondary">Remote</Badge>}
                    </div>
                    {salary && <p className="text-sm font-medium">{salary}</p>}
                    <Badge variant="outline" className="w-fit">
                      {STATUS_LABEL[opportunity.status]}
                    </Badge>
                  </CardContent>
                </Card>

                <OpportunityScoreCard factors={score.factors} overallScore={score.overallScore} />

                {intelligence.match.missingSkills.length > 0 && (
                  <Card>
                    <CardContent>
                      <CategorizedRequirementList requirements={intelligence.match.missingSkills} />
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
