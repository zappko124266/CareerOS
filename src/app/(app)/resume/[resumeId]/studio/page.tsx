import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ResumeStudio } from "@/components/resume/studio/resume-studio";
import { listResumeVersions } from "@/features/resume/queries";
import { getResumeWithAnalyses } from "@/features/resume/queries";
import { ResumeDataSchema } from "@/features/resume/schema";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resume Studio" };

export default async function ResumeStudioPage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { resumeId } = await params;
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

  const versions = await listResumeVersions(resumeId, user.id);

  return (
    <ResumeStudio
      resumeId={resumeId}
      resumeTitle={resume.title}
      initialData={parsed.data}
      initialVersions={versions}
    />
  );
}
