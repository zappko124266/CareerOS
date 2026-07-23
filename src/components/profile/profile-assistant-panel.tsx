import { CoachChat } from "@/components/coach/coach-chat";
import type { CareerProfile } from "@/features/career-brain/types";

/**
 * AI Profile Assistant — Sprint 13, requirement 5. Embeds `CoachChat`
 * exactly as Sprint 11's Resume Copilot and Sprint 12's Job Copilot do —
 * no new chat mechanism, no new AI service. `openingContext` grounds the
 * conversation in the user's actual Career Profile (already computed by
 * `getCareerBrain`, no new computation) so the assistant starts already
 * aware of what's filled in and what's missing.
 */
export function ProfileAssistantPanel({
  name,
  profile,
  biggestGap,
}: {
  name: string;
  profile: CareerProfile;
  /** Label of the single most useful incomplete item from the
   * completion checklist, e.g. "Set your target role" — or `null` when
   * everything's filled in. */
  biggestGap: string | null;
}) {
  const openingContext = [
    `Here's my current career profile: target role ${profile.goals.targetRole ?? "not set"}, ` +
      `${profile.yearsOfExperience ?? "unknown"} years of experience, ` +
      `top skills: ${profile.skills.slice(0, 8).join(", ") || "none listed"}.`,
    biggestGap ? `The biggest gap in my profile right now is: ${biggestGap}.` : null,
    "Help me complete and improve my career profile — what should I prioritize?",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Ask about your career profile — what&apos;s missing, what to prioritize, how to strengthen
        it — the same AI Coach from your dashboard, already aware of your profile.
      </p>
      <CoachChat name={name} targetRole={profile.goals.targetRole} openingContext={openingContext} />
    </div>
  );
}
