"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPLOYMENT_TYPE_LABEL } from "@/features/discovery/types";
import type { DiscoveryPreferenceInput } from "@/features/discovery/types";
import type { OpportunityType } from "@/features/opportunities/types";

const EMPLOYMENT_TYPES = Object.keys(EMPLOYMENT_TYPE_LABEL) as OpportunityType[];

export function CompensationStep({
  value,
  onChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
}) {
  const employmentTypes = value.employmentTypes ?? [];

  function toggleEmploymentType(type: OpportunityType, checked: boolean) {
    onChange({
      ...value,
      employmentTypes: checked
        ? [...employmentTypes, type]
        : employmentTypes.filter((entry) => entry !== type),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">What are you looking for?</h2>
        <p className="text-muted-foreground text-sm">
          A realistic salary range and the kind of work arrangement you want.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-min">Minimum salary</Label>
          <Input
            id="salary-min"
            type="number"
            min={0}
            value={value.salaryMin ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                salaryMin: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-max">Maximum salary</Label>
          <Input
            id="salary-max"
            type="number"
            min={0}
            value={value.salaryMax ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                salaryMax: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-currency">Currency</Label>
          <Input
            id="salary-currency"
            value={value.salaryCurrency ?? ""}
            onChange={(event) => onChange({ ...value, salaryCurrency: event.target.value || null })}
            placeholder="USD"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Employment type</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EMPLOYMENT_TYPES.map((type) => (
            <label
              key={type}
              className="ring-foreground/10 flex items-center gap-2 rounded-lg p-3 ring-1"
            >
              <Checkbox
                checked={employmentTypes.includes(type)}
                onCheckedChange={(checked) => toggleEmploymentType(type, checked === true)}
              />
              {EMPLOYMENT_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
