import { CoachChat } from "@/components/coach/coach-chat";

/**
 * AI Resume Copilot — Sprint 11, requirement 8. Embeds the existing
 * Coach Chat (`components/coach/coach-chat.tsx`, its `/api/coach/message`
 * route, Sprint 8's AI Router underneath) as-is — no new chat mechanism,
 * no new AI service. The Decision Engine already classifies a `"resume"`
 * intent and the Context Engine already reads the user's resume/analysis
 * state, so this is genuinely "the resume copilot," just placed inside
 * the Studio instead of only being reachable from `/coach`.
 */
export function ResumeCopilotPanel({ name, targetRole }: { name: string; targetRole: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Ask about this resume — wording, what to cut, how to frame a gap — the same AI Coach from
        your dashboard, with your real resume and application data in view.
      </p>
      <CoachChat name={name} targetRole={targetRole} />
    </div>
  );
}
