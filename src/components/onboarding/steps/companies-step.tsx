"use client";

import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/shared/tag-input";
import type { DiscoveryPreferenceInput } from "@/features/discovery/types";

export function CompaniesStep({
  value,
  onChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Companies &amp; job boards</h2>
        <p className="text-muted-foreground text-sm">
          Optional — skip anything you don&apos;t have an answer for yet.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Dream companies</Label>
        <TagInput
          value={value.preferredCompanies}
          onChange={(preferredCompanies) => onChange({ ...value, preferredCompanies })}
          placeholder="e.g. Stripe"
          aria-label="Dream companies"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Companies to avoid</Label>
        <TagInput
          value={value.companyBlacklist}
          onChange={(companyBlacklist) => onChange({ ...value, companyBlacklist })}
          placeholder="e.g. a former employer"
          aria-label="Companies to avoid"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Job boards you already use</Label>
        <TagInput
          value={value.existingJobPortals ?? []}
          onChange={(existingJobPortals) => onChange({ ...value, existingJobPortals })}
          placeholder="e.g. LinkedIn, Indeed"
          aria-label="Existing job portals"
        />
      </div>
    </div>
  );
}
