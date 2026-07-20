import "server-only";

import { prisma } from "@/lib/prisma";
import { ResumeDataSchema } from "@/features/resume/schema";

import type {
  ActivityItem,
  DashboardData,
  ResumeWithAnalyses,
  SalaryPrefill,
} from "./types";

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { analyses: { orderBy: { createdAt: "desc" } } },
  });

  const resumeCount = resumes.length;
  const latestResume = resumes[0] ?? null;
  const analysisHistory = resumes
    .flatMap((resume) => resume.analyses)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latestAnalysis = analysisHistory[0] ?? null;

  return {
    resumeCount,
    latestResume,
    latestAnalysis,
    analysisHistory,
    recentActivity: buildRecentActivity(resumes),
  };
}

function buildRecentActivity(resumes: ResumeWithAnalyses[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const resume of resumes) {
    items.push(
      resume.status === "FAILED"
        ? {
            id: `resume-${resume.id}`,
            type: "resume_parse_failed",
            title: `Couldn't parse "${resume.title}"`,
            description: resume.failureReason ?? resume.originalFilename,
            timestamp: resume.createdAt,
            href: `/resume/${resume.id}`,
          }
        : {
            id: `resume-${resume.id}`,
            type: "resume_uploaded",
            title: `Uploaded "${resume.title}"`,
            description: resume.originalFilename,
            timestamp: resume.createdAt,
            href: `/resume/${resume.id}`,
          },
    );

    for (const analysis of resume.analyses) {
      items.push({
        id: `analysis-${analysis.id}`,
        type: "resume_analyzed",
        title: `ATS analysis completed for "${resume.title}"`,
        description: `Scored ${analysis.overallScore}/100`,
        timestamp: analysis.createdAt,
        href: `/resume/${resume.id}`,
      });
    }
  }

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);
}

/** Best-effort years-of-experience estimate: earliest experience entry's
 * start year to now. Returns null (never a guess) if no parseable year is
 * found, so the dialog leaves the field blank instead of pre-filling a
 * number nobody actually said. */
function estimateYearsOfExperience(
  experience: { startDate: string | null }[],
): number | null {
  const years = experience
    .map((entry) => entry.startDate?.match(/\d{4}/)?.[0])
    .filter((year): year is string => Boolean(year))
    .map(Number);

  if (years.length === 0) return null;

  const earliest = Math.min(...years);
  const currentYear = new Date().getFullYear();
  const estimate = currentYear - earliest;

  return estimate >= 0 && estimate <= 60 ? estimate : null;
}

export function getSalaryPrefill(
  resume: ResumeWithAnalyses | null,
): SalaryPrefill {
  const empty: SalaryPrefill = {
    role: "",
    location: "",
    yearsOfExperience: null,
    skills: [],
  };

  if (!resume?.parsedData) return empty;

  const parsed = ResumeDataSchema.safeParse(resume.parsedData);
  if (!parsed.success) return empty;

  const { contact, experience, skills } = parsed.data;

  return {
    role: experience[0]?.title ?? "",
    location: contact.location ?? "",
    yearsOfExperience: estimateYearsOfExperience(experience),
    skills,
  };
}
