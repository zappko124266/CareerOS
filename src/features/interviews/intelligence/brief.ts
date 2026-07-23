import type { LikelyQuestion } from "@/features/career-intelligence/interview";
import type { ExperienceGapAssessmentOutput } from "@/features/applications/format";

/**
 * The Interview Brief — Sprint 20, Module 4. A pure aggregator, not a
 * new AI prompt ("Everything generated through the existing AI Router.
 * No duplicate prompts."): every field is either a real, already-stored
 * value (job description, salary, people involved) or the output of an
 * AI service this codebase already runs for other reasons —
 * `InterviewPrep` (`analyzeInterviewReadiness`), `CompanySnapshot`
 * (`summarizeCompany`, Company Intelligence), and the Experience Gap
 * Assessment (`analyzeExperienceGap`, Career Gap panel) for "resume
 * weaknesses." A field is `null`/empty exactly when that underlying
 * piece hasn't been generated yet — this function never fills a gap
 * with invented content, only points the caller at what to generate.
 */
export interface InterviewBrief {
  company: {
    name: string;
    summary: string | null;
    highlights: string[];
    caveats: string[];
  };
  role: {
    title: string;
    description: string;
    location: string | null;
    remote: boolean;
  };
  resumeVersionUsed: { id: string; title: string } | null;
  resumeWeaknesses: { requirement: string; severity: string }[];
  likelyQuestions: {
    behavioral: LikelyQuestion[];
    technical: LikelyQuestion[];
    other: LikelyQuestion[];
  };
  starStories: string[];
  salary: { min: number | null; max: number | null; currency: string | null };
  peopleInvolved: { name: string; role: string }[];
  documents: { documentType: string; documentUrl: string; note: string }[];
}

function categoryBucket(category: string): "behavioral" | "technical" | "other" {
  const normalized = category.toLowerCase();
  if (normalized.includes("technical") || normalized.includes("coding") || normalized.includes("system")) return "technical";
  if (normalized.includes("behavioral") || normalized.includes("hr") || normalized.includes("culture")) return "behavioral";
  return "other";
}

export function buildInterviewBrief(input: {
  companyName: string;
  companySnapshot: { aiSummary: string; aiHighlights: unknown; aiCaveats: unknown } | null;
  opportunityTitle: string;
  opportunityDescription: string;
  location: string | null;
  remote: boolean;
  resumeVersion: { id: string; title: string } | null;
  gapAssessment: ExperienceGapAssessmentOutput | null;
  likelyQuestions: LikelyQuestion[];
  starAnswerSuggestions: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  recruiter: { name: string } | null;
  documentNotes: { documentType: string | null; documentUrl: string | null; note: string }[];
}): InterviewBrief {
  const buckets: InterviewBrief["likelyQuestions"] = { behavioral: [], technical: [], other: [] };
  for (const question of input.likelyQuestions) {
    buckets[categoryBucket(question.category)].push(question);
  }

  return {
    company: {
      name: input.companyName,
      summary: input.companySnapshot?.aiSummary ?? null,
      highlights: Array.isArray(input.companySnapshot?.aiHighlights)
        ? (input.companySnapshot.aiHighlights as string[])
        : [],
      caveats: Array.isArray(input.companySnapshot?.aiCaveats) ? (input.companySnapshot.aiCaveats as string[]) : [],
    },
    role: {
      title: input.opportunityTitle,
      description: input.opportunityDescription,
      location: input.location,
      remote: input.remote,
    },
    resumeVersionUsed: input.resumeVersion,
    resumeWeaknesses: (input.gapAssessment?.gaps ?? [])
      .filter((gap) => gap.severity !== "low")
      .map((gap) => ({ requirement: gap.requirement, severity: gap.severity })),
    likelyQuestions: buckets,
    starStories: input.starAnswerSuggestions,
    salary: { min: input.salaryMin, max: input.salaryMax, currency: input.salaryCurrency },
    peopleInvolved: input.recruiter ? [{ name: input.recruiter.name, role: "Recruiter" }] : [],
    documents: input.documentNotes
      .filter(
        (note): note is { documentType: string; documentUrl: string; note: string } =>
          note.documentType !== null && note.documentUrl !== null,
      )
      .map((note) => ({ documentType: note.documentType, documentUrl: note.documentUrl, note: note.note })),
  };
}
