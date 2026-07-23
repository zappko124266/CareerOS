"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, ListPlus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  generateApplicationStrategyAction,
  generateFollowUpRecommendationAction,
  recordApplicationSubmissionAction,
} from "@/actions/application-automation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
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
import type { ApplicationStrategyOutput } from "@/features/applications/format";
import {
  FOLLOW_UP_RECOMMENDATION_LABEL,
  PRE_APPLICATION_STATUSES,
  STRATEGY_FACTOR_LABEL,
  SUBMISSION_METHOD_LABEL,
  SUBMISSION_METHODS,
} from "@/features/applications/types";
import type { SubmissionMethod } from "@/features/applications/types";
import { STRATEGY_FACTOR_ORDER } from "@/features/applications/format";
import type { Checklist } from "@/features/opportunities/types";
import type {
  ApplicationDocument,
  ApplicationSubmission,
  FollowUpRecommendation,
  Opportunity,
} from "@/generated/prisma/client";

function StrategyFactorRow({ label, value, reasoning }: { label: string; value: boolean; reasoning: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {value ? (
        <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
      )}
      <div>
        <p className="text-sm font-medium">
          {value ? label : `${label} — already covered`}
        </p>
        <p className="text-muted-foreground text-xs">{reasoning}</p>
      </div>
    </div>
  );
}

export function ApplicationAutomationPanel({
  opportunity,
  applicationDocuments,
  latestStrategy,
  latestFollowUp,
  submissions,
  checklist,
  onChecklistChange,
}: {
  opportunity: Opportunity;
  applicationDocuments: ApplicationDocument[];
  latestStrategy: ApplicationStrategyOutput | null;
  latestFollowUp: FollowUpRecommendation | null;
  submissions: ApplicationSubmission[];
  /** Sprint 12 (Job Studio), requirement 7 — the Documents tab's
   * checklist, threaded here so the Strategy card's "still needs doing"
   * factors can seed it directly instead of the user retyping what the
   * AI already told them. */
  checklist: Checklist;
  onChecklistChange: (checklist: Checklist) => void;
}) {
  const [strategy, setStrategy] = useState(latestStrategy);
  const [followUp, setFollowUp] = useState(latestFollowUp);
  const [submissionList, setSubmissionList] = useState(submissions);
  const [method, setMethod] = useState<SubmissionMethod>("USER_APPROVED_BROWSER_MANUAL");
  const [notes, setNotes] = useState("");

  const strategyAction = useAsyncAction(generateApplicationStrategyAction);
  const followUpAction = useAsyncAction(generateFollowUpRecommendationAction);
  const submissionAction = useAsyncAction(recordApplicationSubmissionAction);

  const canFollowUp = !(PRE_APPLICATION_STATUSES as readonly string[]).includes(opportunity.status);

  const coverLetters = applicationDocuments.filter((doc) => doc.kind === "COVER_LETTER" && doc.status === "DRAFT");
  const recruiterMessages = applicationDocuments.filter(
    (doc) => doc.kind === "RECRUITER_MESSAGE" && doc.status === "DRAFT",
  );
  const emails = applicationDocuments.filter((doc) => doc.kind === "EMAIL" && doc.status === "DRAFT");

  async function handleGenerateStrategy() {
    const result = await strategyAction.run(opportunity.id);
    if (result) {
      setStrategy(result);
      toast.success("Application strategy generated");
    } else if (strategyAction.error) {
      toast.error(strategyAction.error);
    }
  }

  async function handleGenerateFollowUp() {
    const result = await followUpAction.run(opportunity.id);
    if (result) {
      setFollowUp({ ...result, opportunityId: opportunity.id, aiModel: "ai-router" } as FollowUpRecommendation);
      toast.success("Follow-up recommendation generated");
    } else if (followUpAction.error) {
      toast.error(followUpAction.error);
    }
  }

  function handleAddToChecklist() {
    if (!strategy) return;
    const existingLabels = new Set(checklist.map((item) => item.label));
    const newItems = STRATEGY_FACTOR_ORDER.filter((key) => strategy.factors[key].value)
      .map((key) => STRATEGY_FACTOR_LABEL[key])
      .filter((label) => !existingLabels.has(label))
      .map((label) => ({ id: crypto.randomUUID(), label, done: false }));

    if (newItems.length === 0) {
      toast("Nothing new to add — your checklist already covers it.");
      return;
    }

    onChecklistChange([...checklist, ...newItems]);
    toast.success(`Added ${newItems.length} item${newItems.length === 1 ? "" : "s"} to your checklist`);
  }

  async function handleRecordSubmission() {
    const result = await submissionAction.run({
      opportunityId: opportunity.id,
      method,
      coverLetterDocumentId: coverLetters[0]?.id,
      recruiterMessageDocumentId: recruiterMessages[0]?.id,
      emailDocumentId: emails[0]?.id,
      notes: notes.trim() || undefined,
    });
    if (result) {
      setSubmissionList((prev) => [result, ...prev]);
      setNotes("");
      toast.success("Submission recorded — status updated to Applied");
    } else if (submissionAction.error) {
      toast.error(submissionAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Application strategy</h2>
            <p className="text-muted-foreground text-sm">
              Selects your best-matching resume and recommends what to prepare before applying —
              every recommendation is explained.
            </p>
          </div>

          {!strategy ? (
            <div className="flex flex-col items-start gap-2">
              <Button onClick={handleGenerateStrategy} disabled={strategyAction.isPending} size="sm">
                <Sparkles />
                {strategyAction.isPending ? "Analyzing…" : "Generate strategy"}
              </Button>
              {strategyAction.error && <p className="text-destructive text-sm">{strategyAction.error}</p>}
              {strategyAction.isPending && strategyAction.isSlow && (
                <p className="text-muted-foreground text-sm">Still working — this can take up to a minute or two.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">Confidence: {strategy.confidence}/100</Badge>
                <Button
                  onClick={handleGenerateStrategy}
                  disabled={strategyAction.isPending}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles />
                  {strategyAction.isPending ? "Regenerating…" : "Regenerate"}
                </Button>
              </div>
              {strategy.bestResumeReasoning && (
                <p className="text-muted-foreground text-sm">{strategy.bestResumeReasoning}</p>
              )}
              <div className="flex flex-col gap-3">
                {STRATEGY_FACTOR_ORDER.map((key) => (
                  <StrategyFactorRow
                    key={key}
                    label={STRATEGY_FACTOR_LABEL[key]}
                    value={strategy.factors[key].value}
                    reasoning={strategy.factors[key].reasoning}
                  />
                ))}
              </div>
              <Button onClick={handleAddToChecklist} size="sm" variant="outline" className="w-fit">
                <ListPlus />
                Add to prep checklist
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Record your submission</h2>
            <p className="text-muted-foreground text-sm">
              CareerOS can&apos;t submit applications on your behalf — no job platform offers a
              real API for that, and CareerOS will never bypass a site&apos;s login or
              anti-automation protections. Apply yourself, then confirm it here.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="submission-method">How did you apply?</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as SubmissionMethod)}>
                <SelectTrigger id="submission-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBMISSION_METHODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SUBMISSION_METHOD_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="submission-notes">Notes (optional)</Label>
            <Textarea
              id="submission-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. confirmation number, who you spoke with"
              rows={2}
            />
          </div>

          <div className="flex flex-col items-start gap-2">
            <Button onClick={handleRecordSubmission} disabled={submissionAction.isPending} size="sm">
              <Send />
              {submissionAction.isPending ? "Recording…" : "I applied — record this submission"}
            </Button>
            {submissionAction.error && <p className="text-destructive text-sm">{submissionAction.error}</p>}
          </div>

          {submissionList.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-sm font-medium">Submission history</p>
              {submissionList.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{SUBMISSION_METHOD_LABEL[submission.method] ?? submission.method}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={submission.result === "FAILED" ? "destructive" : "secondary"}>
                      {submission.result}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(submission.createdAt))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Follow-up recommendation</h2>
            <p className="text-muted-foreground text-sm">
              What to do next on this application, based on real elapsed time and your
              self-reported status — never a claim about what the employer is actually doing.
            </p>
          </div>

          {!canFollowUp ? (
            <EmptyState
              icon={Clock}
              title="Not applicable yet"
              description="Record a submission above once you've applied — there's nothing to follow up on before then."
              className="py-6"
            />
          ) : !followUp ? (
            <div className="flex flex-col items-start gap-2">
              <Button onClick={handleGenerateFollowUp} disabled={followUpAction.isPending} size="sm">
                <Sparkles />
                {followUpAction.isPending ? "Thinking…" : "Get a recommendation"}
              </Button>
              {followUpAction.error && <p className="text-destructive text-sm">{followUpAction.error}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Badge>
                  {FOLLOW_UP_RECOMMENDATION_LABEL[followUp.recommendationType] ?? followUp.recommendationType}
                </Badge>
                <Button
                  onClick={handleGenerateFollowUp}
                  disabled={followUpAction.isPending}
                  size="sm"
                  variant="outline"
                >
                  {followUpAction.isPending ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
              <p className="text-sm">{followUp.reasoning}</p>
              <p className="text-muted-foreground text-xs">Confidence: {followUp.confidence}/100</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
