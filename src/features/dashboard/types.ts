import type { Prisma, ResumeAnalysis } from "@/generated/prisma/client";

export type ResumeWithAnalyses = Prisma.ResumeGetPayload<{
  include: { analyses: true };
}>;

export type ActivityType =
  | "resume_uploaded"
  | "resume_analyzed"
  | "resume_parse_failed";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  href?: string;
}

export interface DashboardData {
  resumeCount: number;
  latestResume: ResumeWithAnalyses | null;
  latestAnalysis: ResumeAnalysis | null;
  analysisHistory: ResumeAnalysis[];
  recentActivity: ActivityItem[];
}

/** A best-effort prefill for the Salary Insights dialog, derived from the
 * user's own parsed resume. Any field CareerOS isn't confident about is
 * left blank rather than guessed — a wrong silent guess would make the
 * salary estimate look more authoritative than it is. */
export interface SalaryPrefill {
  role: string;
  location: string;
  yearsOfExperience: number | null;
  skills: string[];
}
