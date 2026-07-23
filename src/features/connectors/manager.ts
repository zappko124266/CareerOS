import "server-only";

import { CONNECTOR_CATALOG } from "@/features/discovery/connectors/catalog";
import { prisma } from "@/lib/prisma";
import type { AccountConnection, ConnectionProvider, ConnectionStatus } from "@/generated/prisma/client";

import { decryptToken, encryptToken } from "./crypto";
import { getConnector, listConnectors } from "./registry";
import type { ConnectorSourceSummary } from "./types";

/**
 * The Connection Manager — Sprint 6, item 6; hardened with real
 * encryption in Sprint 7. The first real query/service layer
 * `AccountConnection` (`prisma/schema.prisma`) has ever had. `getConnection`/
 * `listConnections` return **decrypted** tokens and are internal/server-only
 * — used by a connector's own `refresh()` call, never passed to a Client
 * Component. `listConnectionSummaries` is the token-free DTO anything
 * UI-facing should use instead.
 */
export async function getConnection(userId: string, provider: ConnectionProvider): Promise<AccountConnection | null> {
  const connection = await prisma.accountConnection.findUnique({ where: { userId_provider: { userId, provider } } });
  return connection ? decryptConnection(connection) : null;
}

export async function listConnections(userId: string): Promise<AccountConnection[]> {
  const connections = await prisma.accountConnection.findMany({ where: { userId } });
  return connections.map(decryptConnection);
}

function decryptConnection(connection: AccountConnection): AccountConnection {
  return {
    ...connection,
    accessToken: connection.accessToken ? decryptToken(connection.accessToken) : null,
    refreshToken: connection.refreshToken ? decryptToken(connection.refreshToken) : null,
  };
}

/** Real state transition — writes only what a completed `login()`/
 * `refresh()` call actually returned. Encrypts `accessToken`/`refreshToken`
 * (`crypto.ts`, AES-256-GCM) before they ever reach the database. */
export async function upsertConnectionState(
  userId: string,
  provider: ConnectionProvider,
  state: {
    status: ConnectionStatus;
    accessToken?: string | null;
    refreshToken?: string | null;
    scopes?: string[];
    expiresAt?: Date | null;
    lastError?: string | null;
    externalAccountEmail?: string | null;
    externalAccountName?: string | null;
  },
): Promise<AccountConnection> {
  const encrypted = {
    ...state,
    accessToken: state.accessToken ? encryptToken(state.accessToken) : state.accessToken,
    refreshToken: state.refreshToken ? encryptToken(state.refreshToken) : state.refreshToken,
  };

  const connection = await prisma.accountConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...encrypted },
    update: { ...encrypted, lastSyncedAt: new Date() },
  });

  return decryptConnection(connection);
}

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

export type ValidAccessTokenResult =
  | { status: "OK"; accessToken: string }
  | { status: "NOT_CONNECTED" }
  | { status: "REFRESH_FAILED"; error: string };

/**
 * Sprint 16 — the first real consumer of a connector's *own* API beyond
 * the login/identity exchange (Gmail Intelligence). No prior feature
 * needed a live, guaranteed-fresh access token after the initial
 * connect, so this didn't exist yet. Returns the connection's current
 * `accessToken` unchanged when it isn't near expiry; otherwise calls the
 * connector's own real `refresh()` (`JobConnector.refresh`, e.g.
 * `connectors/google/oauth.ts`'s `refreshAccessToken`) and persists the
 * result via `upsertConnectionState` before returning it — every caller
 * gets a token good for immediate use, never a stale one.
 *
 * A refresh failure (expired/revoked refresh token, provider error)
 * writes a real `EXPIRED` status with `lastError` set, which is exactly
 * what `listConnectionSummaries` already exposes and what the Autonomous
 * Career Agent's `WAITING_FOR_CONNECTOR` status (`features/autonomous-agent/status.ts`)
 * already watches for — a broken Gmail sync surfaces as "reconnect your
 * Google account" with no new plumbing on that side.
 */
export async function getValidAccessToken(userId: string, provider: ConnectionProvider): Promise<ValidAccessTokenResult> {
  const connection = await getConnection(userId, provider);
  if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
    return { status: "NOT_CONNECTED" };
  }

  const isNearExpiry =
    connection.expiresAt !== null && connection.expiresAt.getTime() - ACCESS_TOKEN_REFRESH_BUFFER_MS <= Date.now();
  if (!isNearExpiry) {
    return { status: "OK", accessToken: connection.accessToken };
  }

  const connector = getConnector(provider.toLowerCase());
  if (!connector || !connection.refreshToken) {
    const error = "Access token expired and no refresh token is on file — reconnect required.";
    await upsertConnectionState(userId, provider, { status: "EXPIRED", lastError: error });
    return { status: "REFRESH_FAILED", error };
  }

  const result = await connector.refresh({
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt,
  });

  if (result.status !== "CONNECTED" || !result.accessToken) {
    const error = result.error ?? "Token refresh failed — reconnect required.";
    await upsertConnectionState(userId, provider, { status: "EXPIRED", lastError: error });
    return { status: "REFRESH_FAILED", error };
  }

  await upsertConnectionState(userId, provider, {
    status: "CONNECTED",
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? connection.refreshToken,
    expiresAt: result.expiresAt ?? null,
    lastError: null,
  });

  return { status: "OK", accessToken: result.accessToken };
}

/** Clears a connection back to its unconnected state — used by
 * `disconnectConnectorAction` after a (best-effort) token revocation. */
export async function clearConnection(userId: string, provider: ConnectionProvider): Promise<void> {
  await prisma.accountConnection.updateMany({
    where: { userId, provider },
    data: {
      status: "NOT_AVAILABLE",
      accessToken: null,
      refreshToken: null,
      scopes: [],
      expiresAt: null,
      externalAccountEmail: null,
      externalAccountName: null,
    },
  });
}

/** Token-free DTO — the only shape a Server Component/page should ever
 * read. `accessToken`/`refreshToken` never appear here, structurally
 * (not just by convention), satisfying "never expose refresh tokens." */
export interface ConnectionSummary {
  provider: ConnectionProvider;
  status: ConnectionStatus;
  externalAccountEmail: string | null;
  externalAccountName: string | null;
  scopes: string[];
  lastSyncedAt: Date | null;
  lastError: string | null;
}

export async function listConnectionSummaries(userId: string): Promise<ConnectionSummary[]> {
  const connections = await prisma.accountConnection.findMany({ where: { userId } });
  return connections.map((connection) => ({
    provider: connection.provider,
    status: connection.status,
    externalAccountEmail: connection.externalAccountEmail,
    externalAccountName: connection.externalAccountName,
    scopes: connection.scopes as string[],
    lastSyncedAt: connection.lastSyncedAt,
    lastError: connection.lastError,
  }));
}

/** Bridges the catalog's lowercase ids (`"linkedin"`) to `AccountConnection`'s
 * uppercase `ConnectionProvider` enum, for the subset of catalog entries
 * that enum currently covers. Catalog entries with no entry here simply
 * can never reach `CONNECTED`/`PENDING` — honest: no way to track them
 * exists yet, not a bug. */
const CATALOG_ID_TO_PROVIDER: Partial<Record<string, ConnectionProvider>> = {
  linkedin: "LINKEDIN",
  naukri: "NAUKRI",
  indeed: "INDEED",
  foundit: "FOUNDIT",
  wellfound: "WELLFOUND",
  apna: "APNA",
  internshala: "INTERNSHALA",
};

/**
 * Dashboard integration — Sprint 6, item 7: "Show connected sources, show
 * supported sources, show unavailable sources," from real data only.
 * Merges the existing Connector Marketplace catalog
 * (`features/discovery/connectors/catalog.ts`, imported not copied) with
 * real per-user `AccountConnection` rows and the new (currently empty for
 * job-portal search) `JobConnector` registry. Registering one future
 * connector for a catalog id automatically promotes it from `UNAVAILABLE`
 * to `SUPPORTED` here with no changes to this function or its caller.
 *
 * Note: Google (Sprint 7) has no entry in `CONNECTOR_CATALOG` — that
 * catalog is specifically job-search portals, and Google isn't one (no
 * job search capability, by design — see the Google connector's own doc
 * comments). Google's connection state is shown separately on the
 * connections page via `listConnectionSummaries`, not through this list.
 */
export async function listConnectorSources(userId: string): Promise<ConnectorSourceSummary[]> {
  const [connections, registeredConnectors] = await Promise.all([
    listConnections(userId),
    Promise.resolve(listConnectors()),
  ]);

  const connectionByProvider = new Map(connections.map((connection) => [connection.provider, connection]));
  const registeredIds = new Set(registeredConnectors.map((connector) => connector.id));

  return CONNECTOR_CATALOG.map((entry): ConnectorSourceSummary => {
    const provider = CATALOG_ID_TO_PROVIDER[entry.id];
    const connection = provider ? connectionByProvider.get(provider) : undefined;

    if (connection?.status === "CONNECTED") {
      return { id: entry.id, name: entry.name, state: "CONNECTED", reason: null };
    }

    if (entry.hasLiveSearch || registeredIds.has(entry.id)) {
      return { id: entry.id, name: entry.name, state: "SUPPORTED", reason: null };
    }

    return {
      id: entry.id,
      name: entry.name,
      state: "UNAVAILABLE",
      reason: entry.unavailableReason ?? null,
    };
  });
}
