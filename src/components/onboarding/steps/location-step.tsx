"use client";

import { LocationPicker } from "@/components/location/location-picker";
import type { DiscoveryPreferenceInput } from "@/features/discovery/types";
import type { LocationPreferenceInput } from "@/features/location/types";

export function LocationStep({
  value,
  onChange,
}: {
  value: DiscoveryPreferenceInput;
  onChange: (next: DiscoveryPreferenceInput) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Where do you want to work?</h2>
        <p className="text-muted-foreground text-sm">
          Pick as many locations as you&apos;d consider, and how you like to work.
        </p>
      </div>

      <LocationPicker
        value={value.location}
        onChange={(location: LocationPreferenceInput) => onChange({ ...value, location })}
      />
    </div>
  );
}
