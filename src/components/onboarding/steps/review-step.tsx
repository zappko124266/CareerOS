"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AVAILABILITY_LABEL,
  buildLocationSummary,
  EMPLOYMENT_TYPE_LABEL,
  EXPERIENCE_LEVEL_LABEL,
  SEARCH_PRIORITY_LABEL,
} from "@/features/discovery/types";
import type {
  AvailabilityWindow,
  DiscoveryPreferenceInput,
  ExperienceLevel,
  SearchPriority,
} from "@/features/discovery/types";
import type { OpportunityType } from "@/features/opportunities/types";

import type { CareerGoalDraft } from "./target-role-step";

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="wrap-break-word text-sm font-medium">{value || "Not set"}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="shrink-0"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="size-3.5" />
        Edit
      </Button>
    </div>
  );
}

function salarySummary(value: DiscoveryPreferenceInput): string {
  if (!value.salaryMin && !value.salaryMax) return "";
  const currency = value.salaryCurrency ? `${value.salaryCurrency} ` : "";
  if (value.salaryMin && value.salaryMax) {
    return `${currency}${value.salaryMin.toLocaleString()}–${value.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(value.salaryMin ?? value.salaryMax)!.toLocaleString()}+`;
}

export function ReviewStep({
  value,
  goal,
  onJumpToStep,
}: {
  value: DiscoveryPreferenceInput;
  goal: CareerGoalDraft;
  onJumpToStep: (stepIndex: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Review your answers</h2>
        <p className="text-muted-foreground text-sm">
          Everything here can be changed later from Settings.
        </p>
      </div>

      <div className="divide-border divide-y">
        <ReviewRow
          label="Career stage"
          value={value.experienceLevel ? EXPERIENCE_LEVEL_LABEL[value.experienceLevel as ExperienceLevel] : ""}
          onEdit={() => onJumpToStep(0)}
        />
        <ReviewRow
          label="Years of experience"
          value={value.yearsOfExperience ? String(value.yearsOfExperience) : ""}
          onEdit={() => onJumpToStep(0)}
        />
        <ReviewRow label="Education" value={value.educationLevel ?? ""} onEdit={() => onJumpToStep(0)} />
        <ReviewRow
          label="Target roles"
          value={value.preferredRoles.join(", ")}
          onEdit={() => onJumpToStep(1)}
        />
        <ReviewRow label="Timeline" value={goal.targetTimeline} onEdit={() => onJumpToStep(1)} />
        <ReviewRow
          label="Job search urgency"
          value={value.availability ? AVAILABILITY_LABEL[value.availability as AvailabilityWindow] : ""}
          onEdit={() => onJumpToStep(1)}
        />
        <ReviewRow
          label="What matters most"
          value={(value.searchPriorities ?? [])
            .map((priority) => SEARCH_PRIORITY_LABEL[priority as SearchPriority])
            .join(", ")}
          onEdit={() => onJumpToStep(1)}
        />
        <ReviewRow
          label="Location & work mode"
          value={buildLocationSummary(value.location) ?? ""}
          onEdit={() => onJumpToStep(2)}
        />
        <ReviewRow label="Skills" value={(value.skills ?? []).join(", ")} onEdit={() => onJumpToStep(3)} />
        <ReviewRow label="Salary expectation" value={salarySummary(value)} onEdit={() => onJumpToStep(4)} />
        <ReviewRow
          label="Employment type"
          value={(value.employmentTypes ?? [])
            .map((type) => EMPLOYMENT_TYPE_LABEL[type as OpportunityType])
            .join(", ")}
          onEdit={() => onJumpToStep(4)}
        />
        <ReviewRow
          label="Dream companies"
          value={value.preferredCompanies.join(", ")}
          onEdit={() => onJumpToStep(5)}
        />
        <ReviewRow
          label="Companies to avoid"
          value={value.companyBlacklist.join(", ")}
          onEdit={() => onJumpToStep(5)}
        />
        <ReviewRow
          label="Job boards you use"
          value={(value.existingJobPortals ?? []).join(", ")}
          onEdit={() => onJumpToStep(5)}
        />
      </div>
    </div>
  );
}
