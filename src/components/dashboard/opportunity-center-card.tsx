import Link from "next/link";
import { Building2, Clock, Sparkle, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { getApplicationCandidates } from "@/features/application-engine/discovery-pipeline";
import type { CareerBrain } from "@/features/career-brain/types";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function OpportunityRow({ opportunity, intelligence }: PriorityQueueRow) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="hover:bg-muted -mx-2 flex flex-col gap-1 rounded-lg px-2 py-2 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="wrap-break-word text-sm font-medium">{opportunity.title}</p>
        {intelligence.isDreamCompany && (
          <Badge variant="secondary" className="gap-1">
            <Sparkle className="size-3" />
            Dream company
          </Badge>
        )}
        {intelligence.match.score !== null && <Badge variant="outline">{intelligence.match.score}/100</Badge>}
      </div>
      <p className="text-muted-foreground wrap-break-word text-xs">
        {opportunity.companyName} — {intelligence.reasoning}
      </p>
    </Link>
  );
}

function RowList({ rows, emptyLabel }: { rows: PriorityQueueRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li key={row.opportunity.id}>
          <OpportunityRow {...row} />
        </li>
      ))}
    </ul>
  );
}

const TAB_LIMIT = 5;

/**
 * The Opportunity Center — Sprint 10, requirement 5. Four tabs, all pure
 * filters over data already computed by the Career Brain/Career Agent —
 * no new scoring, no new query:
 *  - Recommended: `snapshot.recommendedOpportunities` (Career Agent,
 *    Sprint 3/4), unchanged.
 *  - Dream Companies: `intelligence.isDreamCompany` (Sprint 2), already
 *    computed for every saved opportunity.
 *  - New Today: `opportunity.createdAt` — a real, existing timestamp.
 *  - Needs Attention: reuses Sprint 9's `getApplicationCandidates`
 *    (Application Engine's Discovery Pipeline — "not yet applied, not
 *    blacklisted") sorted by how long they've sat untouched
 *    (`updatedAt`), the same "gone quiet, deserving attention" concept
 *    the Follow-up automation task already applies to applied
 *    opportunities. There is no deadline/expiry field anywhere in this
 *    codebase, so this is the honest equivalent of "closing soon"
 *    rather than a fabricated countdown.
 */
export function OpportunityCenterCard({
  brain,
  recommended,
}: {
  brain: CareerBrain;
  recommended: PriorityQueueRow[];
}) {
  const rows = brain.raw.priorityQueueRows;

  const dreamCompanies = rows.filter((row) => row.intelligence.isDreamCompany).slice(0, TAB_LIMIT);
  const newToday = rows.filter((row) => isToday(row.opportunity.createdAt)).slice(0, TAB_LIMIT);
  const needsAttention = getApplicationCandidates(brain)
    .slice()
    .sort((a, b) => a.opportunity.updatedAt.getTime() - b.opportunity.updatedAt.getTime())
    .slice(0, TAB_LIMIT);

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="text-muted-foreground size-4" />
          Opportunity Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No saved opportunities yet"
            description="Save opportunities from Jobs and upload a resume to see your best fits here."
            action={
              <Button asChild size="sm">
                <Link href="/opportunities">Find jobs</Link>
              </Button>
            }
            className="py-8"
          />
        ) : (
          <Tabs defaultValue="recommended">
            <TabsList className="flex-wrap">
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
              <TabsTrigger value="dream">
                <Sparkle className="size-3.5" />
                Dream Companies
              </TabsTrigger>
              <TabsTrigger value="new">New Today</TabsTrigger>
              <TabsTrigger value="attention">
                <Clock className="size-3.5" />
                Needs Attention
              </TabsTrigger>
            </TabsList>
            <TabsContent value="recommended">
              <RowList rows={recommended} emptyLabel="No strong matches yet." />
            </TabsContent>
            <TabsContent value="dream">
              <RowList
                rows={dreamCompanies}
                emptyLabel="No saved opportunities at your dream companies yet."
              />
            </TabsContent>
            <TabsContent value="new">
              <RowList rows={newToday} emptyLabel="Nothing saved today yet." />
            </TabsContent>
            <TabsContent value="attention">
              <RowList rows={needsAttention} emptyLabel="Everything saved is already moving forward." />
            </TabsContent>
          </Tabs>
        )}
        <Button asChild size="sm" variant="ghost" className="mt-3 w-fit">
          <Link href="/applications">
            <Building2 />
            View all applications
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
