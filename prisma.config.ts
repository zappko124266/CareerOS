import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
