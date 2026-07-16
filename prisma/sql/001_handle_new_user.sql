-- Keeps `public.profiles` in sync with Supabase-managed `auth.users`.
--
-- Prisma Migrate only owns tables in the `public` schema, so this file is not
-- part of the generated migration history. Apply it once per environment
-- after the `profiles` / `audit_logs` tables exist:
--
--   npx prisma db execute --file prisma/sql/001_handle_new_user.sql --schema prisma/schema.prisma
--
-- (or paste it into the Supabase SQL editor). It is idempotent and safe to
-- re-run.

-- 1. Create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Keep `profiles.email` in sync if the user changes their email in
--    Supabase Auth directly (rare, but keeps the mirror honest).
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- 3. Row Level Security. The app talks to Postgres through Prisma using the
--    `postgres` role (bypasses RLS) for trusted server-side code, but RLS is
--    enabled here as defense-in-depth in case a client ever queries these
--    tables directly through the Supabase client/PostgREST.
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Audit logs are viewable by owner" on public.audit_logs;
create policy "Audit logs are viewable by owner"
  on public.audit_logs for select
  using (auth.uid() = user_id);
