"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVEL_LABEL } from "@/features/discovery/types";
import type { DiscoveryPreferenceInput, ExperienceLevel } from "@/features/discovery/types";

const NONE_VALUE = "__none__";

export function CareerStageStep({
  value,
  onChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Where are you in your career?</h2>
        <p className="text-muted-foreground text-sm">
          This helps us tailor everything else to where you actually are.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="career-stage">Career stage</Label>
        <Select
          value={value.experienceLevel ?? NONE_VALUE}
          onValueChange={(next) =>
            onChange({
              ...value,
              experienceLevel: next === NONE_VALUE ? null : (next as ExperienceLevel),
            })
          }
        >
          <SelectTrigger id="career-stage" className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Not set</SelectItem>
            {(Object.keys(EXPERIENCE_LEVEL_LABEL) as ExperienceLevel[]).map((option) => (
              <SelectItem key={option} value={option}>
                {EXPERIENCE_LEVEL_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="years-experience">Years of experience</Label>
        <Input
          id="years-experience"
          type="number"
          min={0}
          max={60}
          value={value.yearsOfExperience ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              yearsOfExperience: event.target.value ? Number(event.target.value) : null,
            })
          }
          placeholder="e.g. 5"
          className="w-full sm:w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="education-level">Education</Label>
        <Input
          id="education-level"
          value={value.educationLevel ?? ""}
          onChange={(event) => onChange({ ...value, educationLevel: event.target.value || null })}
          placeholder="e.g. Bachelor's in Computer Science"
        />
      </div>
    </div>
  );
}
