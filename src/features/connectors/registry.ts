import { googleConnector } from "./connectors/google/connector";
import { microsoftConnector } from "./connectors/microsoft/connector";
import type { ConnectorCapabilities, JobConnector } from "./contracts";

/**
 * The Connector Registry — Sprint 6, item 3. Same exact shape as
 * `features/opportunities/providers/registry.ts`'s `PROVIDER_REGISTRY`
 * (a plain lookup object + accessor functions, no switch statements): to
 * add a real connector, implement `JobConnector` in `connectors/<name>.ts`
 * and add one line here — nothing that discovers connectors through this
 * registry needs to change.
 *
 * `google` (Sprint 7) and `microsoft` (Sprint 14) are the two real
 * entries so far — identity/Calendar/Mail only, no job search (see each
 * connector's own `jobs.ts`), so neither appears in
 * `listConnectorsWithCapability("supportsEasyApply")` results or
 * anything discovering search/apply-capable connectors. This is where a
 * future Automation Engine task (`features/automation/`) would discover
 * connectors by capability, with zero changes needed to
 * `automation/engine.ts`/`executor.ts`/`scheduler.ts` once such a task
 * exists.
 */
const JOB_CONNECTOR_REGISTRY: Record<string, JobConnector> = {
  google: googleConnector,
  microsoft: microsoftConnector,
};

export function getConnector(id: string): JobConnector | undefined {
  return JOB_CONNECTOR_REGISTRY[id];
}

export function listConnectors(): JobConnector[] {
  return Object.values(JOB_CONNECTOR_REGISTRY);
}

export function listConnectorsWithCapability(capability: keyof ConnectorCapabilities): JobConnector[] {
  return listConnectors().filter((connector) => Boolean(connector.capabilities[capability]));
}
