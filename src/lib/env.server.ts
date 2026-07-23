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

  // AI Router — see src/lib/ai/router.ts. The only AI system in this app;
  // every feature calls generateText/generateObject/streamText from
  // "@/lib/ai", which resolves to whichever provider AI_PROVIDER selects.
  // All fields are optional at the schema level so `next build`/module
  // load never fails on their own — router.ts throws a typed error at call
  // time if AI_PROVIDER or the selected provider's key is missing.
  AI_PROVIDER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["nvidia", "groq", "gemini", "openrouter"]).optional(),
  ),
  NVIDIA_API_KEY: optionalString,
  GROQ_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,

  // Opportunity providers — see src/features/opportunities/providers. Each
  // adapter's `isConfigured()` checks its own key(s) at call time; the UI
  // shows an educational empty state for any unconfigured provider instead
  // of failing. Arbeitnow and RemoteOK need no key (public APIs) and so
  // have no entry here.
  ADZUNA_APP_ID: optionalString,
  ADZUNA_APP_KEY: optionalString,
  JOOBLE_API_KEY: optionalString,
  // USAJobs requires both a free API key and a registered contact email
  // sent as the `User-Agent` header — see https://developer.usajobs.gov.
  USAJOBS_API_KEY: optionalString,
  USAJOBS_USER_AGENT: optionalString,
  REED_API_KEY: optionalString,
  // Comma-separated Greenhouse/Lever company board tokens to search —
  // neither platform exposes a directory of "every company hosted here",
  // so this is the operator-configurable seed list (falls back to a small
  // set of real, publicly known boards if unset, so the connector works
  // out of the box; extend via env, not a code change).
  GREENHOUSE_BOARD_TOKENS: optionalString,
  LEVER_COMPANY_TOKENS: optionalString,

  // Verifies requests to /api/cron/discovery actually came from Vercel
  // Cron (or a trusted manual trigger), not the public internet — Vercel
  // sends this as `Authorization: Bearer <value>` on scheduled invocations.
  // See https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
  CRON_SECRET: optionalString,

  // Google Connector — see src/features/connectors/connectors/google.
  // Google Cloud Console > APIs & Services > Credentials > OAuth client ID
  // (Web application), redirect URI `<NEXT_PUBLIC_APP_URL>/api/connectors/google/callback`.
  // `googleConnector.isConfigured()` reports unconfigured (not an error)
  // when either is unset, same convention as every opportunity provider.
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // Microsoft Connector (Sprint 14) — see
  // src/features/connectors/connectors/microsoft. Microsoft Entra ID
  // (Azure AD) app registration > Certificates & secrets. Redirect URI
  // `<NEXT_PUBLIC_APP_URL>/api/connectors/microsoft/callback`.
  // `microsoftConnector.isConfigured()` reports unconfigured (not an
  // error) when any of the three is unset, same convention as Google.
  MICROSOFT_CLIENT_ID: optionalString,
  MICROSOFT_CLIENT_SECRET: optionalString,
  // The Azure AD tenant to authorize against — a GUID, or "common" (both
  // personal and work/school Microsoft accounts), "organizations"
  // (work/school only), or "consumers" (personal only). Required
  // alongside the two above; there's no safe default to fall back to.
  MICROSOFT_TENANT_ID: optionalString,

  // Encrypts/decrypts connector OAuth tokens at rest
  // (src/features/connectors/crypto.ts) — a random 32-byte key,
  // base64-encoded (e.g. `openssl rand -base64 32`). Required before any
  // connector's `login()`/`refresh()` can persist a real token (Google
  // and Microsoft both depend on this one key — not a per-connector key);
  // optional at this schema level so `next build` never fails on its own,
  // same as `AI_PROVIDER`'s keys.
  CONNECTOR_TOKEN_ENCRYPTION_KEY: optionalString,
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
