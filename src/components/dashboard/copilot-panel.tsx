import Link from "next/link";
import { Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GreetingText } from "@/components/dashboard/greeting-text";
import { DashboardCommandPalette } from "@/components/dashboard/command-palette";
import type { Briefing } from "@/features/dashboard/briefing";

export function CopilotPanel({
  name,
  briefing,
}: {
  name: string;
  briefing: Briefing;
}) {
  return (
    <section
      aria-labelledby="copilot-heading"
      className="bg-foreground text-background relative overflow-hidden rounded-2xl p-6 sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(255,255,255,0.08),transparent)]"
      />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <span className="bg-background text-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
              <Sparkle className="size-4" />
            </span>
            <div>
              <p className="text-background/60 text-xs font-medium tracking-wide uppercase">
                AI Career Copilot
              </p>
              <h1 id="copilot-heading" className="mt-1 text-xl font-semibold sm:text-2xl">
                <GreetingText name={name} />
              </h1>
            </div>
          </div>

          <DashboardCommandPalette className="border-background/20 bg-background/10 text-background hover:bg-background/20 sm:w-56" />
        </div>

        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold sm:text-xl">{briefing.headline}</h2>
          <p className="text-background/70 mt-2 text-sm sm:text-base">
            {briefing.detail}
          </p>
        </div>

        {briefing.actions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {briefing.actions.map((action) => (
              <Button
                key={action.id}
                asChild
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
