"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeData, ResumeExperience } from "@/features/resume/schema";

const EMPTY_EXPERIENCE: ResumeExperience = {
  company: "",
  title: "",
  location: null,
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
};

export function ExperienceSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  function updateEntry(index: number, patch: Partial<ResumeExperience>) {
    const experience = data.experience.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, ...patch } : entry,
    );
    onChange({ ...data, experience });
  }

  function addEntry() {
    onChange({ ...data, experience: [...data.experience, EMPTY_EXPERIENCE] });
  }

  function removeEntry(index: number) {
    onChange({
      ...data,
      experience: data.experience.filter((_, entryIndex) => entryIndex !== index),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {data.experience.map((entry, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`exp-title-${index}`}>Job title</Label>
                  <Input
                    id={`exp-title-${index}`}
                    value={entry.title}
                    onChange={(event) => updateEntry(index, { title: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`exp-company-${index}`}>Company</Label>
                  <Input
                    id={`exp-company-${index}`}
                    value={entry.company}
                    onChange={(event) => updateEntry(index, { company: event.target.value })}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeEntry(index)}
                aria-label={`Remove ${entry.title || "this role"}`}
                className="mt-6 shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`exp-location-${index}`}>Location</Label>
                <Input
                  id={`exp-location-${index}`}
                  value={entry.location ?? ""}
                  onChange={(event) => updateEntry(index, { location: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`exp-start-${index}`}>Start date</Label>
                <Input
                  id={`exp-start-${index}`}
                  placeholder="2022-01"
                  value={entry.startDate ?? ""}
                  onChange={(event) => updateEntry(index, { startDate: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`exp-end-${index}`}>End date</Label>
                <Input
                  id={`exp-end-${index}`}
                  placeholder="2024-06"
                  disabled={entry.current}
                  value={entry.endDate ?? ""}
                  onChange={(event) => updateEntry(index, { endDate: event.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={`exp-current-${index}`}
                checked={entry.current}
                onCheckedChange={(checked) =>
                  updateEntry(index, { current: checked === true, endDate: checked ? null : entry.endDate })
                }
              />
              <Label htmlFor={`exp-current-${index}`} className="font-normal">
                I currently work here
              </Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`exp-bullets-${index}`}>
                Bullet points (one per line)
              </Label>
              <Textarea
                id={`exp-bullets-${index}`}
                rows={4}
                value={entry.bullets.join("\n")}
                onChange={(event) =>
                  updateEntry(index, {
                    bullets: event.target.value.split("\n"),
                  })
                }
                placeholder="Led migration to event-driven architecture, cutting p99 latency by 40%"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addEntry} className="w-fit">
        <Plus />
        Add role
      </Button>
    </div>
  );
}
