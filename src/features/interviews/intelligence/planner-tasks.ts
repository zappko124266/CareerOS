/**
 * The Interview Planner — Sprint 20, Module 5. A pure, deterministic
 * checklist over data this codebase already has — no AI call (unlike
 * `InterviewPrep.preparationChecklist`, which is AI-generated from
 * `analyzeInterviewReadiness` and stays exactly as it was). "Reuse
 * Automation Engine": these tasks are surfaced to the Autonomous Career
 * Agent via `interviewIntelligence` (Career Brain), which folds an
 * unprepared upcoming interview into the existing
 * `recommend_interview_prep` action category rather than a new
 * automation task or scheduler entry.
 *
 * Every `done` flag is inferred from a real, already-persisted signal —
 * never a guess at what the user has actually done outside CareerOS.
 */
export type InterviewPrepTaskId =
  | "research_company"
  | "study_skills"
  | "practice_technical"
  | "practice_behavioral"
  | "review_resume"
  | "prepare_questions"
  | "salary_research";

export interface InterviewPrepTask {
  id: InterviewPrepTaskId;
  label: string;
  description: string;
  done: boolean;
  href: string;
}

interface LikelyQuestion {
  question: string;
  category: string;
}

interface WeakAnswerFlag {
  question: string;
}

function isTechnicalCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return normalized.includes("technical") || normalized.includes("coding") || normalized.includes("system");
}

function isBehavioralCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return normalized.includes("behavioral") || normalized.includes("hr") || normalized.includes("culture");
}

export function buildInterviewPrepTasks(
  input: {
    hasCompanySnapshot: boolean;
    likelyQuestions: LikelyQuestion[];
    weakAnswerFlags: WeakAnswerFlag[];
    hasTailoredResume: boolean;
    noteCount: number;
    hasOffer: boolean;
  },
  opportunityId: string,
): InterviewPrepTask[] {
  const technicalQuestions = new Set(
    input.likelyQuestions.filter((q) => isTechnicalCategory(q.category)).map((q) => q.question),
  );
  const behavioralQuestions = new Set(
    input.likelyQuestions.filter((q) => isBehavioralCategory(q.category)).map((q) => q.question),
  );
  const practicedTechnical = input.weakAnswerFlags.some((flag) => technicalQuestions.has(flag.question));
  const practicedBehavioral = input.weakAnswerFlags.some((flag) => behavioralQuestions.has(flag.question));

  const href = `/opportunities/${opportunityId}`;

  return [
    {
      id: "research_company",
      label: "Research the company",
      description: "Read the AI company research summary — mission, product, recent context.",
      done: input.hasCompanySnapshot,
      href,
    },
    {
      id: "study_skills",
      label: "Study likely skills",
      description: "Generate AI Interview Coach prep to see the skills and questions this round likely covers.",
      done: input.likelyQuestions.length > 0,
      href,
    },
    {
      id: "practice_technical",
      label: "Practice a technical question",
      description: "Submit a practice answer to a technical/coding question for AI feedback.",
      done: practicedTechnical,
      href,
    },
    {
      id: "practice_behavioral",
      label: "Practice a behavioral/HR question",
      description: "Submit a practice answer to a behavioral or HR question for AI feedback.",
      done: practicedBehavioral,
      href,
    },
    {
      id: "review_resume",
      label: "Review your resume for this role",
      description: "Confirm a tailored resume version is selected for this opportunity.",
      done: input.hasTailoredResume,
      href,
    },
    {
      id: "prepare_questions",
      label: "Prepare questions to ask",
      description: "Jot down questions for the interviewer as an interview note.",
      done: input.noteCount > 0,
      href,
    },
    {
      id: "salary_research",
      label: "Research salary expectations",
      description: "Record real offer terms once you have them — until then, this stays open.",
      done: input.hasOffer,
      href,
    },
  ];
}
