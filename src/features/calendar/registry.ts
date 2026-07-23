import { googleCalendarProvider } from "./providers/google";
import { microsoftCalendarProvider } from "./providers/microsoft";
import type { CalendarProviderAdapter } from "./contracts";

/**
 * The Universal Calendar Provider Registry — Step 3. Exact same shape as
 * every other registry in this codebase (`features/connectors/registry.ts`'s
 * `JOB_CONNECTOR_REGISTRY`, `features/opportunities/providers/registry.ts`'s
 * `PROVIDER_REGISTRY`, `features/automation/registry.ts`'s
 * `AUTOMATION_TASKS`): a plain lookup object plus accessor functions, no
 * switch statement anywhere. Adding a future calendar provider means
 * implementing `CalendarProviderAdapter` in `providers/<name>.ts` and
 * adding one line here — nothing that discovers providers through this
 * registry needs to change (Hard Lock 9).
 */
const CALENDAR_PROVIDER_REGISTRY: Record<string, CalendarProviderAdapter> = {
  google: googleCalendarProvider,
  microsoft: microsoftCalendarProvider,
};

export function getCalendarProvider(id: string): CalendarProviderAdapter | undefined {
  return CALENDAR_PROVIDER_REGISTRY[id];
}

export function listCalendarProviders(): CalendarProviderAdapter[] {
  return Object.values(CALENDAR_PROVIDER_REGISTRY);
}

export function listConfiguredCalendarProviders(): CalendarProviderAdapter[] {
  return listCalendarProviders().filter((provider) => provider.isConfigured());
}
