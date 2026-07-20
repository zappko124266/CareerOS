"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { createRecruiterAction } from "@/actions/recruiters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/use-async-action";
import { RECRUITER_INTERACTION_TYPE_LABEL } from "@/features/recruiters/types";
import type { RecruiterInteractionType } from "@/features/recruiters/types";
import type { Recruiter, RecruiterInteraction } from "@/generated/prisma/client";

type RecruiterWithSummary = Recruiter & {
  company: { id: string; name: string } | null;
  interactions: RecruiterInteraction[];
  _count: { interactions: number };
};

export function RecruitersListPanel({
  recruiters: initialRecruiters,
}: {
  recruiters: RecruiterWithSummary[];
}) {
  const [recruiters, setRecruiters] = useState(initialRecruiters);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const createAction = useAsyncAction(createRecruiterAction);

  async function handleCreate() {
    if (!name.trim()) return;
    const result = await createAction.run({ name: name.trim(), title: title.trim() || undefined });
    if (result) {
      setRecruiters((prev) => [
        { ...result, company: null, interactions: [], _count: { interactions: 0 } },
        ...prev,
      ]);
      setName("");
      setTitle("");
      toast.success("Recruiter added");
    } else if (createAction.error) {
      toast.error(createAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruiters</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every interaction here is something you told CareerOS happened — real, self-reported
          career memory, never inferred.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Add a recruiter</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recruiter-name">Name</Label>
              <Input id="recruiter-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recruiter-title">Title (optional)</Label>
              <Input id="recruiter-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createAction.isPending || !name.trim()} size="sm" className="w-fit">
            <Plus />
            {createAction.isPending ? "Adding…" : "Add recruiter"}
          </Button>
          {createAction.error && <p className="text-destructive text-sm">{createAction.error}</p>}
        </CardContent>
      </Card>

      {recruiters.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No recruiters tracked yet"
          description="Add a recruiter above to start logging your interactions with them."
          className="py-16"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {recruiters.map((recruiter) => (
            <Card key={recruiter.id}>
              <CardContent className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-medium">{recruiter.name}</p>
                  <p className="text-muted-foreground wrap-break-word text-xs">
                    {[recruiter.title, recruiter.company?.name].filter(Boolean).join(" · ") || "No details yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {recruiter.interactions[0] && (
                    <Badge variant="secondary">
                      {RECRUITER_INTERACTION_TYPE_LABEL[recruiter.interactions[0].type as RecruiterInteractionType]}
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {recruiter._count.interactions} interaction{recruiter._count.interactions === 1 ? "" : "s"}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/recruiters/${recruiter.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
