"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";

import { rescoreResumeAction } from "@/actions/resume";
import { SubmitButton } from "@/components/shared/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IDLE_ACTION_STATE } from "@/types/action";

export function RescoreForm({ resumeId }: { resumeId: string }) {
  const [state, formAction] = useActionState(
    rescoreResumeAction,
    IDLE_ACTION_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="resumeId" value={resumeId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetJobDescription">
          Target job description (optional)
        </Label>
        <Textarea
          id="targetJobDescription"
          name="targetJobDescription"
          placeholder="Paste a job description to score keyword relevance against it specifically"
          rows={4}
        />
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Analysis updated.
        </p>
      )}
      <SubmitButton pendingText="Analyzing…" className="self-start">
        <Sparkles />
        Run ATS analysis
      </SubmitButton>
    </form>
  );
}
