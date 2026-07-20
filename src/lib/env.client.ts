import { z } from "zod";

/**
 * Validated `NEXT_PUBLIC_*` environment variables. Safe to import from
 * Client Components — do not add secrets here, only values Next.js already
 * inlines into the browser bundle.
 */
// `NEXT_PUBLIC_*` vars are inlined at build time, not read at runtime — a
// silent localhost fallback in production would ship broken auth email
// links with no warning. In production this var is required (missing/
// invalid fails the parse below, so the app fails fast at build/boot
// instead); only development gets a localhost default.
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL:
    process.env.NODE_ENV === "production"
      ? z.url()
      : z.url().default("http://localhost:3000"),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  console.error(
    "❌ Invalid client environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error(
    "Invalid client environment variables. See console output above.",
  );
}

export const clientEnv = parsed.data;
