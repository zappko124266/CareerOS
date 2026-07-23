import "server-only";

import type { JobConnector } from "@/features/connectors/contracts";
import { getConnection, getValidAccessToken } from "@/features/connectors/manager";
import { getConnector, listConnectorsWithCapability } from "@/features/connectors/registry";
import { DB_SOURCE_TO_PROVIDER } from "@/features/opportunities/types";
import type { AccountConnection, ConnectionProvider, Opportunity } from "@/generated/prisma/client";

/**
 * Centralizes every "can a connector actually do this" check for the
 * Application Engine (Sprint 9, requirement 4) — the Decision Engine and
 * Orchestrator both call this instead of re-deriving connector
 * eligibility themselves.
 *
 * Bridges the Connector Registry's lowercase ids (e.g. `"google"`) to
 * `AccountConnection`'s uppercase `ConnectionProvider` enum — a separate,
 * small mapping from `manager.ts`'s `CATALOG_ID_TO_PROVIDER` (that one
 * keys off the job-*portal* catalog, `features/discovery/connectors/catalog.ts`,
 * which Google isn't part of at all — Google has no job-search
 * capability, see `connectors/connectors/google/jobs.ts`). This map keys
 * off the Connector *Registry* instead, the thing that actually matters
 * for "can this specific connector submit an application."
 */
const CONNECTOR_ID_TO_PROVIDER: Partial<Record<string, ConnectionProvider>> = {
  google: "GOOGLE",
};

/** Every registered connector capable of Easy Apply. Empty today — no
 * connector implements it yet (Sprint 7's Google connector explicitly
 * sets `supportsEasyApply: false`, having no job-search capability at
 * all to apply from). Real the moment one is registered. */
export function getEasyApplyConnectors(): JobConnector[] {
  return listConnectorsWithCapability("supportsEasyApply");
}

/**
 * The one real check: is there a connector, actually connected for this
 * user, that both (a) supports Easy Apply and (b) is the connector for
 * this specific opportunity's source? Returns `null` — never a
 * fabricated match — when no such connector exists, which is the only
 * possible outcome today.
 */
export async function getUsableConnectorForOpportunity(
  opportunity: Opportunity,
  userId: string,
): Promise<{ connector: JobConnector; connection: AccountConnection } | null> {
  const connectorId = DB_SOURCE_TO_PROVIDER[opportunity.source];
  if (!connectorId) return null;

  const easyApplyConnectors = getEasyApplyConnectors();
  const connector = easyApplyConnectors.find((candidate) => candidate.id === connectorId);
  if (!connector) return null;

  const provider = CONNECTOR_ID_TO_PROVIDER[connector.id];
  if (!provider) return null;

  const connection = await getConnection(userId, provider);
  if (connection?.status !== "CONNECTED") return null;

  return { connector, connection };
}

export interface ConnectorCapabilityValidation {
  ok: boolean;
  connector: JobConnector | null;
  connection: AccountConnection | null;
  reasons: string[];
}

/**
 * Sprint 18's full Connector Capability Check — every check the mission
 * lists, in order, any of which can fail the validation: registered →
 * `supportsEasyApply` → account connected → *actually* authenticated
 * (a real `getValidAccessToken` call, not just trusting the stored
 * `status` column — a token can expire between syncs) →
 * `supportsResumeUpload` → `supportsQuestionnaire`, only checked when
 * `needsQuestionnaire` is true (an opportunity with no custom questions
 * doesn't need this capability at all). Returns the specific `reasons`
 * either way — used verbatim as `ApplicationExecution.executionReason`
 * so "why did this stop here" is always visible, never a bare boolean.
 */
export async function validateConnectorCapabilities(
  opportunity: Opportunity,
  userId: string,
  options: { needsQuestionnaire: boolean },
): Promise<ConnectorCapabilityValidation> {
  const connectorId = DB_SOURCE_TO_PROVIDER[opportunity.source];
  if (!connectorId) {
    return { ok: false, connector: null, connection: null, reasons: ["No connector is registered for this opportunity's source."] };
  }

  const connector = getConnector(connectorId);
  if (!connector) {
    return { ok: false, connector: null, connection: null, reasons: [`No connector registered for "${connectorId}".`] };
  }

  if (!connector.capabilities.supportsEasyApply) {
    return { ok: false, connector, connection: null, reasons: [`${connector.name} doesn't support Easy Apply.`] };
  }

  const provider = CONNECTOR_ID_TO_PROVIDER[connector.id];
  if (!provider) {
    return {
      ok: false,
      connector,
      connection: null,
      reasons: [`${connector.name} has no linked account-connection provider.`],
    };
  }

  const connection = await getConnection(userId, provider);
  if (connection?.status !== "CONNECTED") {
    return { ok: false, connector, connection: null, reasons: [`${connector.name} isn't connected.`] };
  }

  const tokenResult = await getValidAccessToken(userId, provider);
  if (tokenResult.status !== "OK") {
    return {
      ok: false,
      connector,
      connection,
      reasons: [`${connector.name}'s connection needs to be reconnected before it can apply.`],
    };
  }

  if (!connector.capabilities.supportsResumeUpload) {
    return { ok: false, connector, connection, reasons: [`${connector.name} doesn't support resume upload.`] };
  }

  if (options.needsQuestionnaire && !connector.capabilities.supportsQuestionnaire) {
    return {
      ok: false,
      connector,
      connection,
      reasons: [`${connector.name} doesn't support questionnaire responses, which this application needs.`],
    };
  }

  return {
    ok: true,
    connector,
    connection,
    reasons: [`${connector.name} is connected, authenticated, and supports everything this application needs.`],
  };
}
