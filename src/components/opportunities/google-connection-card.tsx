import { AccountConnectionCard, type AccountConnectionCapabilityRow } from "./account-connection-card";
import type { ConnectionSummary } from "@/features/connectors/manager";

/**
 * The Connection Dashboard's Google detail card — Sprint 7, item 4:
 * Identity, Jobs, Calendar, Gmail, Last Sync, Reconnect, Disconnect.
 * Sprint 14 extracted the actual card layout into the generic
 * `AccountConnectionCard` (reused by Microsoft's equivalent wrapper); this
 * file now only computes Google's own capability rows from its real
 * granted scopes. All real: `summary` comes straight from
 * `listConnectionSummaries` (`features/connectors/manager.ts`), a
 * token-free DTO, so this never sees an access/refresh token.
 */
export function GoogleConnectionCard({ summary }: { summary: ConnectionSummary }) {
  const capabilityRows: AccountConnectionCapabilityRow[] = [
    { label: "Jobs", granted: "unsupported" },
    { label: "Calendar", granted: summary.scopes.some((scope) => scope.includes("calendar")) },
    { label: "Gmail", granted: summary.scopes.some((scope) => scope.includes("gmail")) },
  ];

  return (
    <AccountConnectionCard
      provider="GOOGLE"
      providerLabel="Google"
      authorizeHref="/api/connectors/google/authorize"
      summary={summary}
      capabilityRows={capabilityRows}
    />
  );
}
