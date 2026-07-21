import type { Metadata } from "next";

import { CareerRoadmapCard } from "@/components/coach/career-roadmap-card";
import { CoachChat } from "@/components/coach/coach-chat";
import { getCoachContext } from "@/features/coach/context";
import { getCareerRoadmap } from "@/features/coach/roadmap";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "AI Coach" };

export default async function CoachPage() {
  const user = await verifySession();
  const context = await getCoachContext(user);
  const roadmap = getCareerRoadmap(context);

  return (
    <div className="flex flex-col gap-6">
      <CareerRoadmapCard roadmap={roadmap} />
      <CoachChat name={user.fullName ?? ""} targetRole={context.onboarding.targetRole} />
    </div>
  );
}
