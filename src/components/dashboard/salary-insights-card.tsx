"use client";

import { useState } from "react";
import { DollarSign, Sparkles } from "lucide-react";

import { getSalaryEstimateAction } from "@/actions/dashboard";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { SalaryPrefill } from "@/features/dashboard/types";

export function SalaryInsightsCard({ prefill }: { prefill: SalaryPrefill }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(prefill.role);
  const [location, setLocation] = useState(prefill.location);
  const [yearsOfExperience, setYearsOfExperience] = useState(
    prefill.yearsOfExperience?.toString() ?? "",
  );
  const { run, isPending, isSlow, result, error, reset } = useAsyncAction(
    getSalaryEstimateAction,
  );

  function handleSubmit() {
    run({
      role,
      location,
      yearsOfExperience: Number(yearsOfExperience) || 0,
      skills: prefill.skills,
    });
  }

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="text-muted-foreground size-4" />
          Salary Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!result ? (
          <EmptyState
            icon={DollarSign}
            title="Not generated yet"
            description="Get a structured compensation estimate for your role, location, and experience."
            action={
              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (!next) reset();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Estimate salary</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salary estimate</DialogTitle>
                    <DialogDescription>
                      Pre-filled from your resume where possible — adjust
                      anything before generating.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="salary-role">Role</Label>
                      <Input
                        id="salary-role"
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        placeholder="e.g. Senior Backend Engineer"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="salary-location">Location</Label>
                      <Input
                        id="salary-location"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="e.g. Austin, TX"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="salary-experience">
                        Years of experience
                      </Label>
                      <Input
                        id="salary-experience"
                        type="number"
                        min={0}
                        max={60}
                        value={yearsOfExperience}
                        onChange={(event) =>
                          setYearsOfExperience(event.target.value)
                        }
                      />
                    </div>
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
                      onClick={handleSubmit}
                      disabled={
                        isPending || !role.trim() || !location.trim()
                      }
                    >
                      <Sparkles />
                      {isPending ? "Estimating…" : "Estimate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {result.estimatedRange.currency}
                {result.estimatedRange.min.toLocaleString()}–
                {result.estimatedRange.max.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-sm">
                {result.percentile} percentile for this role and location
              </p>
            </div>
            <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
              {result.negotiationTips.slice(0, 2).map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              Re-estimate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
