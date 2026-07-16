import "server-only";
import { z } from "zod";

// `KEY=` with nothing after the `=` parses as `""`, not "unset" — treat it
// as unset so leaving an unused provider's key blank in `.env.local` (rather
// than deleting the line) doesn't fail validation for the whole app.
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * Validated server-side environment. Import this anywhere that needs a
 * secret or a server-only connection string — never from a Client
 * Component. Client-safe (`NEXT_PUBLIC_*`) variables live in `env.client.ts`.
 *
 * Fails fast with a readable error at startup instead of surfacing a
 * confusing runtime error deep in a request handler.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Pooled connection (Supavisor/PgBouncer) — used by the app at runtime.
  DATABASE_URL: z.url(),

  // Supabase project (server-side clients + the service role for privileged,
  // RLS-bypassing operations like the auth webhook/admin actions).
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Vercel AI Gateway — see src/lib/ai/client.ts. All LLM calls route
  // through the Gateway so swapping providers/models is a string change.
  AI_GATEWAY_API_KEY: z.string().min(1),

  // AI Router — see src/lib/ai/router.ts. A separate, direct-provider
  // routing layer alongside the Gateway-based client above (not a
  // replacement for it — existing callers of src/lib/ai/client.ts are
  // unaffected). All fields are optional so environments that don't use
  // the router keep working unchanged; router.ts throws a typed error at
  // call time if AI_PROVIDER or the selected provider's key is missing.
  AI_PROVIDER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["nvidia", "groq", "gemini", "openrouter"]).optional(),
  ),
  NVIDIA_API_KEY: optionalString,
  GROQ_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid server environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error(
    "Invalid server environment variables. See console output above.",
  );
}

export const env = parsed.data;
