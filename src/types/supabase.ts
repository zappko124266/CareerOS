/**
 * Placeholder for Supabase's generated database types.
 *
 * Once the project is linked, regenerate with:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > src/types/supabase.ts
 *
 * Application data lives behind Prisma (see `prisma/schema.prisma` and
 * `src/generated/prisma`), so this type only needs to model what the
 * Supabase client itself touches directly — currently just `auth`, which
 * Supabase already types internally. Extend the `public` schema below if a
 * Supabase-side table is ever queried through `@supabase/supabase-js`
 * instead of Prisma.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
