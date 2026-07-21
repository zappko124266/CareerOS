"use client";

import { useState } from "react";
import { Briefcase, Sparkles } from "lucide-react";

import { getJobMatchAction } from "@/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { RECOMMENDATION_TIER_LABEL } from "@/features/opportunities/types";

export function JobMatchCard() {
  const [open, setOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const { run, isPending, isSlow, result, error, reset } = useAsyncAction(
    getJobMatchAction,
  );

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="text-muted-foreground size-4" />
          Job Match Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!result ? (
          <EmptyState
            icon={Briefcase}
            title="Not generated yet"
            description="Paste a job description and CareerOS scores your fit against it using the real Job Match Analysis service."
            action={
              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (!next) reset();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Score a job</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Job match analysis</DialogTitle>
                    <DialogDescription>
                      Paste the job description you&apos;re considering.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="job-description">Job description</Label>
                    <Textarea
                      id="job-description"
                      rows={6}
                      placeholder="Paste the full job posting here…"
                      value={jobDescription}
                      onChange={(event) =>
                        setJobDescription(event.target.value)
                      }
                    />
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    {isPending && isSlow && (
                      <p className="text-muted-foreground text-sm">
                        Still working — this can take up to a minute or two.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => run(jobDescription)}
                      disabled={isPending || !jobDescription.trim()}
                    >
                      <Sparkles />
                      {isPending ? "Scoring…" : "Score my fit"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={result.matchScore} label="Job Match Score" />
              <div>
                <Badge>{RECOMMENDATION_TIER_LABEL[result.recommendation]}</Badge>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {result.summary}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              Score another job
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
