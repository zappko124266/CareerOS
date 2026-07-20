import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// `dotenv/config`'s default import only loads `.env` — it does not know
// about Next.js's `.env.local` convention. Load both explicitly, with
// `.env.local` taking precedence (matching how Next.js itself layers env
// files), so the CLI sees the same DATABASE_URL/DIRECT_URL the app does.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

// The CLI (migrate, db push, studio) always connects directly — never
// through Supabase's connection pooler — since Migrate needs advisory locks
// and DDL support that pooled/transaction-mode connections don't provide.
// The app's own runtime connection (pooled, via a driver adapter) is
// configured separately in `src/lib/prisma.ts` and reads `DATABASE_URL`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
