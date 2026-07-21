"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/shared/tag-input";
import { AVAILABILITY_LABEL, SEARCH_PRIORITY_LABEL } from "@/features/discovery/types";
import type {
  AvailabilityWindow,
  DiscoveryPreferenceInput,
  SearchPriority,
} from "@/features/discovery/types";

export interface CareerGoalDraft {
  targetRole: string;
  targetTimeline: string;
}

const NONE_VALUE = "__none__";
const SEARCH_PRIORITIES = Object.keys(SEARCH_PRIORITY_LABEL) as SearchPriority[];

export function TargetRoleStep({
  value,
  onChange,
  goal,
  onGoalChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
  goal: CareerGoalDraft;
  onGoalChange: (next: CareerGoalDraft) => void;
}) {
  const priorities = value.searchPriorities ?? [];

  function togglePriority(priority: SearchPriority, checked: boolean) {
    onChange({
      ...value,
      searchPriorities: checked
        ? [...priorities, priority]
        : priorities.filter((entry) => entry !== priority),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">What roles are you targeting?</h2>
        <p className="text-muted-foreground text-sm">
          Add every title you&apos;d consider — you can always change these later.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Target roles</Label>
        <TagInput
          value={value.preferredRoles}
          onChange={(preferredRoles) => onChange({ ...value, preferredRoles })}
          placeholder="e.g. Senior Backend Engineer"
          aria-label="Target roles"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="career-goal-timeline">What&apos;s your timeline?</Label>
        <Input
          id="career-goal-timeline"
          value={goal.targetTimeline}
          onChange={(event) => onGoalChange({ ...goal, targetTimeline: event.target.value })}
          placeholder="e.g. Actively looking now, or Within 3 months"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-search-urgency">How urgently are you looking?</Label>
        <Select
          value={value.availability ?? NONE_VALUE}
          onValueChange={(next) =>
            onChange({
              ...value,
              availability: next === NONE_VALUE ? null : (next as AvailabilityWindow),
            })
          }
        >
          <SelectTrigger id="job-search-urgency" className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Not set</SelectItem>
            {(Object.keys(AVAILABILITY_LABEL) as AvailabilityWindow[]).map((option) => (
              <SelectItem key={option} value={option}>
                {AVAILABILITY_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>What matters most to you?</Label>
        <p className="text-muted-foreground text-xs">Pick as many as apply.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SEARCH_PRIORITIES.map((priority) => (
            <label
              key={priority}
              className="ring-foreground/10 flex items-center gap-2 rounded-lg p-3 ring-1"
            >
              <Checkbox
                checked={priorities.includes(priority)}
                onCheckedChange={(checked) => togglePriority(priority, checked === true)}
              />
              {SEARCH_PRIORITY_LABEL[priority]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
