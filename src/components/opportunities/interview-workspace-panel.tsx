"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  addInterviewNoteAction,
  analyzeInterviewFeedbackAction,
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
import type { InterviewDocumentType, InterviewStage } from "@/features/interviews/types";
import type { InterviewBrief } from "@/features/interviews/intelligence/brief";
import type { OfferProbabilityResult } from "@/features/interviews/intelligence/offer-probability";
import type { InterviewPrepTask } from "@/features/interviews/intelligence/planner-tasks";
import type { InterviewStageProgress } from "@/features/interviews/intelligence/stage-tracker";
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

/** Sprint 20 (Interview Intelligence & Interview Operating System) —
 * computed server-side (`app/(app)/opportunities/[opportunityId]/page.tsx`)
 * over data that page already fetches, and passed down as plain,
 * already-serialized data — this client component never imports the
 * (server-adjacent) derivation modules themselves. */
export interface InterviewOperatingSystemBundle {
  stageProgress: InterviewStageProgress;
  prepTasks: InterviewPrepTask[];
  brief: InterviewBrief;
  offerProbability: OfferProbabilityResult;
}

const NO_RECRUITER_VALUE = "__none__";
const DOCUMENT_TYPE_LABEL: Record<InterviewDocumentType, string> = {
  ASSIGNMENT: "Assignment",
  CASE_STUDY: "Case study",
  OFFER_LETTER: "Offer letter",
  FEEDBACK: "Feedback",
  JOINING_DOCUMENT: "Joining document",
};
const NO_DOCUMENT_VALUE = "__note__";

function StageTrackerCard({ progress }: { progress: InterviewStageProgress }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Stage tracker</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>{INTERVIEW_STAGE_LABEL[progress.currentStage]}</Badge>
          {progress.nextStage && (
            <span className="text-muted-foreground">→ next: {INTERVIEW_STAGE_LABEL[progress.nextStage]}</span>
          )}
          <span className="text-muted-foreground">
            {progress.daysWaiting} day{progress.daysWaiting === 1 ? "" : "s"} since last update
          </span>
          {progress.confidence !== null && (
            <Badge variant="secondary">Confidence: {progress.confidence}/100</Badge>
          )}
        </div>
        {progress.completedStages.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Completed: {progress.completedStages.map((stage) => INTERVIEW_STAGE_LABEL[stage]).join(" → ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PrepTasksCard({ tasks }: { tasks: InterviewPrepTask[] }) {
  const doneCount = tasks.filter((task) => task.done).length;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Preparation tasks</h2>
          <span className="text-muted-foreground text-xs">
            {doneCount}/{tasks.length} done
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2 text-sm">
              <Badge variant={task.done ? "secondary" : "outline"} className="mt-0.5 shrink-0">
                {task.done ? "Done" : "Open"}
              </Badge>
              <div>
                <p className="font-medium">{task.label}</p>
                <p className="text-muted-foreground text-xs">{task.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OfferProbabilityCard({ result }: { result: OfferProbabilityResult }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Offer probability</h2>
          <Badge variant={result.probability >= 60 ? "secondary" : "outline"}>{result.probability}%</Badge>
        </div>
        <ul className="flex flex-col gap-1.5">
          {result.factors.filter((factor) => factor.available).map((factor) => (
            <li key={factor.label} className="text-sm">
              <span className="font-medium">{factor.label}:</span>{" "}
              <span className="text-muted-foreground">{factor.explanation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InterviewBriefCard({ brief }: { brief: InterviewBrief }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Interview brief</h2>

        <div>
          <p className="text-sm font-medium">{brief.company.name}</p>
          {brief.company.summary ? (
            <p className="text-muted-foreground mt-1 text-sm">{brief.company.summary}</p>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              No company research generated yet — see the Company Intelligence tab.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Resume version</p>
            <p className="text-muted-foreground text-sm">{brief.resumeVersionUsed?.title ?? "No resume selected yet."}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Salary</p>
            <p className="text-muted-foreground text-sm">
              {brief.salary.min || brief.salary.max
                ? `${brief.salary.currency ?? ""}${brief.salary.min ?? "?"} – ${brief.salary.max ?? "?"}`
                : "Not listed."}
            </p>
          </div>
        </div>

        {brief.resumeWeaknesses.length > 0 && (
          <div>
            <p className="text-sm font-medium">Resume gaps for this role</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {brief.resumeWeaknesses.map((gap) => (
                <li key={gap.requirement} className="text-sm">
                  <Badge variant="outline" className="mr-1.5">
                    {gap.severity}
                  </Badge>
                  {gap.requirement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(brief.likelyQuestions.behavioral.length > 0 || brief.likelyQuestions.technical.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {brief.likelyQuestions.technical.length > 0 && (
              <div>
                <p className="text-sm font-medium">Likely technical questions</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm">
                  {brief.likelyQuestions.technical.map((q) => (
                    <li key={q.question}>{q.question}</li>
                  ))}
                </ul>
              </div>
            )}
            {brief.likelyQuestions.behavioral.length > 0 && (
              <div>
                <p className="text-sm font-medium">Likely behavioral questions</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm">
                  {brief.likelyQuestions.behavioral.map((q) => (
                    <li key={q.question}>{q.question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {brief.starStories.length > 0 && (
          <div>
            <p className="text-sm font-medium">STAR talking points</p>
            <ul className="mt-1.5 list-disc pl-5 text-sm">
              {brief.starStories.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {brief.peopleInvolved.length > 0 && (
          <div>
            <p className="text-sm font-medium">People involved</p>
            <p className="text-muted-foreground text-sm">
              {brief.peopleInvolved.map((person) => `${person.name} (${person.role})`).join(", ")}
            </p>
          </div>
        )}

        {brief.documents.length > 0 && (
          <div>
            <p className="text-sm font-medium">Documents</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {brief.documents.map((doc) => (
                <li key={doc.documentUrl} className="text-sm">
                  <a href={doc.documentUrl} target="_blank" rel="noreferrer noopener" className="hover:underline">
                    <Badge variant="outline" className="mr-1.5">
                      {DOCUMENT_TYPE_LABEL[doc.documentType as InterviewDocumentType] ?? doc.documentType}
                    </Badge>
                    {doc.note}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  interviewOS,
}: {
  opportunityId: string;
  interviews: InterviewWithRelations[];
  recruiters: Recruiter[];
  offer: Offer | null;
  /** Sprint 20 (Interview Intelligence & Interview Operating System) —
   * `null` until the first interview round is started, same rule as
   * `interview` below. */
  interviewOS: InterviewOperatingSystemBundle | null;
}) {
  const [interviews, setInterviews] = useState(initialInterviews);
  const [offer, setOffer] = useState(initialOffer);
  const [note, setNote] = useState("");
  const [documentType, setDocumentType] = useState<string>(NO_DOCUMENT_VALUE);
  const [documentUrl, setDocumentUrl] = useState("");
  const [feedback, setFeedback] = useState(initialInterviews[0]?.feedback ?? "");
  const [baseSalary, setBaseSalary] = useState(initialOffer?.baseSalary?.toString() ?? "");
  const [bonus, setBonus] = useState(initialOffer?.bonus?.toString() ?? "");
  const [currency, setCurrency] = useState(initialOffer?.currency ?? "");

  const createAction = useAsyncAction(createInterviewAction);
  const stageAction = useAsyncAction(updateInterviewStageAction);
  const updateAction = useAsyncAction(updateInterviewAction);
  const noteAction = useAsyncAction(addInterviewNoteAction);
  const offerAction = useAsyncAction(upsertOfferAction);
  const feedbackSaveAction = useAsyncAction(updateInterviewAction);
  const feedbackAnalyzeAction = useAsyncAction(analyzeInterviewFeedbackAction);

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
    const isDocument = documentType !== NO_DOCUMENT_VALUE;
    if (isDocument && !documentUrl.trim()) return;
    const result = await noteAction.run({
      opportunityId,
      interviewId: interview.id,
      note: note.trim(),
      documentType: isDocument ? (documentType as InterviewDocumentType) : undefined,
      documentUrl: isDocument ? documentUrl.trim() : undefined,
    });
    if (result) {
      setInterviews((prev) =>
        prev.map((i) => (i.id === interview.id ? { ...i, notes: [result, ...i.notes] } : i)),
      );
      setNote("");
      setDocumentType(NO_DOCUMENT_VALUE);
      setDocumentUrl("");
      toast.success(isDocument ? "Document added" : "Note added");
    } else if (noteAction.error) {
      toast.error(noteAction.error);
    }
  }

  async function handleSaveFeedback() {
    if (!interview) return;
    const result = await feedbackSaveAction.run({ interviewId: interview.id, feedback: feedback.trim() || null });
    if (result) {
      setInterviews((prev) => prev.map((i) => (i.id === result.id ? { ...i, ...result } : i)));
      toast.success("Feedback saved");
    } else if (feedbackSaveAction.error) {
      toast.error(feedbackSaveAction.error);
    }
  }

  async function handleAnalyzeFeedback() {
    if (!interview) return;
    const result = await feedbackAnalyzeAction.run({ interviewId: interview.id });
    if (result) {
      setInterviews((prev) => prev.map((i) => (i.id === result.id ? { ...i, ...result } : i)));
      toast.success("Feedback analyzed");
    } else if (feedbackAnalyzeAction.error) {
      toast.error(feedbackAnalyzeAction.error);
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
            <p className="text-sm font-medium">Notes &amp; documents</p>
            {interview.notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {interview.notes.map((n) => (
                  <li key={n.id} className="border-border border-l-2 pl-3 text-sm">
                    {n.documentType && (
                      <Badge variant="outline" className="mb-1">
                        {DOCUMENT_TYPE_LABEL[n.documentType]}
                      </Badge>
                    )}
                    <p className="wrap-break-word">
                      {n.documentUrl ? (
                        <a href={n.documentUrl} target="_blank" rel="noreferrer noopener" className="hover:underline">
                          {n.note}
                        </a>
                      ) : (
                        n.note
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{formatRelativeTime(new Date(n.createdAt))}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Document type">
                  <SelectValue placeholder="Note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DOCUMENT_VALUE}>Plain note</SelectItem>
                  {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Add a note…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              {documentType !== NO_DOCUMENT_VALUE && (
                <Input
                  placeholder="Document URL…"
                  value={documentUrl}
                  onChange={(event) => setDocumentUrl(event.target.value)}
                />
              )}
              <Button
                onClick={handleAddNote}
                disabled={
                  noteAction.isPending || !note.trim() || (documentType !== NO_DOCUMENT_VALUE && !documentUrl.trim())
                }
                variant="outline"
              >
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {interviewOS && <StageTrackerCard progress={interviewOS.stageProgress} />}
      {interviewOS && <PrepTasksCard tasks={interviewOS.prepTasks} />}
      {interviewOS && <OfferProbabilityCard result={interviewOS.offerProbability} />}
      {interviewOS && <InterviewBriefCard brief={interviewOS.brief} />}

      <InterviewPrepPanel interviewId={interview.id} prep={interview.preps[0]} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Post-interview feedback</h2>
            <p className="text-muted-foreground text-sm">
              Your own notes on how the round went — CareerOS can critique them once you save.
            </p>
          </div>
          <Textarea
            placeholder="How did it go? What questions came up, how did you answer, any signals from the interviewer…"
            rows={4}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveFeedback} disabled={feedbackSaveAction.isPending} size="sm" variant="outline">
              {feedbackSaveAction.isPending ? "Saving…" : "Save feedback"}
            </Button>
            <Button
              onClick={handleAnalyzeFeedback}
              disabled={feedbackAnalyzeAction.isPending || !interview.feedback?.trim()}
              size="sm"
            >
              {feedbackAnalyzeAction.isPending ? "Analyzing…" : "Analyze feedback"}
            </Button>
          </div>
          {feedbackAnalyzeAction.error && <p className="text-destructive text-sm">{feedbackAnalyzeAction.error}</p>}
          {interview.feedbackAnalysis && (
            <div className="flex flex-col gap-3 border-t pt-3 text-sm">
              {(() => {
                const analysis = interview.feedbackAnalysis as unknown as {
                  strengths: string[];
                  weaknesses: string[];
                  followUpAdvice: string[];
                  nextStageProbability: number;
                };
                return (
                  <>
                    <Badge variant="secondary" className="w-fit">
                      Next-stage probability: {analysis.nextStageProbability}/100
                    </Badge>
                    {analysis.strengths.length > 0 && (
                      <div>
                        <p className="font-medium">Strengths</p>
                        <ul className="mt-1 list-disc pl-5">
                          {analysis.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.weaknesses.length > 0 && (
                      <div>
                        <p className="font-medium">Weaknesses</p>
                        <ul className="mt-1 list-disc pl-5">
                          {analysis.weaknesses.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.followUpAdvice.length > 0 && (
                      <div>
                        <p className="font-medium">Follow-up advice</p>
                        <ul className="mt-1 list-disc pl-5">
                          {analysis.followUpAdvice.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

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
