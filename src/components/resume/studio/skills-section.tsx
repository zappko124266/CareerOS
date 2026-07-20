"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResumeData } from "@/features/resume/schema";

export function SkillsSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  function addSkill() {
    const skill = newSkill.trim();
    if (!skill || data.skills.includes(skill)) return;
    onChange({ ...data, skills: [...data.skills, skill] });
    setNewSkill("");
  }

  function removeSkill(skill: string) {
    onChange({ ...data, skills: data.skills.filter((item) => item !== skill) });
  }

  return (
    <div className="flex flex-col gap-3">
      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="hover:bg-foreground/10 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="e.g. TypeScript"
          value={newSkill}
          onChange={(event) => setNewSkill(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addSkill}
          disabled={!newSkill.trim()}
          aria-label="Add skill"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
