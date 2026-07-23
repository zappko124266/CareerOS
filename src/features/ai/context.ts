import "server-only";

import { getCareerBrain } from "@/features/career-brain/brain";
import type { CareerBrain } from "@/features/career-brain/types";
import { buildCoachContext } from "@/features/coach/context";
import { getCareerRoadmap } from "@/features/coach/roadmap";
import type { CareerRoadmap } from "@/features/coach/roadmap";
import type { CoachContext } from "@/features/coach/types";
import type { UserDTO } from "@/lib/auth/dto";

/**
 * The AI Context Engine — Sprint 8. Aggregates *all* existing
 * intelligence by composing three already-existing calls, not
 * re-deriving anything:
 *  - `brain` (Sprint 4's Career Brain) — Career Profile, Resume/Application/
 *    Job/Skill Intelligence, Career Memory, all computed from one query
 *    root (`getCareerBrain`).
 *  - `coach` — `buildCoachContext(brain)`, a pure derivation Sprint 4
 *    already built for the Coach/Dashboard.
 *  - `roadmap` — `getCareerRoadmap(coach)`, the existing Roadmap Engine.
 *
 * Zero new queries: this whole function is one `getCareerBrain` call
 * plus two pure, synchronous derivations.
 */
export interface AiContext {
  brain: CareerBrain;
  coach: CoachContext;
  roadmap: CareerRoadmap;
}

export async function getAiContext(user: UserDTO): Promise<AiContext> {
  const brain = await getCareerBrain(user);
  const coach = buildCoachContext(brain);
  const roadmap = getCareerRoadmap(coach);

  return { brain, coach, roadmap };
}
