import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ResumeStudio } from "@/components/resume/studio/resume-studio";
import { getCareerBrain } from "@/features/career-brain/brain";
import { listResumeVersions } from "@/features/resume/queries";
import { getResumeWithAnalyses } from "@/features/resume/queries";
import { ResumeDataSchema } from "@/features/resume/schema";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resume Studio" };

export default async function ResumeStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ opportunityId?: string }>;
}) {
  const { resumeId } = await params;
  const { opportunityId } = await searchParams;
  const user = await verifySession();

  const resume = await getResumeWithAnalyses(resumeId, user.id).catch(() => null);
  if (!resume) {
    notFound();
  }

  // The resume exists but isn't ready for the Studio yet (still parsing,
  // failed, or the stored content doesn't validate) — that's not a 404,
  // it's "come back once parsing finishes", so send the user to the page
  // that already explains resume status rather than a dead-end not-found.
  if (resume.status !== "PARSED" || !resume.parsedData) {
    redirect(`/resume/${resumeId}`);
  }

  const parsed = ResumeDataSchema.safeParse(resume.parsedData);
  if (!parsed.success) {
    redirect(`/resume/${resumeId}`);
  }

  // Sprint 11 — the Studio's only new query root: Career Brain already
  // computes opportunity-backed missing skills, the user's target role,
  // and every saved opportunity (for company-specific tailoring). Every
  // other new panel below reuses `resume.analyses`/`versions`, both
  // already fetched on this page.
  const [versions, brain] = await Promise.all([
    listResumeVersions(resumeId, user.id),
    getCareerBrain(user),
  ]);

  return (
    <ResumeStudio
      resumeId={resumeId}
      resumeTitle={resume.title}
      resumeCreatedAt={resume.createdAt}
      initialData={parsed.data}
      initialVersions={versions}
      analyses={resume.analyses}
      missingSkills={brain.skillIntelligence.missingSkills}
      savedOpportunities={brain.raw.opportunities}
      name={user.fullName ?? ""}
      targetRole={brain.profile.goals.targetRole}
      initialOpportunityId={opportunityId ?? null}
    />
  );
}
