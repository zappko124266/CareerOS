"use client";

import { useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

import { getSkillGapAction } from "@/actions/dashboard";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";

const IMPORTANCE_VARIANT = {
  critical: "destructive",
  important: "secondary",
  "nice-to-have": "outline",
} as const;

export function SkillsProgressCard() {
  const [open, setOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const { run, isPending, isSlow, result, error, reset } = useAsyncAction(
    getSkillGapAction,
  );

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-muted-foreground size-4" />
          Skills Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        {!result ? (
          <EmptyState
            icon={TrendingUp}
            title="Not generated yet"
            description="Tell CareerOS a target role and its Skill Gap Analysis will compare it against your resume."
            action={
              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (!next) reset();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Analyze skill gap</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Skill gap analysis</DialogTitle>
                    <DialogDescription>
                      Enter the role you&apos;re targeting — CareerOS compares
                      it against your latest resume using the real Skill Gap
                      Analysis service.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="target-role">Target role</Label>
                    <Input
                      id="target-role"
                      placeholder="e.g. Senior Backend Engineer"
                      value={targetRole}
                      onChange={(event) => setTargetRole(event.target.value)}
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
                      onClick={() => run(targetRole)}
                      disabled={isPending || !targetRole.trim()}
                    >
                      <Sparkles />
                      {isPending ? "Analyzing…" : "Analyze"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
            className="flex-1 py-8"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p className="text-sm font-medium">
                {result.existingSkills.length} skills matched
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.existingSkills.slice(0, 6).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">
                {result.missingSkills.length} gaps found
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missingSkills.slice(0, 6).map((gap) => (
                  <Badge
                    key={gap.skill}
                    variant={IMPORTANCE_VARIANT[gap.importance]}
                  >
                    {gap.skill}
                  </Badge>
                ))}
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
              Analyze another role
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
