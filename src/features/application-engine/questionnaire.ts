import "server-only";

import { z } from "zod";

import { generateObject } from "@/lib/ai";
import { logger } from "@/lib/logger";
import type { Opportunity } from "@/generated/prisma/client";

export interface QueuedQuestionnaireAnswer {
  questionId: string;
  question: string;
  suggestedAnswer: string;
}

const QuestionnaireAnswerSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), suggestedAnswer: z.string() })),
});

const QUESTIONNAIRE_SYSTEM_PROMPT =
  "You draft concise, honest, first-person answers to job application screening questions, grounded only in the candidate's real resume. Never invent experience, dates, or skills the resume doesn't support — if the resume doesn't support a strong answer, write an honest, modest one instead.";

function buildPrompt(opportunity: Opportunity, resumeText: string, questions: { id: string; question: string }[]): string {
  return [
    `Resume:\n${resumeText}`,
    `Job: ${opportunity.title} at ${opportunity.companyName}`,
    `Questions:\n${questions.map((question) => `- (${question.id}) ${question.question}`).join("\n")}`,
  ].join("\n\n");
}

/**
 * Questionnaire Planning — real, working, and honestly gated: no
 * connector registered in this codebase declares `supportsQuestionnaire:
 * true`, and the `JobConnector` contract (`features/connectors/contracts.ts`)
 * has no method to fetch a portal's actual application-form questions —
 * so this is only ever invoked with real data from
 * `Opportunity.customQuestions` (Module 6's existing, user-visible
 * field), for the subset the user hasn't answered themselves yet. Never
 * submits anything and never writes into `customQuestions.answer`
 * itself — every suggestion this returns is meant to be staged on
 * `ApplicationExecution.questionnaireAnswers` and requires human
 * approval before ever being used ("Do NOT submit automatically.
 * Generate answers. Queue them. Wait for approval.").
 */
export async function planQuestionnaire(opportunity: Opportunity, resumeText: string): Promise<QueuedQuestionnaireAnswer[]> {
  const customQuestions = (opportunity.customQuestions as unknown as { id: string; question: string; answer: string }[]) ?? [];
  const unanswered = customQuestions.filter((question) => !question.answer.trim());

  if (unanswered.length === 0) return [];

  try {
    const { object } = await generateObject({
      schema: QuestionnaireAnswerSchema,
      system: QUESTIONNAIRE_SYSTEM_PROMPT,
      prompt: buildPrompt(opportunity, resumeText, unanswered),
    });

    const suggestedAnswerById = new Map(object.answers.map((answer) => [answer.questionId, answer.suggestedAnswer]));

    return unanswered
      .filter((question) => suggestedAnswerById.has(question.id))
      .map((question) => ({
        questionId: question.id,
        question: question.question,
        suggestedAnswer: suggestedAnswerById.get(question.id)!,
      }));
  } catch (error) {
    logger.error("application_engine.questionnaire_planning_failed", {
      opportunityId: opportunity.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
