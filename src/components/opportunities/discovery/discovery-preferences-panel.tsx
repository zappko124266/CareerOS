"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateDiscoveryPreferenceAction } from "@/actions/discovery";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/shared/tag-input";
import { LocationPicker } from "@/components/location/location-picker";
import {
  AVAILABILITY_LABEL,
  buildDiscoveryPreferenceFormValue,
  DISCOVERY_FREQUENCY_LABEL,
  EXPERIENCE_LEVEL_LABEL,
} from "@/features/discovery/types";
import type {
  AvailabilityWindow,
  DiscoveryFrequency,
  DiscoveryPreferenceInput,
  ExperienceLevel,
} from "@/features/discovery/types";
import type { LocationPreferenceInput } from "@/features/location/types";
import type { DiscoveryPreference } from "@/generated/prisma/client";

const NONE_VALUE = "__none__";

export function DiscoveryPreferencesPanel({
  initialPreference,
}: {
  initialPreference: DiscoveryPreference | null;
}) {
  const [value, setValue] = useState<DiscoveryPreferenceInput>(
    buildDiscoveryPreferenceFormValue(initialPreference),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateDiscoveryPreferenceAction(value);
    setSaving(false);

    if (result.status === "success") {
      toast.success("Discovery preferences saved");
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Roles & Industries</h2>
          <div className="flex flex-col gap-1.5">
            <Label>Preferred roles</Label>
            <TagInput
              value={value.preferredRoles}
              onChange={(preferredRoles) => setValue({ ...value, preferredRoles })}
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Preferred industries</Label>
            <TagInput
              value={value.industries}
              onChange={(industries) => setValue({ ...value, industries })}
              placeholder="e.g. Fintech"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Keywords</Label>
            <TagInput
              value={value.keywords}
              onChange={(keywords) => setValue({ ...value, keywords })}
              placeholder="e.g. Kubernetes"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Companies</h2>
          <div className="flex flex-col gap-1.5">
            <Label>Preferred companies</Label>
            <TagInput
              value={value.preferredCompanies}
              onChange={(preferredCompanies) => setValue({ ...value, preferredCompanies })}
              placeholder="e.g. Stripe"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Company whitelist</Label>
            <p className="text-muted-foreground text-xs">Always scored favorably.</p>
            <TagInput
              value={value.companyWhitelist}
              onChange={(companyWhitelist) => setValue({ ...value, companyWhitelist })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Company blacklist</Label>
            <p className="text-muted-foreground text-xs">Never surfaced favorably.</p>
            <TagInput
              value={value.companyBlacklist}
              onChange={(companyBlacklist) => setValue({ ...value, companyBlacklist })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Location & Work Type</h2>
          <LocationPicker
            value={value.location}
            onChange={(location: LocationPreferenceInput) => setValue({ ...value, location })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Salary</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salary-min">Minimum</Label>
              <Input
                id="salary-min"
                type="number"
                value={value.salaryMin ?? ""}
                onChange={(event) =>
                  setValue({
                    ...value,
                    salaryMin: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salary-max">Maximum</Label>
              <Input
                id="salary-max"
                type="number"
                value={value.salaryMax ?? ""}
                onChange={(event) =>
                  setValue({
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
                onChange={(event) => setValue({ ...value, salaryCurrency: event.target.value || null })}
                placeholder="USD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Experience & Availability</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="experience-level">Experience level</Label>
              <Select
                value={value.experienceLevel ?? NONE_VALUE}
                onValueChange={(next) =>
                  setValue({
                    ...value,
                    experienceLevel: next === NONE_VALUE ? null : (next as ExperienceLevel),
                  })
                }
              >
                <SelectTrigger id="experience-level">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                  {(Object.keys(EXPERIENCE_LEVEL_LABEL) as ExperienceLevel[]).map((level) => (
                    <SelectItem key={level} value={level}>
                      {EXPERIENCE_LEVEL_LABEL[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={value.availability ?? NONE_VALUE}
                onValueChange={(next) =>
                  setValue({
                    ...value,
                    availability: next === NONE_VALUE ? null : (next as AvailabilityWindow),
                  })
                }
              >
                <SelectTrigger id="availability">
                  <SelectValue placeholder="Not set" />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Discovery Frequency & Notifications</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discovery-frequency">How often should CareerOS search?</Label>
            <Select
              value={value.discoveryFrequency}
              onValueChange={(next) =>
                setValue({ ...value, discoveryFrequency: next as DiscoveryFrequency })
              }
            >
              <SelectTrigger id="discovery-frequency" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DISCOVERY_FREQUENCY_LABEL) as DiscoveryFrequency[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {DISCOVERY_FREQUENCY_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">In-app Daily Career Agent briefing</p>
              <p className="text-muted-foreground text-xs">
                Email/SMS delivery isn&apos;t available yet — this controls the in-app briefing only.
              </p>
            </div>
            <Switch
              checked={value.notifyInApp}
              onCheckedChange={(checked) => setValue({ ...value, notifyInApp: checked })}
              aria-label="In-app Daily Career Agent briefing"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Work Requirements</h2>
          <p className="text-muted-foreground text-xs">
            Free text where no fixed set of options exists — same convention as the rest of this
            codebase&apos;s honest, non-fabricated fields.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-size">Preferred company size</Label>
              <Input
                id="company-size"
                value={value.preferredCompanySize ?? ""}
                onChange={(event) =>
                  setValue({ ...value, preferredCompanySize: event.target.value || null })
                }
                placeholder="e.g. Startup (1-50), or 500+"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visa-sponsorship">Visa sponsorship required</Label>
              <Select
                value={
                  value.visaSponsorshipRequired === null
                    ? NONE_VALUE
                    : value.visaSponsorshipRequired
                      ? "true"
                      : "false"
                }
                onValueChange={(next) =>
                  setValue({
                    ...value,
                    visaSponsorshipRequired: next === NONE_VALUE ? null : next === "true",
                  })
                }
              >
                <SelectTrigger id="visa-sponsorship">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                  <SelectItem value="true">Yes, I need sponsorship</SelectItem>
                  <SelectItem value="false">No, not required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="travel-willingness">Travel willingness</Label>
              <Input
                id="travel-willingness"
                value={value.travelWillingness ?? ""}
                onChange={(event) =>
                  setValue({ ...value, travelWillingness: event.target.value || null })
                }
                placeholder="e.g. Up to 25%, None"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-preference">Shift preference</Label>
              <Input
                id="shift-preference"
                value={value.shiftPreference ?? ""}
                onChange={(event) =>
                  setValue({ ...value, shiftPreference: event.target.value || null })
                }
                placeholder="e.g. Day shift, Night shift, Flexible"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="joining-timeline">Joining timeline</Label>
              <Input
                id="joining-timeline"
                value={value.joiningTimeline ?? ""}
                onChange={(event) =>
                  setValue({ ...value, joiningTimeline: event.target.value || null })
                }
                placeholder="e.g. Immediate, 30 days notice"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Languages</Label>
            <TagInput
              value={value.languages}
              onChange={(languages) => setValue({ ...value, languages })}
              placeholder="e.g. English, Hindi"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
