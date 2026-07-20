import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "@/features/onboarding/service";

/**
 * First-time-experience card for the dashboard — reuses the dashboard
 * page itself (no new route). Real, code-computed progress
 * (`getOnboardingStatus`), not a separate "did they see the tutorial"
 * flag: a step is done because the underlying resume/LinkedIn
 * profile/opportunity row actually exists.
 *
 * Two states: brand new (0 of 3 done) gets welcome copy explaining what
 * CareerOS is; in progress (1-2 of 3) gets a progress bar plus the full
 * step list, each with its own explanation, not just the next one. Once
 * complete, this renders nothing — success is already communicated by
 * each action's own toast (resume saved, LinkedIn profile saved,
 * opportunity saved), so a fourth "congratulations" banner here would be
 * redundant rather than helpful.
 */
export function OnboardingCard({ status }: { status: OnboardingStatus }) {
  if (status.isComplete) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-muted-foreground size-4" />
          <p className="text-sm font-semibold">
            {status.isBrandNew ? "Welcome to CareerOS" : "Finish setting up"}
          </p>
        </div>

        {status.isBrandNew ? (
          <p className="text-muted-foreground text-sm">
            CareerOS is the operating system for your career — real ATS scoring, LinkedIn SEO,
            career gap analysis, and opportunity tracking, all grounded in your own data, never
            fabricated. The 3 steps below get you fully set up in a few minutes.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {status.completedCount} of {status.totalCount} steps complete — finish the rest to
            unlock the full dashboard.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Progress
            value={(status.completedCount / status.totalCount) * 100}
            aria-label="Onboarding progress"
            aria-valuetext={`${status.completedCount} of ${status.totalCount} steps complete`}
            className="flex-1"
          />
          <span className="text-muted-foreground shrink-0 text-xs">
            {status.completedCount}/{status.totalCount}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {status.steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 ring-1",
                step.completed ? "ring-foreground/5 opacity-60" : "ring-foreground/10",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    step.completed
                      ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.completed ? <Check className="size-3.5" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-muted-foreground text-xs">{step.description}</p>
                </div>
              </div>
              {!step.completed && (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
