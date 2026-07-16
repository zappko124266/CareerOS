# CareerOS — Architecture

This document describes the foundation the app is built on: folder
structure, auth model, database workflow, and the conventions to follow when
extending it. It intentionally contains no product features — see the root
`AGENTS.md` for the Next.js version notes that shaped some of the choices
below (e.g. `proxy.ts` instead of `middleware.ts`).

## Stack

- **Next.js 16** (App Router, React 19) — see `AGENTS.md`: this version
  renamed `middleware.ts` to `proxy.ts` and deprecated a few other
  conventions. Check `node_modules/next/dist/docs` before assuming
  training-data knowledge of an API still applies.
- **TypeScript**, strict mode.
- **Tailwind CSS v4** + **shadcn/ui** (`radix-nova` style) for the design system.
- **Prisma 7** ORM against **Supabase Postgres**, via the `@prisma/adapter-pg`
  driver adapter.
- **Supabase Auth** (`@supabase/ssr`) for authentication/session management.

## Folder structure

```
prisma/
  schema.prisma       # Data model (generator + models only — no connection URLs, see below)
  sql/                # Hand-written SQL not owned by Prisma Migrate (e.g. auth.users triggers)
  seed.ts             # `npm run db:seed`
src/
  app/
    (auth)/           # Public, unauthenticated route group — login, sign-up, etc.
    (app)/            # Authenticated route group — calls verifySession() in its layout
    auth/callback/    # Route Handler: exchanges Supabase's ?code= for a session
    layout.tsx        # Root layout: fonts, <AppProviders>
    page.tsx           # Marketing/landing page
  actions/            # Server Actions ("use server"), grouped by domain
  components/
    ui/               # shadcn/ui primitives — regenerate, don't hand-edit
    layout/           # App chrome: navbar, page containers, user menu
    shared/           # Small reusable pieces used across features
    providers/        # Client-side context providers (theme, tooltips, toaster)
    auth/             # Auth forms (Client Components wrapping Server Actions)
  config/             # Static app config (site metadata, nav)
  lib/
    auth/             # dal.ts (session/authorization) + dto.ts (safe shapes to send to clients)
    supabase/         # client.ts (browser), server.ts (RSC/actions), session.ts (Proxy), admin.ts
    validations/       # zod schemas, one file per domain
    prisma.ts          # Prisma client singleton (driver adapter wired up)
    env.server.ts / env.client.ts  # Validated environment access
    audit.ts           # Security-event audit log writer
  proxy.ts             # Optimistic session-refresh + redirect (formerly "middleware")
  types/               # Shared cross-cutting types (ActionResult, generated Supabase types)
  generated/prisma/    # Generated Prisma Client output — gitignored, never hand-edit
```

`src/` holds everything except `public/`, root config files, and `.env*` —
see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md`.

## Authentication & authorization

Three layers, from least to most trusted:

1. **`src/proxy.ts`** — runs on every non-static request, refreshes the
   Supabase session cookie, and redirects unauthenticated requests away from
   protected routes. This is a UX fast-path only. Route reorganizations or a
   Server Action reachable from an unmatched path can silently bypass it.
2. **`src/app/(app)/layout.tsx`** calls `verifySession()` — belt-and-suspenders
   for every page under the authenticated route group.
3. **`src/lib/auth/dal.ts`** (the Data Access Layer) is the actual source of
   truth. Call `verifySession()` / `verifyRole()` / `getCurrentUser()` again
   inside any Server Action or Route Handler that reads or mutates protected
   data — never assume an outer layout already checked. Wrapped in React's
   `cache()`, so calling it defensively multiple times per request is free.

Data returned from the DAL is shaped through `src/lib/auth/dto.ts` (a Data
Transfer Object) rather than passing Prisma's `Profile` model straight
through, so adding an internal-only column to the schema can't accidentally
leak to a Client Component.

**Sync with Supabase Auth**: `public.profiles` mirrors `auth.users` (which
Supabase owns and Prisma Migrate can't touch). `prisma/sql/001_handle_new_user.sql`
defines the trigger that keeps them in sync — apply it once per environment
with `npx prisma db execute --file prisma/sql/001_handle_new_user.sql --schema prisma/schema.prisma`
after running migrations.

**Password/email flows** all round-trip through `src/app/auth/callback/route.ts`,
which exchanges Supabase's `?code=` for a session and redirects to
`?redirectTo=`. Point Supabase's dashboard (Auth > URL Configuration) at this
route.

**Auditing**: call `logAuditEvent()` from `src/lib/audit.ts` after any
security-relevant event (auth, role changes, sensitive mutations). Rows are
append-only — never delete, only retain/rotate per your compliance needs.

## Database workflow

Prisma 7 removed connection URLs from `schema.prisma` — `prisma.config.ts` is
now the single place the CLI reads `DATABASE_URL`/`DIRECT_URL` from, and the
app builds its own runtime connection through a driver adapter
(`src/lib/prisma.ts`, using `@prisma/adapter-pg`). Two different connection
strings are used on purpose:

- `DATABASE_URL` — pooled (Supavisor/PgBouncer, port 6543). What the deployed
  app actually queries through.
- `DIRECT_URL` — direct (port 5432). What `prisma migrate`/`db push`/`studio`
  use; pooled/transaction-mode connections don't support the advisory locks
  and DDL that migrations need.

Common commands:

```bash
npm run db:migrate   # create + apply a migration in dev
npm run db:push      # push schema without a migration (prototyping only)
npm run db:studio    # browse data
npm run db:seed      # run prisma/seed.ts
```

## Environment configuration

`src/lib/env.server.ts` and `src/lib/env.client.ts` validate `process.env`
with zod at import time and throw with a readable message if something's
missing, instead of failing confusingly deep in a request. Server secrets go
in `env.server.ts` (guarded by the `server-only` package so a Client
Component can't accidentally import it); anything a Client Component needs
goes in `env.client.ts` and must be `NEXT_PUBLIC_*`.

Copy `.env.example` to `.env` and fill in real values — see that file for
where each one comes from in the Supabase dashboard.

## UI / design system

- `components.json` configures shadcn/ui (`radix-nova` style, CSS variables,
  `src/app/globals.css`). Add components with `npx shadcn@latest add <name>`
  rather than hand-writing primitives — it keeps them upgradable.
- Design tokens (`--background`, `--primary`, `--radius`, chart colors, etc.)
  live in `src/app/globals.css` as CSS variables, themed for light/dark via
  the `.dark` class. `next-themes` toggles the class; see
  `src/components/providers/theme-provider.tsx`.
- `src/components/ui` — generated primitives, don't hand-edit; re-run the
  CLI with `--overwrite` instead so future upgrades aren't fighting local edits.
- `src/components/shared` / `layout` — hand-written, reusable across
  features. Put anything feature-specific closer to the feature instead.

## Conventions

- **Server-only code** must import `"server-only"` at the top (already done
  in `lib/prisma.ts`, `lib/auth/*`, `lib/supabase/server.ts`, `lib/audit.ts`).
  It turns an accidental client-side import into a build error instead of a
  leaked secret.
- **Server Actions** live in `src/actions/<domain>.ts`, start with `"use server"`,
  validate `FormData` with a zod schema from `lib/validations/`, and return
  the shared `ActionResult` type (`src/types/action.ts`) for use with React's
  `useActionState`.
- **Path alias**: `@/*` → `src/*` (see `tsconfig.json`).
- **Formatting**: `npm run format` (Prettier + `prettier-plugin-tailwindcss`,
  which sorts class names — don't hand-order them).
- **Linting**: `npm run lint` (`eslint-config-next`).
- Prefer editing existing files/patterns over introducing a new one for the
  same concern (e.g. one Supabase server-client factory, one Prisma
  singleton) — see `CLAUDE.md`/`AGENTS.md` for the broader house rules this
  repo follows.
