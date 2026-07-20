import { City, Country, State } from "country-state-city";

/**
 * Thin wrapper around `country-state-city` — the structured, maintained
 * geographic dataset behind Location Intelligence's Country → State → City
 * drill-down. Nothing here hardcodes a country, state, or city; every list
 * comes straight from the package's own dataset. Safe to call from both
 * Server and Client Components (it's pure static data, no I/O, no secrets).
 */

export interface CountryOption {
  name: string;
  isoCode: string;
  flag: string;
}

export interface StateOption {
  name: string;
  isoCode: string;
  countryCode: string;
}

export interface CityOption {
  name: string;
  countryCode: string;
  stateCode: string;
}

export function listCountries(): CountryOption[] {
  return Country.getAllCountries()
    .map((country) => ({
      name: country.name,
      isoCode: country.isoCode,
      flag: country.flag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listStates(countryCode: string): StateOption[] {
  return State.getStatesOfCountry(countryCode)
    .map((state) => ({
      name: state.name,
      isoCode: state.isoCode,
      countryCode: state.countryCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listCities(countryCode: string, stateCode: string): CityOption[] {
  return City.getCitiesOfState(countryCode, stateCode)
    .map((city) => ({
      name: city.name,
      countryCode: city.countryCode,
      stateCode: city.stateCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findCountry(countryCode: string): CountryOption | null {
  const country = Country.getCountryByCode(countryCode);
  return country ? { name: country.name, isoCode: country.isoCode, flag: country.flag } : null;
}

export function findState(countryCode: string, stateCode: string): StateOption | null {
  const state = State.getStateByCodeAndCountry(stateCode, countryCode);
  return state
    ? { name: state.name, isoCode: state.isoCode, countryCode: state.countryCode }
    : null;
}
