"use client";

import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox";
import { Switch } from "@/components/ui/switch";
import {
  findCountry,
  findState,
  listCities,
  listCountries,
  listStates,
} from "@/features/location/service";
import {
  decodeStateKey,
  encodeCityKey,
  encodeStateKey,
} from "@/features/location/types";
import type { LocationPreferenceInput } from "@/features/location/types";

/**
 * Country → State → City drill-down, backed entirely by the structured
 * `country-state-city` dataset (`src/features/location/service.ts`) —
 * selecting a country loads its real states, selecting a state loads its
 * real cities, never a hardcoded list. States/cities are the union across
 * every selected country/state, since a user can target more than one.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationPreferenceInput;
  onChange: (next: LocationPreferenceInput) => void;
}) {
  const countryOptions = useMemo(
    () => listCountries().map((country) => ({ value: country.isoCode, label: `${country.flag} ${country.name}` })),
    [],
  );

  const stateOptions = useMemo(
    () =>
      value.countries.flatMap((countryCode) =>
        listStates(countryCode).map((state) => ({
          value: encodeStateKey(countryCode, state.isoCode),
          label: `${state.name} — ${findCountry(countryCode)?.name ?? countryCode}`,
        })),
      ),
    [value.countries],
  );

  const cityOptions = useMemo(
    () =>
      value.states.flatMap((stateKey) => {
        const decoded = decodeStateKey(stateKey);
        if (!decoded) return [];
        return listCities(decoded.countryCode, decoded.stateCode).map((city) => ({
          value: encodeCityKey(decoded.countryCode, decoded.stateCode, city.name),
          label: `${city.name} — ${findState(decoded.countryCode, decoded.stateCode)?.name ?? decoded.stateCode}`,
        }));
      }),
    [value.states],
  );

  function handleCountriesChange(countries: string[]) {
    // Dropping a country clears any states/cities that belonged only to it.
    const states = value.states.filter((key) => {
      const decoded = decodeStateKey(key);
      return decoded && countries.includes(decoded.countryCode);
    });
    const cities = value.cities.filter((key) => {
      const decoded = decodeStateKey(key);
      return decoded && countries.includes(decoded.countryCode);
    });
    onChange({ ...value, countries, states, cities });
  }

  function handleStatesChange(states: string[]) {
    const cities = value.cities.filter((key) => {
      const parts = key.split(":");
      const stateKey = parts.slice(0, 2).join(":");
      return states.includes(stateKey);
    });
    onChange({ ...value, states, cities });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Countries</Label>
        <MultiSelectCombobox
          options={countryOptions}
          selected={value.countries}
          onChange={handleCountriesChange}
          placeholder="Search countries…"
          ariaLabel="Countries"
        />
      </div>

      {value.countries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>States / Provinces</Label>
          <MultiSelectCombobox
            options={stateOptions}
            selected={value.states}
            onChange={handleStatesChange}
            placeholder="Search states…"
            ariaLabel="States / Provinces"
          />
        </div>
      )}

      {value.states.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Cities</Label>
          <MultiSelectCombobox
            options={cityOptions}
            selected={value.cities}
            onChange={(cities) => onChange({ ...value, cities })}
            placeholder="Search cities…"
            ariaLabel="Cities"
          />
        </div>
      )}

      {value.cities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location-radius">Search radius (km) around selected cities</Label>
          <p className="text-muted-foreground text-xs">
            Saved for future use — job listings only carry a free-text location string today (no
            coordinates), so this can&apos;t filter results by distance yet. Matching still uses
            your selected cities/states/countries directly.
          </p>
          <Input
            id="location-radius"
            type="number"
            min={0}
            max={500}
            value={value.radiusKm ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                radiusKm: event.target.value ? Number(event.target.value) : null,
              })
            }
            placeholder="e.g. 25"
            className="w-full sm:w-40"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="ring-foreground/10 flex items-center gap-2 rounded-lg p-3 ring-1">
          <Checkbox
            checked={value.remote}
            onCheckedChange={(checked) => onChange({ ...value, remote: checked === true })}
          />
          Remote
        </label>
        <label className="ring-foreground/10 flex items-center gap-2 rounded-lg p-3 ring-1">
          <Checkbox
            checked={value.hybrid}
            onCheckedChange={(checked) => onChange({ ...value, hybrid: checked === true })}
          />
          Hybrid
        </label>
        <label className="ring-foreground/10 flex items-center gap-2 rounded-lg p-3 ring-1">
          <Checkbox
            checked={value.onsite}
            onCheckedChange={(checked) => onChange({ ...value, onsite: checked === true })}
          />
          Onsite
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Open to relocation</p>
            <p className="text-muted-foreground text-xs">
              Within the countries/states/cities selected above.
            </p>
          </div>
          <Switch
            checked={value.openToRelocation}
            onCheckedChange={(checked) => onChange({ ...value, openToRelocation: checked })}
            aria-label="Open to relocation"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Open to international relocation</p>
            <p className="text-muted-foreground text-xs">
              Beyond the countries selected above.
            </p>
          </div>
          <Switch
            checked={value.openToInternationalRelocation}
            onCheckedChange={(checked) =>
              onChange({ ...value, openToInternationalRelocation: checked })
            }
            aria-label="Open to international relocation"
          />
        </div>
      </div>
    </div>
  );
}
