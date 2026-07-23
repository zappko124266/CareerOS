"use server";

import { revalidatePath } from "next/cache";

import { clearConnection, getConnection } from "@/features/connectors/manager";
import { getConnector } from "@/features/connectors/registry";
import { verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { ConnectionProvider } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

/**
 * Disconnects a connector — best-effort revokes the token at the
 * provider (`connector.disconnect`, real HTTP call, e.g. Google's
 * `/revoke` endpoint), then always clears the local `AccountConnection`
 * row via the Connection Manager regardless of whether the revoke call
 * succeeded, so the user is never stuck "connected" locally just because
 * the provider's revoke endpoint had a transient failure.
 */
export async function disconnectConnectorAction(
  provider: ConnectionProvider,
): Promise<DataActionResult<{ disconnected: true }>> {
  const user = await verifySession();

  try {
    const connection = await getConnection(user.id, provider);
    const connector = getConnector(provider.toLowerCase());

    if (connection && connector) {
      try {
        await connector.disconnect({
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
        });
      } catch (error) {
        logger.error("connectors.disconnect_revoke_failed", {
          userId: user.id,
          provider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await clearConnection(user.id, provider);
    await logAuditEvent("connector.disconnected", { userId: user.id, metadata: { provider } });
    revalidatePath("/opportunities/connections");

    return { status: "success", data: { disconnected: true } };
  } catch (error) {
    logger.error("connectors.disconnect_failed", {
      userId: user.id,
      provider,
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "We couldn't disconnect that account. Please try again." };
  }
}
