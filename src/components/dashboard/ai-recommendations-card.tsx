"use client";

import { Lightbulb, Sparkles } from "lucide-react";

import { getCareerRecommendationsAction } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAsyncAction } from "@/hooks/use-async-action";

export function AiRecommendationsCard({
  hasResume,
}: {
  hasResume: boolean;
}) {
  const { run, isPending, isSlow, result, error, reset } = useAsyncAction(
    getCareerRecommendationsAction,
  );

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-muted-foreground size-4" />
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!result ? (
          <EmptyState
            icon={Lightbulb}
            title="Not generated yet"
            description={
              hasResume
                ? "Get AI-suggested next roles, skills to develop, and a concrete action plan based on your resume."
                : "Upload a resume first — CareerOS uses it to ground these recommendations in your real experience."
            }
            action={
              <div className="flex flex-col items-center gap-2">
                <Button size="sm" onClick={() => run()} disabled={!hasResume || isPending}>
                  <Sparkles />
                  {isPending ? "Thinking…" : "Get recommendations"}
                </Button>
                {error && <p className="text-destructive text-sm">{error}</p>}
                {isPending && isSlow && (
                  <p className="text-muted-foreground text-sm">
                    Still working — this can take up to a minute or two.
                  </p>
                )}
              </div>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p className="text-sm font-medium">Suggested next roles</p>
              <ul className="mt-2 flex flex-col gap-2">
                {result.suggestedNextRoles.slice(0, 2).map((role) => (
                  <li key={role.title} className="text-sm">
                    <span className="font-medium">{role.title}</span>
                    <span className="text-muted-foreground"> — {role.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">Action plan</p>
              <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
                {result.actionPlan.slice(0, 3).map((action) => (
                  <li key={action}>• {action}</li>
                ))}
              </ul>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto"
              onClick={reset}
            >
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
