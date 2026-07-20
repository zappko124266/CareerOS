"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  addInterviewNoteAction,
  createInterviewAction,
  generateAnswerFeedbackAction,
  generateInterviewPrepAction,
  updateInterviewAction,
  updateInterviewStageAction,
  upsertOfferAction,
} from "@/actions/interviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import {
  INTERVIEW_STAGE_LABEL,
  INTERVIEW_STAGE_OFF_PATH,
  INTERVIEW_STAGE_ORDER,
} from "@/features/interviews/types";
import type { InterviewStage } from "@/features/interviews/types";
import type {
  Interview,
  InterviewNote,
  InterviewPrep,
  Offer,
  Recruiter,
} from "@/generated/prisma/client";

export type InterviewWithRelations = Interview & {
  recruiter: { id: string; name: string } | null;
  preps: InterviewPrep[];
  notes: InterviewNote[];
};

const NO_RECRUITER_VALUE = "__none__";

function InterviewPrepPanel({
  interviewId,
  prep,
}: {
  interviewId: string;
  prep: InterviewPrep | undefined;
}) {
  const [current, setCurrent] = useState(prep);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const prepAction = useAsyncAction(generateInterviewPrepAction);
  const feedbackAction = useAsyncAction(generateAnswerFeedbackAction);

  const likelyQuestions = (current?.likelyQuestions as unknown as { question: string; category: string }[]) ?? [];
  const starPoints = (current?.starAnswerSuggestions as unknown as string[]) ?? [];
  const improvements = (current?.improvementSuggestions as unknown as string[]) ?? [];
  const checklist = (current?.preparationChecklist as unknown as string[]) ?? [];
  const weakFlags =
    (current?.weakAnswerFlags as unknown as {
      question: string;
      answer: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      improvedAnswer: string;
    }[]) ?? [];

  async function handleGenerate() {
    const result = await prepAction.run({ interviewId });
    if (result) {
      setCurrent(result);
      toast.success("Interview prep generated");
    } else if (prepAction.error) {
      toast.error(prepAction.error);
    }
  }

  async function handleFeedback() {
    if (!current || !question.trim() || !answer.trim()) return;
    const result = await feedbackAction.run({
      interviewPrepId: current.id,
      question: question.trim(),
      userAnswer: answer.trim(),
    });
    if (result) {
      setCurrent(result);
      setQuestion("");
      setAnswer("");
      toast.success("Answer feedback ready");
    } else if (feedbackAction.error) {
      toast.error(feedbackAction.error);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">AI Interview Coach</h2>
          <p className="text-muted-foreground text-sm">
            Likely questions, talking points, and answer feedback — grounded in your resume and
            this job description.
          </p>
        </div>

        {!current ? (
          <div className="flex flex-col items-start gap-2">
            <Button onClick={handleGenerate} disabled={prepAction.isPending} size="sm">
              <Sparkles />
              {prepAction.isPending ? "Preparing…" : "Generate interview prep"}
            </Button>
            {prepAction.error && <p className="text-destructive text-sm">{prepAction.error}</p>}
            {prepAction.isPending && prepAction.isSlow && (
              <p className="text-muted-foreground text-sm">Still working — this can take up to a minute or two.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">Confidence: {current.confidenceScore}/100</Badge>
              <Button onClick={handleGenerate} disabled={prepAction.isPending} size="sm" variant="outline">
                {prepAction.isPending ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>

            {likelyQuestions.length > 0 && (
              <div>
                <p className="text-sm font-medium">Likely questions</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {likelyQuestions.map((q) => (
                    <li key={q.question} className="text-sm">
                      <Badge variant="outline" className="mr-1.5">
                        {q.category}
                      </Badge>
                      {q.question}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {starPoints.length > 0 && (
              <div>
                <p className="text-sm font-medium">Talking points</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm">
                  {starPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {improvements.length > 0 && (
              <div>
                <p className="text-sm font-medium">Areas to strengthen</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm">
                  {improvements.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            )}

            {checklist.length > 0 && (
              <div>
                <p className="text-sm font-medium">Preparation checklist</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm">
                  {checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-sm font-medium">Practice a question</p>
              <Input
                placeholder="Which question are you practicing?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <Textarea
                placeholder="Type your practice answer…"
                rows={4}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
              <Button
                onClick={handleFeedback}
                disabled={feedbackAction.isPending || !question.trim() || !answer.trim()}
                size="sm"
                className="w-fit"
              >
                {feedbackAction.isPending ? "Reviewing…" : "Get feedback"}
              </Button>
              {feedbackAction.error && <p className="text-destructive text-sm">{feedbackAction.error}</p>}
            </div>

            {weakFlags.length > 0 && (
              <div className="flex flex-col gap-3 border-t pt-3">
                <p className="text-sm font-medium">Answer feedback history</p>
                {weakFlags.map((flag, index) => (
                  <div key={`${flag.question}-${index}`} className="border-border rounded-lg border p-3 text-sm">
                    <p className="font-medium">{flag.question}</p>
                    <p className="text-muted-foreground mt-1">Score: {flag.score}/100</p>
                    {flag.weaknesses.length > 0 && (
                      <ul className="mt-1.5 list-disc pl-5">
                        {flag.weaknesses.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-muted-foreground mt-2 wrap-break-word whitespace-pre-line">
                      Improved answer: {flag.improvedAnswer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InterviewWorkspacePanel({
  opportunityId,
  interviews: initialInterviews,
  recruiters,
  offer: initialOffer,
}: {
  opportunityId: string;
  interviews: InterviewWithRelations[];
  recruiters: Recruiter[];
  offer: Offer | null;
}) {
  const [interviews, setInterviews] = useState(initialInterviews);
  const [offer, setOffer] = useState(initialOffer);
  const [note, setNote] = useState("");
  const [baseSalary, setBaseSalary] = useState(initialOffer?.baseSalary?.toString() ?? "");
  const [bonus, setBonus] = useState(initialOffer?.bonus?.toString() ?? "");
  const [currency, setCurrency] = useState(initialOffer?.currency ?? "");

  const createAction = useAsyncAction(createInterviewAction);
  const stageAction = useAsyncAction(updateInterviewStageAction);
  const updateAction = useAsyncAction(updateInterviewAction);
  const noteAction = useAsyncAction(addInterviewNoteAction);
  const offerAction = useAsyncAction(upsertOfferAction);

  const interview = interviews[0] ?? null;

  async function handleStart() {
    const result = await createAction.run({ opportunityId });
    if (result) {
      setInterviews([{ ...result, recruiter: null, preps: [], notes: [] }]);
      toast.success("Interview pipeline started");
    } else if (createAction.error) {
      toast.error(createAction.error);
    }
  }

  async function handleStageChange(stage: InterviewStage) {
    if (!interview) return;
    const result = await stageAction.run({ interviewId: interview.id, stage });
    if (result) {
      setInterviews((prev) => prev.map((i) => (i.id === result.id ? { ...i, ...result } : i)));
      toast.success(`Stage updated to ${INTERVIEW_STAGE_LABEL[stage]}`);
    } else if (stageAction.error) {
      toast.error(stageAction.error);
    }
  }

  async function handleRecruiterChange(recruiterId: string) {
    if (!interview) return;
    const result = await updateAction.run({
      interviewId: interview.id,
      recruiterId: recruiterId === NO_RECRUITER_VALUE ? null : recruiterId,
    });
    if (result) {
      const recruiter = recruiters.find((r) => r.id === recruiterId) ?? null;
      setInterviews((prev) =>
        prev.map((i) => (i.id === result.id ? { ...i, ...result, recruiter } : i)),
      );
    }
  }

  async function handleDifficultyChange(rating: number) {
    if (!interview) return;
    const result = await updateAction.run({ interviewId: interview.id, difficultyRating: rating });
    if (result) {
      setInterviews((prev) => prev.map((i) => (i.id === result.id ? { ...i, ...result } : i)));
    }
  }

  async function handleAddNote() {
    if (!interview || !note.trim()) return;
    const result = await noteAction.run({ opportunityId, interviewId: interview.id, note: note.trim() });
    if (result) {
      setInterviews((prev) =>
        prev.map((i) => (i.id === interview.id ? { ...i, notes: [result, ...i.notes] } : i)),
      );
      setNote("");
      toast.success("Note added");
    } else if (noteAction.error) {
      toast.error(noteAction.error);
    }
  }

  async function handleSaveOffer() {
    const result = await offerAction.run({
      opportunityId,
      baseSalary: baseSalary ? Number(baseSalary) : undefined,
      bonus: bonus ? Number(bonus) : undefined,
      currency: currency || undefined,
      benefits: offer?.benefits as string[] | undefined,
    });
    if (result) {
      setOffer(result);
      toast.success("Offer saved");
    } else if (offerAction.error) {
      toast.error(offerAction.error);
    }
  }

  if (!interview) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="No interview pipeline yet"
            description="Start tracking this application's interview process — stages, prep, and feedback all in one place."
            action={
              <Button onClick={handleStart} disabled={createAction.isPending} size="sm">
                {createAction.isPending ? "Starting…" : "Start interview pipeline"}
              </Button>
            }
            className="py-10"
          />
          {createAction.error && <p className="text-destructive mt-2 text-sm">{createAction.error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-sm font-semibold">Interview stage</h2>
            <Select value={interview.stage} onValueChange={(value) => handleStageChange(value as InterviewStage)}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Interview stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_STAGE_ORDER.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {INTERVIEW_STAGE_LABEL[stage]}
                  </SelectItem>
                ))}
                <SelectSeparator />
                {INTERVIEW_STAGE_OFF_PATH.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {INTERVIEW_STAGE_LABEL[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-recruiter">Recruiter contact</Label>
              <Select
                value={interview.recruiterId ?? NO_RECRUITER_VALUE}
                onValueChange={handleRecruiterChange}
              >
                <SelectTrigger id="interview-recruiter">
                  <SelectValue placeholder="No recruiter linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RECRUITER_VALUE}>No recruiter linked</SelectItem>
                  {recruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-difficulty">Difficulty (1-5, self-reported)</Label>
              <Select
                value={interview.difficultyRating?.toString() ?? ""}
                onValueChange={(value) => handleDifficultyChange(Number(value))}
              >
                <SelectTrigger id="interview-difficulty">
                  <SelectValue placeholder="Not rated" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-sm font-medium">Notes</p>
            {interview.notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {interview.notes.map((n) => (
                  <li key={n.id} className="border-border border-l-2 pl-3 text-sm">
                    <p className="wrap-break-word">{n.note}</p>
                    <p className="text-muted-foreground text-xs">{formatRelativeTime(new Date(n.createdAt))}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a note…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <Button onClick={handleAddNote} disabled={noteAction.isPending || !note.trim()} variant="outline">
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <InterviewPrepPanel interviewId={interview.id} prep={interview.preps[0]} />

      {(interview.stage === "OFFER" || interview.stage === "ACCEPTED" || offer) && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold">Offer details</h2>
              <p className="text-muted-foreground text-sm">
                User-entered — CareerOS has no way to know your actual offer terms beyond what
                you tell it.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-base">Base salary</Label>
                <Input
                  id="offer-base"
                  type="number"
                  value={baseSalary}
                  onChange={(event) => setBaseSalary(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-bonus">Bonus</Label>
                <Input
                  id="offer-bonus"
                  type="number"
                  value={bonus}
                  onChange={(event) => setBonus(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-currency">Currency</Label>
                <Input
                  id="offer-currency"
                  placeholder="USD"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveOffer} disabled={offerAction.isPending} size="sm" className="w-fit">
              {offerAction.isPending ? "Saving…" : "Save offer"}
            </Button>
            {offerAction.error && <p className="text-destructive text-sm">{offerAction.error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
