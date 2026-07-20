"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomQuestions } from "@/features/opportunities/types";

/** Module 6's "Custom Questions" — application-form questions specific to
 * this listing (e.g. "Why do you want to work here?"). The user writes
 * the question and their own answer; CareerOS never fabricates either. */
export function CustomQuestionsEditor({
  customQuestions,
  onChange,
}: {
  customQuestions: CustomQuestions;
  onChange: (customQuestions: CustomQuestions) => void;
}) {
  const [newQuestion, setNewQuestion] = useState("");

  function addQuestion() {
    const question = newQuestion.trim();
    if (!question) return;
    onChange([...customQuestions, { id: crypto.randomUUID(), question, answer: "" }]);
    setNewQuestion("");
  }

  function updateAnswer(id: string, answer: string) {
    onChange(customQuestions.map((item) => (item.id === id ? { ...item, answer } : item)));
  }

  function removeQuestion(id: string) {
    onChange(customQuestions.filter((item) => item.id !== id));
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {customQuestions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No custom questions yet — add any application-form questions specific to this listing.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {customQuestions.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <Label htmlFor={`custom-question-${item.id}`} className="wrap-break-word">
                  {item.question}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeQuestion(item.id)}
                  aria-label={`Remove question: ${item.question}`}
                  className="shrink-0"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
              <Textarea
                id={`custom-question-${item.id}`}
                rows={3}
                placeholder="Your answer…"
                value={item.answer}
                onChange={(event) => updateAnswer(item.id, event.target.value)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="e.g. Why do you want to work here?"
          value={newQuestion}
          onChange={(event) => setNewQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addQuestion();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addQuestion}
          disabled={!newQuestion.trim()}
          aria-label="Add custom question"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
