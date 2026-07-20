"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteRecruiterAction,
  logRecruiterInteractionAction,
  updateRecruiterAction,
} from "@/actions/recruiters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import {
  RECRUITER_INTERACTION_TYPES,
  RECRUITER_INTERACTION_TYPE_LABEL,
} from "@/features/recruiters/types";
import type { RecruiterInteractionType } from "@/features/recruiters/types";
import type { Recruiter, RecruiterInteraction } from "@/generated/prisma/client";

type RecruiterWithInteractions = Recruiter & {
  company: { id: string; name: string } | null;
  interactions: RecruiterInteraction[];
};

export function RecruiterDetailPanel({
  recruiter: initialRecruiter,
}: {
  recruiter: RecruiterWithInteractions;
}) {
  const [recruiter, setRecruiter] = useState(initialRecruiter);
  const [notes, setNotes] = useState(initialRecruiter.notes ?? "");
  const [interactionType, setInteractionType] = useState<RecruiterInteractionType>("CONTACTED");
  const [interactionNote, setInteractionNote] = useState("");

  const updateAction = useAsyncAction(updateRecruiterAction);
  const deleteAction = useAsyncAction(deleteRecruiterAction);
  const interactionAction = useAsyncAction(logRecruiterInteractionAction);

  async function handleSaveNotes() {
    const result = await updateAction.run({
      recruiterId: recruiter.id,
      name: recruiter.name,
      title: recruiter.title ?? undefined,
      linkedinUrl: recruiter.linkedinUrl ?? undefined,
      email: recruiter.email ?? undefined,
      notes: notes || undefined,
    });
    if (result) {
      setRecruiter((prev) => ({ ...prev, ...result }));
      toast.success("Notes saved");
    } else if (updateAction.error) {
      toast.error(updateAction.error);
    }
  }

  async function handleDelete() {
    const result = await deleteAction.run({ recruiterId: recruiter.id });
    if (result) {
      toast.success("Recruiter removed");
      window.location.href = "/recruiters";
    } else if (deleteAction.error) {
      toast.error(deleteAction.error);
    }
  }

  async function handleLogInteraction() {
    const result = await interactionAction.run({
      recruiterId: recruiter.id,
      type: interactionType,
    });
    if (result) {
      setRecruiter((prev) => ({ ...prev, interactions: [result, ...prev.interactions] }));
      setInteractionNote("");
      toast.success("Interaction logged");
    } else if (interactionAction.error) {
      toast.error(interactionAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/recruiters">
          <ArrowLeft />
          Back to Recruiters
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{recruiter.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {[recruiter.title, recruiter.company?.name].filter(Boolean).join(" · ") || "No details yet"}
          </p>
        </div>
        <Button onClick={handleDelete} disabled={deleteAction.isPending} size="sm" variant="ghost">
          <Trash2 />
          Remove
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Notes</h2>
          <Textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth remembering about this recruiter…"
          />
          <Button onClick={handleSaveNotes} disabled={updateAction.isPending} size="sm" className="w-fit" variant="outline">
            {updateAction.isPending ? "Saving…" : "Save notes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Log an interaction</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interaction-type">Type</Label>
              <Select
                value={interactionType}
                onValueChange={(value) => setInteractionType(value as RecruiterInteractionType)}
              >
                <SelectTrigger id="interaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECRUITER_INTERACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {RECRUITER_INTERACTION_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interaction-note">Note (optional)</Label>
              <Input
                id="interaction-note"
                value={interactionNote}
                onChange={(event) => setInteractionNote(event.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleLogInteraction} disabled={interactionAction.isPending} size="sm" className="w-fit">
            <Plus />
            {interactionAction.isPending ? "Logging…" : "Log interaction"}
          </Button>
          {interactionAction.error && <p className="text-destructive text-sm">{interactionAction.error}</p>}

          {recruiter.interactions.length === 0 ? (
            <EmptyState title="No interactions logged yet" className="py-8" />
          ) : (
            <ul className="flex flex-col gap-2 border-t pt-3">
              {recruiter.interactions.map((interaction) => (
                <li key={interaction.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{RECRUITER_INTERACTION_TYPE_LABEL[interaction.type as RecruiterInteractionType]}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(new Date(interaction.occurredAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
