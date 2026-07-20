import "server-only";

import { prisma } from "@/lib/prisma";

import type { TimelineEntry } from "./types";

/**
 * Module 10 — Career Timeline. A pure, code-computed aggregation over
 * rows that already exist in `Resume`, `Opportunity.statusHistory`,
 * `Interview.stageHistory`, `Offer`, and `LearningItem` — deliberately
 * NOT a new `CareerTimelineEvent` table, since every fact it would store
 * already lives somewhere else; a dedicated table would just be a second,
 * driftable copy of the same data. The AI *narrative* over this timeline
 * (`analyzeCareerTimeline`, `career-intelligence/career/timeline-analysis/`,
 * built an earlier sprint but never wired to any UI until now) stays a
 * separate, on-demand, resume-text-only call — this function never
 * touches the AI Router.
 */
export async function buildUnifiedTimeline(userId: string): Promise<TimelineEntry[]> {
  const [resumes, opportunities, interviews, offers, completedLearning] = await Promise.all([
    prisma.resume.findMany({
      where: { userId },
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.opportunity.findMany({
      where: { userId },
      select: { id: true, title: true, companyName: true, statusHistory: true },
    }),
    prisma.interview.findMany({
      where: { opportunity: { userId } },
      select: {
        id: true,
        stageHistory: true,
        opportunity: { select: { id: true, title: true, companyName: true } },
      },
    }),
    prisma.offer.findMany({
      where: { opportunity: { userId } },
      select: {
        id: true,
        createdAt: true,
        opportunity: { select: { id: true, title: true, companyName: true } },
      },
    }),
    prisma.learningItem.findMany({
      where: { userId, status: "COMPLETED" },
      select: { id: true, skillOrTopic: true, updatedAt: true },
    }),
  ]);

  const entries: TimelineEntry[] = [];

  for (const resume of resumes) {
    entries.push({
      id: `resume-${resume.id}`,
      type: "resume_uploaded",
      title: "Resume uploaded",
      description: resume.title,
      occurredAt: resume.createdAt,
      href: `/resume/${resume.id}`,
    });
  }

  for (const opportunity of opportunities) {
    const history = (opportunity.statusHistory ?? []) as Array<{ status: string; changedAt: string }>;
    for (const entry of history) {
      entries.push({
        id: `opportunity-${opportunity.id}-${entry.changedAt}`,
        type: "application_status_changed",
        title: `${opportunity.title} — ${entry.status.replace(/_/g, " ").toLowerCase()}`,
        description: opportunity.companyName,
        occurredAt: new Date(entry.changedAt),
        href: `/opportunities/${opportunity.id}`,
      });
    }
  }

  for (const interview of interviews) {
    const history = (interview.stageHistory ?? []) as Array<{ stage: string; changedAt: string }>;
    for (const entry of history) {
      entries.push({
        id: `interview-${interview.id}-${entry.changedAt}`,
        type: "interview_stage_changed",
        title: `${interview.opportunity.title} — ${entry.stage.replace(/_/g, " ").toLowerCase()} interview`,
        description: interview.opportunity.companyName,
        occurredAt: new Date(entry.changedAt),
        href: `/opportunities/${interview.opportunity.id}`,
      });
    }
  }

  for (const offer of offers) {
    entries.push({
      id: `offer-${offer.id}`,
      type: "offer_received",
      title: `Offer — ${offer.opportunity.title}`,
      description: offer.opportunity.companyName,
      occurredAt: offer.createdAt,
      href: `/opportunities/${offer.opportunity.id}`,
    });
  }

  for (const item of completedLearning) {
    entries.push({
      id: `learning-${item.id}`,
      type: "learning_completed",
      title: `Completed: ${item.skillOrTopic}`,
      description: "Learning goal marked complete",
      occurredAt: item.updatedAt,
    });
  }

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
