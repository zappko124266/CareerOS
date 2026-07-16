import { AlertTriangle, Info, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { OptimizationSuggestion } from "@/features/resume/schema";

const SEVERITY_ICON: Record<
  OptimizationSuggestion["severity"],
  typeof AlertTriangle
> = {
  high: AlertTriangle,
  medium: TriangleAlert,
  low: Info,
};

const SEVERITY_CLASS: Record<OptimizationSuggestion["severity"], string> = {
  high: "border-destructive/50 text-destructive [&>svg]:text-destructive",
  medium:
    "border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
  low: "",
};

export function OptimizationSuggestionsList({
  suggestions,
}: {
  suggestions: OptimizationSuggestion[];
}) {
  if (suggestions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No suggestions — looking good.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {suggestions.map((suggestion, index) => {
        const Icon = SEVERITY_ICON[suggestion.severity];
        return (
          <Alert key={index} className={SEVERITY_CLASS[suggestion.severity]}>
            <Icon />
            <AlertTitle>
              {suggestion.section} — {suggestion.issue}
            </AlertTitle>
            <AlertDescription>{suggestion.suggestion}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
