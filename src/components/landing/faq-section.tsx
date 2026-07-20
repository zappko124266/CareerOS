import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

const FAQS = [
  {
    question: "Is CareerOS a job board?",
    answer:
      "No. CareerOS doesn't list job openings or connect you with recruiters. It's an AI agent that works on your side of the table — analyzing your resume and profile, and telling you exactly what to fix — for roles you find anywhere.",
  },
  {
    question: "What happens to my resume data?",
    answer:
      "Your resumes and profile data are stored securely behind your account and are never sold or shared with third parties. You can delete any resume from your dashboard at any time.",
  },
  {
    question: "How is this different from just using ChatGPT?",
    answer:
      "General-purpose chat models give you a paragraph of opinion. CareerOS runs your resume through purpose-built AI services that return structured, validated scores and breakdowns — the same analysis, every time, instead of a different answer depending on how you phrase the question.",
  },
  {
    question: "Which AI models power CareerOS?",
    answer:
      "CareerOS routes every request through an internal AI Router across multiple leading model providers, with automatic fallback if one is unavailable — so analysis quality stays consistent rather than depending on a single vendor.",
  },
  {
    question: "Do I need a credit card to try it?",
    answer:
      "No. Sign up free, no card required — the Free plan gives you real, working monthly access to every feature, not a locked-down trial. Pro (unlimited usage) is on the roadmap, but self-serve billing isn't live yet.",
  },
  {
    question: "Is there a Pro plan I can buy right now?",
    answer:
      "Not yet — CareerOS doesn't have self-serve billing wired up today, so there's no working checkout to point you to. Free already includes real, working monthly limits across every feature while that's being built.",
  },
];

export function FaqSection() {
  return (
    <Section id="faq">
      <SectionContainer className="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
        />

        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SectionContainer>
    </Section>
  );
}
