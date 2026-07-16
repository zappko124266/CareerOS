import "server-only";
import { z } from "zod";

/**
 * Validated server-side environment. Import this anywhere that needs a
 * secret or a server-only connection string — never from a Client
 * Component. Client-safe (`NEXT_PUBLIC_*`) variables live in `env.client.ts`.
 *
 * Fails fast with a readable error at startup instead of surfacing a
 * confusing runtime error deep in a request handler.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Pooled connection (Supavisor/PgBouncer) — used by the app at runtime.
  DATABASE_URL: z.url(),

  // Supabase project (server-side clients + the service role for privileged,
  // RLS-bypassing operations like the auth webhook/admin actions).
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid server environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error("Invalid server environment variables. See console output above.");
}

export const env = parsed.data;
