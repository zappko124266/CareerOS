"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { generateApplicationDocumentAction } from "@/actions/application-studio";
import {
  createReferralAction,
  deleteRecruiterAction,
  logRecruiterInteractionAction,
  updateReferralStatusAction,
  updateRecruiterAction,
} from "@/actions/recruiters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CareerInboxCard } from "@/components/dashboard/career-inbox-card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import type { EnrichedRecruiter } from "@/features/recruiters/orchestrator";
import { RELATIONSHIP_HEALTH_LABEL } from "@/features/recruiters/scoring";
import { toRecruiterCareerEvents } from "@/features/recruiters/timeline";
import {
  RECRUITER_INTERACTION_TYPES,
  RECRUITER_INTERACTION_TYPE_LABEL,
  RECRUITER_PRIORITY_LABEL,
  REFERRAL_STATUSES,
  REFERRAL_STATUS_LABEL,
} from "@/features/recruiters/types";
import type { RecruiterInteractionType, RecruiterPriority, ReferralStatus } from "@/features/recruiters/types";
import type { listConnectedOpportunitiesForRecruiter, listGmailEventsForRecruiterEmail } from "@/features/recruiters/queries";
import type { ApplicationDocument, Referral } from "@/generated/prisma/client";
import type { ApplicationDocumentKind, ApplicationDocumentSubtype } from "@/features/applications/types";
import { GMAIL_CLASSIFICATION_LABEL } from "@/features/gmail-intelligence/types";

type ConnectedOpportunity = Awaited<ReturnType<typeof listConnectedOpportunitiesForRecruiter>>[number];
type GmailEvent = Awaited<ReturnType<typeof listGmailEventsForRecruiterEmail>>[number];

const NO_COMPANY_LABEL = "No company linked";

/** Module 6 — "AI Follow-up Assistant." Every entry maps onto an
 * `ApplicationDocumentKind`/`Subtype` pair that already existed before
 * this sprint (`prisma/schema.prisma`'s `ApplicationDocumentSubtype`) —
 * generation goes through the *existing* `generateApplicationDocumentAction`
 * / `generateApplicationDocument` prompt, never a new one. */
const MESSAGE_TYPES: { label: string; kind: ApplicationDocumentKind; subtype: ApplicationDocumentSubtype }[] = [
  { label: "Thank-you email", kind: "EMAIL", subtype: "INTERVIEW_THANK_YOU" },
  { label: "Interview follow-up", kind: "EMAIL", subtype: "FOLLOW_UP" },
  { label: "Referral request", kind: "EMAIL", subtype: "REFERRAL_REQUEST" },
  { label: "Networking introduction", kind: "RECRUITER_MESSAGE", subtype: "NETWORKING_MESSAGE" },
  { label: "Recruiter follow-up", kind: "RECRUITER_MESSAGE", subtype: "APPLICATION_REMINDER" },
  { label: "Offer negotiation", kind: "EMAIL", subtype: "SALARY_NEGOTIATION" },
];

const REFERRAL_STATUS_BADGE_VARIANT: Record<ReferralStatus, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "outline",
  PENDING: "outline",
  ACCEPTED: "secondary",
  REJECTED: "destructive",
  COMPLETED: "secondary",
};

function AiAssistantTab({
  recruiterName,
  connectedOpportunities,
}: {
  recruiterName: string;
  connectedOpportunities: ConnectedOpportunity[];
}) {
  const [opportunityId, setOpportunityId] = useState(connectedOpportunities[0]?.id ?? "");
  const [generated, setGenerated] = useState<ApplicationDocument | null>(null);
  const generateAction = useAsyncAction(generateApplicationDocumentAction);

  if (connectedOpportunities.length === 0) {
    return (
      <EmptyState
        title="No connected opportunity yet"
        description={`Log an interaction or interview that connects ${recruiterName} to an opportunity before generating AI messages — every message here is grounded in a real job description and your resume.`}
        className="py-10"
      />
    );
  }

  async function handleGenerate(kind: ApplicationDocumentKind, subtype: ApplicationDocumentSubtype) {
    if (!opportunityId) return;
    const result = await generateAction.run({ opportunityId, kind, subtype });
    if (result) {
      setGenerated(result);
      toast.success("Message generated");
    } else if (generateAction.error) {
      toast.error(generateAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ai-opportunity">For opportunity</Label>
        <Select value={opportunityId} onValueChange={setOpportunityId}>
          <SelectTrigger id="ai-opportunity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {connectedOpportunities.map((opportunity) => (
              <SelectItem key={opportunity.id} value={opportunity.id}>
                {opportunity.title} — {opportunity.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {MESSAGE_TYPES.map((type) => (
          <Button
            key={type.subtype}
            size="sm"
            variant="outline"
            disabled={generateAction.isPending}
            onClick={() => handleGenerate(type.kind, type.subtype)}
          >
            <Sparkles />
            {type.label}
          </Button>
        ))}
      </div>
      {generateAction.error && <p className="text-destructive text-sm">{generateAction.error}</p>}

      {generated && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{generated.title}</p>
            {generated.subjectLine && <p className="text-muted-foreground text-sm">Subject: {generated.subjectLine}</p>}
            <p className="wrap-break-word text-sm whitespace-pre-line">{generated.content}</p>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link href={`/opportunities/${opportunityId}`}>
                Open in Application Studio
                <ExternalLink />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function RecruiterWorkspacePanel({
  recruiter: initialRecruiter,
  connectedOpportunities,
  referrals: initialReferrals,
  gmailEvents,
}: {
  recruiter: EnrichedRecruiter;
  connectedOpportunities: ConnectedOpportunity[];
  referrals: Referral[];
  gmailEvents: GmailEvent[];
}) {
  const [recruiter, setRecruiter] = useState(initialRecruiter);
  const [referrals, setReferrals] = useState(initialReferrals);
  const [notes, setNotes] = useState(initialRecruiter.notes ?? "");
  const [tagsInput, setTagsInput] = useState((initialRecruiter.tags as string[] | undefined)?.join(", ") ?? "");
  const [priority, setPriority] = useState<RecruiterPriority>(initialRecruiter.priority);
  const [interactionType, setInteractionType] = useState<RecruiterInteractionType>("CONTACTED");
  const [referralNotes, setReferralNotes] = useState("");

  const updateAction = useAsyncAction(updateRecruiterAction);
  const deleteAction = useAsyncAction(deleteRecruiterAction);
  const interactionAction = useAsyncAction(logRecruiterInteractionAction);
  const referralCreateAction = useAsyncAction(createReferralAction);
  const referralStatusAction = useAsyncAction(updateReferralStatusAction);

  async function handleSaveOverview() {
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const result = await updateAction.run({
      recruiterId: recruiter.id,
      name: recruiter.name,
      title: recruiter.title ?? undefined,
      linkedinUrl: recruiter.linkedinUrl ?? undefined,
      email: recruiter.email ?? undefined,
      notes: notes || undefined,
      priority,
      tags,
    });
    if (result) {
      setRecruiter((prev) => ({ ...prev, ...result, tags: result.tags as unknown as string[] }));
      toast.success("Recruiter updated");
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
    const result = await interactionAction.run({ recruiterId: recruiter.id, type: interactionType });
    if (result) {
      setRecruiter((prev) => ({ ...prev, interactions: [result, ...prev.interactions] }));
      toast.success("Interaction logged");
    } else if (interactionAction.error) {
      toast.error(interactionAction.error);
    }
  }

  async function handleCreateReferral() {
    const result = await referralCreateAction.run({
      recruiterId: recruiter.id,
      companyId: recruiter.companyId ?? undefined,
      notes: referralNotes.trim() || undefined,
    });
    if (result) {
      setReferrals((prev) => [result, ...prev]);
      setReferralNotes("");
      toast.success("Referral request logged");
    } else if (referralCreateAction.error) {
      toast.error(referralCreateAction.error);
    }
  }

  async function handleReferralStatus(referralId: string, status: ReferralStatus) {
    const result = await referralStatusAction.run({ referralId, status });
    if (result) {
      setReferrals((prev) => prev.map((referral) => (referral.id === result.id ? result : referral)));
    } else if (referralStatusAction.error) {
      toast.error(referralStatusAction.error);
    }
  }

  const timelineEvents = toRecruiterCareerEvents(recruiter, recruiter.interactions, referrals);

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
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{RELATIONSHIP_HEALTH_LABEL[recruiter.health]}</Badge>
            <span className="text-muted-foreground text-xs">Relationship score: {recruiter.relationship.score}/100</span>
          </div>
        </div>
        <Button onClick={handleDelete} disabled={deleteAction.isPending} size="sm" variant="ghost">
          <Trash2 />
          Remove
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="applications">Applications &amp; Interviews</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium">Relationship factors</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {recruiter.relationship.factors.map((factor) => (
                    <li key={factor.label} className="text-sm">
                      <span className="font-medium">{factor.label}:</span>{" "}
                      <span className="text-muted-foreground">{factor.explanation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs">First contact</p>
                  <p className="text-sm">{recruiter.firstContact ? formatRelativeTime(recruiter.firstContact) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last contact</p>
                  <p className="text-sm">{recruiter.lastContact ? formatRelativeTime(recruiter.lastContact) : "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recruiter-priority">Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as RecruiterPriority)}>
                    <SelectTrigger id="recruiter-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["LOW", "NORMAL", "HIGH"] as RecruiterPriority[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {RECRUITER_PRIORITY_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recruiter-tags">Tags (comma-separated)</Label>
                  <Input id="recruiter-tags" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
                </div>
              </div>

              <Button onClick={handleSaveOverview} disabled={updateAction.isPending} size="sm" className="w-fit">
                {updateAction.isPending ? "Saving…" : "Save"}
              </Button>
              {updateAction.error && <p className="text-destructive text-sm">{updateAction.error}</p>}

              <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-sm font-medium">Log an interaction</p>
                <div className="flex gap-2">
                  <Select value={interactionType} onValueChange={(value) => setInteractionType(value as RecruiterInteractionType)}>
                    <SelectTrigger className="w-56">
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
                  <Button onClick={handleLogInteraction} disabled={interactionAction.isPending} size="sm">
                    <Plus />
                    {interactionAction.isPending ? "Logging…" : "Log"}
                  </Button>
                </div>
                {interactionAction.error && <p className="text-destructive text-sm">{interactionAction.error}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <CareerInboxCard events={timelineEvents} title="Recruiter Timeline" />
        </TabsContent>

        <TabsContent value="emails">
          {gmailEvents.length === 0 ? (
            <EmptyState
              title="No connected emails"
              description="No synced Gmail messages match this recruiter's email address yet."
              className="py-10"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {gmailEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{GMAIL_CLASSIFICATION_LABEL[event.classification]}</Badge>
                      <span className="text-muted-foreground text-xs">{formatRelativeTime(event.receivedAt)}</span>
                    </div>
                    <p className="text-sm font-medium">{event.subject}</p>
                    {event.snippet && <p className="text-muted-foreground text-sm">{event.snippet}</p>}
                  </CardContent>
                </Card>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="applications">
          {connectedOpportunities.length === 0 ? (
            <EmptyState
              title="No connected opportunities"
              description="Log an interaction with an opportunity attached, or link this recruiter to an interview, to see it here."
              className="py-10"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {connectedOpportunities.map((opportunity) => (
                <Card key={opportunity.id}>
                  <CardContent className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/opportunities/${opportunity.id}`} className="text-sm font-medium hover:underline">
                        {opportunity.title} — {opportunity.companyName}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {opportunity.submissions.length > 0
                          ? `Submitted ${formatRelativeTime(opportunity.submissions[0].submittedAt ?? opportunity.createdAt)}`
                          : "Not yet submitted"}
                      </p>
                    </div>
                    <Badge variant="secondary">{opportunity.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="referrals">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Request a referral</p>
                <p className="text-muted-foreground text-sm">
                  {recruiter.company?.name ?? NO_COMPANY_LABEL}
                </p>
                <Textarea
                  placeholder="Notes about this referral request…"
                  rows={2}
                  value={referralNotes}
                  onChange={(event) => setReferralNotes(event.target.value)}
                />
                <Button onClick={handleCreateReferral} disabled={referralCreateAction.isPending} size="sm" className="w-fit">
                  <Plus />
                  {referralCreateAction.isPending ? "Logging…" : "Log referral request"}
                </Button>
                {referralCreateAction.error && <p className="text-destructive text-sm">{referralCreateAction.error}</p>}
              </CardContent>
            </Card>

            {referrals.length === 0 ? (
              <EmptyState title="No referrals logged yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-2">
                {referrals.map((referral) => (
                  <Card key={referral.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={REFERRAL_STATUS_BADGE_VARIANT[referral.status]}>
                          {REFERRAL_STATUS_LABEL[referral.status]}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{formatRelativeTime(new Date(referral.updatedAt))}</span>
                      </div>
                      {referral.notes && <p className="text-sm">{referral.notes}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {REFERRAL_STATUSES.filter((status) => status !== referral.status).map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            disabled={referralStatusAction.isPending}
                            onClick={() => handleReferralStatus(referral.id, status)}
                          >
                            Mark {REFERRAL_STATUS_LABEL[status]}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything worth remembering about this recruiter…"
              />
              <Button onClick={handleSaveOverview} disabled={updateAction.isPending} size="sm" className="w-fit" variant="outline">
                {updateAction.isPending ? "Saving…" : "Save notes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistant">
          <AiAssistantTab recruiterName={recruiter.name} connectedOpportunities={connectedOpportunities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
