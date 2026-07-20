-- Backfills `public.profiles` for any `auth.users` row that doesn't have
-- one yet — accounts created before `001_handle_new_user.sql`'s trigger
-- was installed (or created through any other path that bypassed it).
--
-- Not part of the generated migration history (same reasoning as
-- 001/002 — this touches `auth.users`, which Prisma Migrate doesn't own).
-- Safe to run once per environment, and safe to re-run any number of
-- times after that:
--
--   npx prisma db execute --file prisma/sql/003_backfill_profiles.sql
--
-- (or paste it into the Supabase SQL editor.)
--
-- Idempotent by construction, two ways at once:
--   1. The `where not exists (...)` clause only selects `auth.users` rows
--      that don't already have a matching `public.profiles` row, so a
--      second run has nothing left to insert.
--   2. `on conflict (id) do nothing` is a backstop against the same race
--      the trigger already guards against (e.g. a signup completing
--      between this script's SELECT and INSERT) — belt and suspenders,
--      not load-bearing on its own.
insert into public.profiles (id, email, full_name, avatar_url, updated_at)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'avatar_url',
  now()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;
