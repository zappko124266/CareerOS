import { Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface OnboardingStepMeta {
  id: string;
  title: string;
}

/**
 * Mobile-first progress indicator: a progress bar + "Step X of N" label
 * always shown, with the full step-label row only on wider screens (a
 * 7-label row doesn't fit comfortably at 375px).
 */
export function OnboardingStepper({
  steps,
  currentIndex,
}: {
  steps: OnboardingStepMeta[];
  currentIndex: number;
}) {
  const progressPercent = Math.round((currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{steps[currentIndex].title}</span>
        <span className="text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </span>
      </div>
      <Progress value={progressPercent} aria-label="Onboarding progress" />

      <ol className="hidden gap-2 sm:flex">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs",
                  isComplete && "bg-foreground text-background",
                  isCurrent && "border-foreground border-2",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="size-3" /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
