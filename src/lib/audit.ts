import "server-only";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "auth.sign_up"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.password_reset_requested"
  | "auth.password_updated";

/**
 * Appends a row to `audit_logs`. Call this from Server Actions and Route
 * Handlers after auth or other security-relevant events — never from a
 * Client Component. See `docs/ARCHITECTURE.md#auditing`.
 */
export async function logAuditEvent(
  action: AuditAction,
  options: { userId?: string | null; metadata?: Record<string, unknown> } = {},
) {
  const headerList = await headers();

  await prisma.auditLog.create({
    data: {
      userId: options.userId ?? null,
      action,
      metadata: options.metadata,
      ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: headerList.get("user-agent") ?? undefined,
    },
  });
}
