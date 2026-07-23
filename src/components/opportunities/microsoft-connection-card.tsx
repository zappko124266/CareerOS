import { AccountConnectionCard, type AccountConnectionCapabilityRow } from "./account-connection-card";
import type { ConnectionSummary } from "@/features/connectors/manager";

/**
 * The Connection Dashboard's Microsoft detail card (Sprint 14) — same
 * role as `GoogleConnectionCard`, reusing the same generic
 * `AccountConnectionCard` layout. Only the capability rows differ:
 * Microsoft's connector requests `Mail.Read`/`Calendars.Read` instead of
 * Gmail/Calendar, and is labeled "Outlook Mail" rather than "Gmail" to
 * match what the user actually granted. `summary` is the same token-free
 * `ConnectionSummary` DTO Google's card uses.
 */
export function MicrosoftConnectionCard({ summary }: { summary: ConnectionSummary }) {
  const capabilityRows: AccountConnectionCapabilityRow[] = [
    { label: "Jobs", granted: "unsupported" },
    { label: "Calendar", granted: summary.scopes.some((scope) => scope.toLowerCase().includes("calendars")) },
    { label: "Outlook Mail", granted: summary.scopes.some((scope) => scope.toLowerCase().includes("mail")) },
  ];

  return (
    <AccountConnectionCard
      provider="MICROSOFT"
      providerLabel="Microsoft"
      authorizeHref="/api/connectors/microsoft/authorize"
      summary={summary}
      capabilityRows={capabilityRows}
    />
  );
}
