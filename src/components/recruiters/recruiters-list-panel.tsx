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
import { RECRUITER_INTERACTION_TYPE_LABEL, RECRUITER_PRIORITY_LABEL } from "@/features/recruiters/types";
import { RELATIONSHIP_HEALTH_LABEL } from "@/features/recruiters/scoring";
import type { EnrichedRecruiter } from "@/features/recruiters/orchestrator";

const HEALTH_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  STRONG: "secondary",
  HEALTHY: "secondary",
  WARM: "outline",
  COOLING: "outline",
  COLD: "destructive",
  GHOSTED: "destructive",
  INACTIVE: "outline",
};

/**
 * The Networking CRM — Sprint 21, Module 4/11. Extends the existing
 * `/recruiters` list (originally a bare name/title/notes CRM) with real,
 * deterministically-computed relationship health and score
 * (`features/recruiters/{scoring,orchestrator}.ts`) — never a second
 * recruiter list.
 */
export function RecruitersListPanel({
  recruiters: initialRecruiters,
}: {
  recruiters: EnrichedRecruiter[];
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
        {
          ...result,
          company: null,
          interactions: [],
          interviews: [],
          relationship: { score: 30, responseRate: null, factors: [] },
          health: "INACTIVE",
          firstContact: null,
          lastContact: null,
          daysSinceLastInteraction: null,
          connectedOpportunityIds: [],
        },
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
          career memory, never inferred. Relationship health and score are computed deterministically
          from that same real history.
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
          {recruiters.map((recruiter) => {
            const tags = Array.isArray(recruiter.tags) ? (recruiter.tags as string[]) : [];
            return (
              <Card key={recruiter.id}>
                <CardContent className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="wrap-break-word text-sm font-medium">
                      {recruiter.name}
                      {recruiter.priority === "HIGH" && (
                        <Badge variant="outline" className="ml-1.5">
                          {RECRUITER_PRIORITY_LABEL[recruiter.priority]}
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground wrap-break-word text-xs">
                      {[recruiter.title, recruiter.company?.name].filter(Boolean).join(" · ") || "No details yet"}
                    </p>
                    {tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={HEALTH_BADGE_VARIANT[recruiter.health] ?? "outline"}>
                      {RELATIONSHIP_HEALTH_LABEL[recruiter.health]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{recruiter.relationship.score}/100</span>
                    {recruiter.interactions[0] && (
                      <Badge variant="secondary">
                        {RECRUITER_INTERACTION_TYPE_LABEL[recruiter.interactions[0].type]}
                      </Badge>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/recruiters/${recruiter.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
