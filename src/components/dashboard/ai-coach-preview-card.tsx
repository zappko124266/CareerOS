import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachContext } from "@/features/coach/types";

/**
 * A compact teaser for the AI Coach chat — reuses `CoachContext` fields
 * already computed for this page (no new query), just frames them as an
 * invitation into `/coach` rather than duplicating the Roadmap or Next
 * Step logic shown elsewhere on this dashboard.
 */
export function AiCoachPreviewCard({ context }: { context: CoachContext }) {
  const teaser = context.onboarding.targetRole
    ? `Ask your AI Coach anything about landing a ${context.onboarding.targetRole} role.`
    : `Ask your AI Coach about ${context.nextStep.title.toLowerCase()} or anything else in your search.`;

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-muted-foreground size-4" />
          AI Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <p className="text-muted-foreground flex-1 text-sm">{teaser}</p>
        <Button asChild size="sm" className="w-fit">
          <Link href="/coach">Talk to your AI Coach</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
