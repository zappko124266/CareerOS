"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { runDiscoveryNowAction } from "@/actions/discovery";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { DiscoveryBriefing } from "@/features/discovery/briefing";

export function DailyBriefingCard({ briefing }: { briefing: DiscoveryBriefing }) {
  const discoverAction = useAsyncAction(runDiscoveryNowAction);
  const [ranSummary, setRanSummary] = useState<string | null>(null);

  async function handleDiscoverNow() {
    const result = await discoverAction.run();
    if (result) {
      setRanSummary(
        `Found ${result.newJobsFound} new job${result.newJobsFound === 1 ? "" : "s"} and ${result.companiesFound} compan${result.companiesFound === 1 ? "y" : "ies"}.`,
      );
      toast.success("Discovery run complete");
    } else if (discoverAction.error) {
      toast.error(discoverAction.error);
    }
  }

  return (
    <Card className="bg-foreground text-background">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <p className="text-sm font-semibold">AI Daily Career Agent</p>
        </div>
        <h2 className="text-lg font-semibold">{briefing.headline}</h2>
        <p className="text-background/80 text-sm">{briefing.detail}</p>
        {briefing.improvementNote && (
          <p className="text-background/80 text-sm">{briefing.improvementNote}</p>
        )}
        {ranSummary && <p className="text-background/80 text-sm">{ranSummary}</p>}

        {discoverAction.isPending && discoverAction.isSlow && (
          <p className="text-background/80 text-sm">
            Still discovering — searching connectors and ranking results can take a minute or two.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={discoverAction.isPending}
            onClick={handleDiscoverNow}
          >
            {discoverAction.isPending ? "Discovering…" : "Discover now"}
          </Button>
          {briefing.actions.map((action) => (
            <Button key={action.id} asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
