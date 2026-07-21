"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { STATUS_LABEL } from "@/features/opportunities/types";
import type { PriorityQueueRow, PriorityTier } from "@/features/opportunities/priority-queue";
import { formatRelativeTime } from "@/lib/utils";

function OpportunityRow({ opportunity, intelligence }: PriorityQueueRow) {
  return (
    <Link href={`/opportunities/${opportunity.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="wrap-break-word font-semibold">{opportunity.title}</h2>
              {intelligence.isDreamCompany && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkle className="size-3" />
                  Dream company
                </Badge>
              )}
              {intelligence.match.score !== null && (
                <Badge variant="outline">{intelligence.match.score}/100 match</Badge>
              )}
            </div>
            <p className="text-muted-foreground wrap-break-word text-sm">{opportunity.companyName}</p>
            <p className="text-muted-foreground wrap-break-word mt-1 text-xs">{intelligence.reasoning}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge variant="secondary">{STATUS_LABEL[opportunity.status]}</Badge>
            <span className="text-muted-foreground text-xs">
              {formatRelativeTime(opportunity.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Sprint 2 — human-friendly filtering over the Priority Queue's already
 * server-computed tiers. Local `useState` filtering (this codebase's
 * established convention for list filters — never URL search params; see
 * `discovery-preferences-panel.tsx`/`discovery-workspace.tsx`), since this
 * list is neither paginated nor meant to be shared/bookmarked. No
 * re-fetch on filter change — every row was already scored server-side.
 */
export function ApplicationsFilterBar({ tiers }: { tiers: PriorityTier[] }) {
  const [activeTierKeys, setActiveTierKeys] = useState<Set<string>>(
    () => new Set(tiers.map((tier) => tier.key)),
  );
  const [dreamCompanyOnly, setDreamCompanyOnly] = useState(false);
  const [missingSkillsOnly, setMissingSkillsOnly] = useState(false);

  function toggleTier(key: string) {
    setActiveTierKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visibleTiers = useMemo(() => {
    return tiers
      .filter((tier) => activeTierKeys.has(tier.key))
      .map((tier) => ({
        ...tier,
        rows: tier.rows.filter((row) => {
          if (dreamCompanyOnly && !row.intelligence.isDreamCompany) return false;
          if (missingSkillsOnly && row.intelligence.match.missingSkills.length === 0) return false;
          return true;
        }),
      }))
      .filter((tier) => tier.rows.length > 0);
  }, [tiers, activeTierKeys, dreamCompanyOnly, missingSkillsOnly]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {tiers.map((tier) => {
          const active = activeTierKeys.has(tier.key);
          return (
            <Button
              key={tier.key}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              aria-pressed={active}
              onClick={() => toggleTier(tier.key)}
            >
              {tier.title}
              <span className="text-muted-foreground ml-1">{tier.rows.length}</span>
            </Button>
          );
        })}
        <Button
          type="button"
          variant={dreamCompanyOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={dreamCompanyOnly}
          onClick={() => setDreamCompanyOnly((prev) => !prev)}
        >
          Dream companies
        </Button>
        <Button
          type="button"
          variant={missingSkillsOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={missingSkillsOnly}
          onClick={() => setMissingSkillsOnly((prev) => !prev)}
        >
          Missing skills
        </Button>
      </div>

      {visibleTiers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No opportunities match these filters"
          description="Try clearing a filter above to see more of your saved opportunities."
          className="py-16"
        />
      ) : (
        visibleTiers.map((tier) => (
          <div key={tier.key} className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">{tier.title}</h2>
              <p className="text-muted-foreground text-sm">{tier.description}</p>
            </div>
            <div className="flex flex-col gap-3">
              {tier.rows.map((row) => (
                <OpportunityRow key={row.opportunity.id} {...row} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
