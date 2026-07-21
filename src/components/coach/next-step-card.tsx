import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NextStep } from "@/features/coach/recommend-next-step";

export function NextStepCard({ step }: { step: NextStep }) {
  return (
    <Card className="border-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="text-muted-foreground size-4" />
          Recommended Next Step
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold">{step.title}</p>
          <p className="text-muted-foreground text-sm">{step.why}</p>
        </div>
        <Button asChild className="w-fit shrink-0">
          <Link href={step.href}>{step.actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
