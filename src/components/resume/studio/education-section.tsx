"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResumeData, ResumeEducation } from "@/features/resume/schema";

const EMPTY_EDUCATION: ResumeEducation = {
  institution: "",
  degree: null,
  field: null,
  startDate: null,
  endDate: null,
};

export function EducationSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  function updateEntry(index: number, patch: Partial<ResumeEducation>) {
    const education = data.education.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, ...patch } : entry,
    );
    onChange({ ...data, education });
  }

  function addEntry() {
    onChange({ ...data, education: [...data.education, EMPTY_EDUCATION] });
  }

  function removeEntry(index: number) {
    onChange({
      ...data,
      education: data.education.filter((_, entryIndex) => entryIndex !== index),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {data.education.map((entry, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`edu-institution-${index}`}>Institution</Label>
                  <Input
                    id={`edu-institution-${index}`}
                    value={entry.institution}
                    onChange={(event) => updateEntry(index, { institution: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`edu-degree-${index}`}>Degree</Label>
                  <Input
                    id={`edu-degree-${index}`}
                    value={entry.degree ?? ""}
                    onChange={(event) => updateEntry(index, { degree: event.target.value })}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeEntry(index)}
                aria-label={`Remove ${entry.institution || "this entry"}`}
                className="mt-6 shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edu-field-${index}`}>Field of study</Label>
                <Input
                  id={`edu-field-${index}`}
                  value={entry.field ?? ""}
                  onChange={(event) => updateEntry(index, { field: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edu-start-${index}`}>Start date</Label>
                <Input
                  id={`edu-start-${index}`}
                  placeholder="2016-08"
                  value={entry.startDate ?? ""}
                  onChange={(event) => updateEntry(index, { startDate: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edu-end-${index}`}>End date</Label>
                <Input
                  id={`edu-end-${index}`}
                  placeholder="2020-05"
                  value={entry.endDate ?? ""}
                  onChange={(event) => updateEntry(index, { endDate: event.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addEntry} className="w-fit">
        <Plus />
        Add education
      </Button>
    </div>
  );
}
