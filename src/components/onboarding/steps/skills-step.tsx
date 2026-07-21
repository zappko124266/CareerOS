"use client";

import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/shared/tag-input";
import type { DiscoveryPreferenceInput } from "@/features/discovery/types";

export function SkillsStep({
  value,
  onChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">What are your strongest skills?</h2>
        <p className="text-muted-foreground text-sm">
          List the skills you&apos;d want a recruiter to notice first.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Skills</Label>
        <TagInput
          value={value.skills ?? []}
          onChange={(skills) => onChange({ ...value, skills })}
          placeholder="e.g. TypeScript"
          aria-label="Skills"
        />
      </div>
    </div>
  );
}
