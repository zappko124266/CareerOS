import { CoachChat } from "@/components/coach/coach-chat";

const MAX_DESCRIPTION_CHARS = 1200;

/**
 * AI Job Copilot — Sprint 12 (Job Studio), requirement 5. Embeds the
 * existing Coach Chat (`components/coach/coach-chat.tsx`, its
 * `/api/coach/message` route, the same AI Router underneath) exactly as
 * Sprint 11's Resume Copilot does — no new chat mechanism, no new AI
 * service. `openingContext` grounds the conversation in this specific
 * opportunity, which the Context Engine already has in
 * `CoachContext.jobs.opportunities`, without the user needing to name
 * the job themselves.
 */
export function JobCopilotPanel({
  name,
  targetRole,
  title,
  companyName,
  description,
}: {
  name: string;
  targetRole: string | null;
  title: string;
  companyName: string;
  description: string | null;
}) {
  const truncatedDescription = description
    ? description.slice(0, MAX_DESCRIPTION_CHARS)
    : null;

  const openingContext = [
    `I'm looking at the "${title}" role at ${companyName}.`,
    truncatedDescription ? `Here's the job description: ${truncatedDescription}` : null,
    "Help me with this specific job — questions about fit, how to prepare, what to highlight, or anything else about it.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Ask about this job — fit, how to prepare, what to highlight — the same AI Coach from your
        dashboard, already primed on {title} at {companyName}.
      </p>
      <CoachChat name={name} targetRole={targetRole} openingContext={openingContext} />
    </div>
  );
}
