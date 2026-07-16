import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env.server";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // Runtime queries go through Supabase's pooled connection (Supavisor /
  // PgBouncer, port 6543). Migrations use `DIRECT_URL` instead — see
  // `prisma.config.ts`.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Singleton Prisma client. In dev, Next.js's Fast Refresh re-evaluates
 * modules on every edit; caching the client on `globalThis` avoids
 * exhausting the database connection pool.
 */
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
