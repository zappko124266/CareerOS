# CareerOS — Architecture

This document describes the foundation the app is built on: folder
structure, auth model, database workflow, and the conventions to follow when
extending it. See the root `AGENTS.md` for the Next.js version notes that
shaped some of the choices below (e.g. `proxy.ts` instead of `middleware.ts`).

CareerOS's product scope is large (resume tooling, job matching, tailored
generation, LinkedIn optimization, outreach, application tracking, interview
prep). Features are built one complete vertical slice at a time rather than
in parallel — **Resume pipeline** (upload → parse → ATS score → optimize) is
the first one; see below. Auto-apply / browser-driven form filling is
deliberately out of scope until specific target ATS platforms and a
human-in-the-loop approval model are decided — never build it as a fully
autonomous submit.

## Stack

- **Next.js 16** (App Router, React 19) — see `AGENTS.md`: this version
  renamed `middleware.ts` to `proxy.ts` and deprecated a few other
  conventions. Check `node_modules/next/dist/docs` before assuming
  training-data knowledge of an API still applies.
- **TypeScript**, strict mode.
- **Tailwind CSS v4** + **shadcn/ui** (`radix-nova` style) for the design system.
- **Prisma 7** ORM against **Supabase Postgres**, via the `@prisma/adapter-pg`
  driver adapter.
- **Supabase Auth** (`@supabase/ssr`) for authentication/session management,
  **Supabase Storage** for user file uploads (resumes).
- **Vercel AI SDK** (`ai`) for all LLM calls, through two parallel systems —
  the Gateway-based `src/lib/ai/client.ts` (see "AI provider abstraction")
  and the direct-provider `src/lib/ai/router.ts` (see "AI Router") — both
  described below.

## Folder structure

```
prisma/
  schema.prisma       # Data model (generator + models only — no connection URLs, see below)
  sql/                # Hand-written SQL not owned by Prisma Migrate (e.g. auth.users triggers, Storage RLS)
  seed.ts             # `npm run db:seed`
src/
  app/
    (auth)/           # Public, unauthenticated route group — login, sign-up, etc.
    (app)/            # Authenticated route group — calls verifySession() in its layout
      resume/         # Resume list + detail pages
    auth/callback/    # Route Handler: exchanges Supabase's ?code= for a session
    layout.tsx        # Root layout: fonts, <AppProviders>
    page.tsx           # Marketing/landing page
  actions/            # Server Actions ("use server"), one file per domain — thin glue only
  features/           # Framework-agnostic business logic, one folder per domain (see below)
    resume/
  components/
    ui/               # shadcn/ui primitives — regenerate, don't hand-edit
    layout/           # App chrome: navbar, page containers, user menu
    shared/           # Small reusable pieces used across features
    providers/        # Client-side context providers (theme, tooltips, toaster)
    auth/             # Auth forms (Client Components wrapping Server Actions)
    resume/           # Resume feature's UI components
  config/             # Static app config (site metadata, nav)
  lib/
    auth/             # dal.ts (session/authorization) + dto.ts (safe shapes to send to clients)
    supabase/         # client.ts (browser), server.ts (RSC/actions), session.ts (Proxy), admin.ts
    storage/          # Supabase Storage helpers, one file per bucket
    files/            # File-format utilities (PDF/DOCX text extraction)
    ai/               # Two parallel LLM systems — see "AI provider abstraction" and "AI Router" below
      client.ts       # Gateway-based helpers (generateStructured, generatePlainText) — used by Resume pipeline
      models.ts       # Gateway model id constants
      types.ts        # AI Router: provider interface, typed errors, option/result types
      router.ts       # AI Router: AI_PROVIDER → provider registry/resolution
      index.ts        # AI Router: public generateText/generateObject/streamText API
      providers/      # AI Router: one file per direct provider (nvidia, groq, gemini, openrouter)
    validations/       # zod schemas, one file per domain
    prisma.ts          # Prisma client singleton (driver adapter wired up)
    env.server.ts / env.client.ts  # Validated environment access
    audit.ts           # Security-event audit log writer
    logger.ts           # Structured logging facade
    errors.ts            # AppError + subclasses for expected, user-facing errors
  proxy.ts             # Optimistic session-refresh + redirect (formerly "middleware")
  types/               # Shared cross-cutting types (ActionResult, generated Supabase types)
  generated/prisma/    # Generated Prisma Client output — gitignored, never hand-edit
```

`src/` holds everything except `public/`, root config files, and `.env*` —
see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md`.

## Feature modules

Each domain (`resume`, and future ones like `jobs`, `cover-letters`,
`outreach`, `interview-prep`) is split across three layers:

- **`src/features/<domain>/`** — framework-agnostic business logic. No
  Next.js imports (no `redirect`, no `revalidatePath`). `schema.ts` (zod
  schemas + inferred types), `prompts.ts` (AI prompt templates, if the
  domain uses AI), `service.ts` (the actual logic — orchestrates Storage/AI/
  Prisma), `queries.ts` (Prisma reads scoped to that domain, plus an
  ownership-check helper that throws `NotFoundError`/`ForbiddenError`).
- **`src/actions/<domain>.ts`** — Next.js Server Action glue: `"use server"`,
  call `verifySession()` first, validate `FormData`, call the feature
  service, map thrown `AppError`s to a user-safe `ActionResult`, `redirect`/
  `revalidatePath` as needed. Keep this thin — business logic belongs in
  `features/`, not here.
- **`src/app/(app)/<domain>/`** + **`src/components/<domain>/`** — routing
  and presentation, calling the DAL and Server Actions above.

`src/features/resume/` is the reference implementation of this pattern.

## AI provider abstraction (Gateway-based — `client.ts`)

Used today by the Resume pipeline. All calls go through
`src/lib/ai/client.ts` — feature code never imports the `ai` package
directly. This is a thin facade over the Vercel AI SDK + AI Gateway
(`AI_GATEWAY_API_KEY`):

```ts
import { generateStructured } from "@/lib/ai/client";

const data = await generateStructured({
  schema: SomeZodSchema,
  system: "...",
  prompt: "...",
});
```

Internally this calls `generateText({ model, output: Output.object({ schema }) })`
(the AI SDK deprecated the standalone `generateObject` function — verify
against `node_modules/ai/docs` before assuming otherwise, this SDK moves
fast). Because the Gateway resolves plain `"provider/model"` strings
(`src/lib/ai/models.ts`), **swapping providers is a string change**, not new
adapter code — that's what makes this an abstraction rather than a thin
Anthropic-specific wrapper. Always verify a model ID against
`https://ai-gateway.vercel.sh/v1/models` before using it; never trust a
remembered ID.

This module is untouched by, and independent of, the AI Router below —
existing callers keep working exactly as before.

## AI Router (multi-provider — `router.ts` / `index.ts`)

A second, parallel LLM system for features that need direct control over
_which provider_ serves a request (cost, latency, rate limits, or
data-residency reasons) rather than delegating that choice to the Gateway.
Business logic imports only from `src/lib/ai` (the `index.ts` barrel):

```ts
import { generateText, generateObject, streamText } from "@/lib/ai";

const { text } = await generateText({ prompt: "..." });

const { object } = await generateObject({
  prompt: "...",
  schema: SomeZodSchema,
});

const stream = streamText({ prompt: "..." });
```

**Routing**: `router.ts` reads `AI_PROVIDER` from the environment
(`nvidia | groq | gemini | openrouter`) and looks it up in a registry —
`PROVIDER_REGISTRY: Record<AIProviderId, AIProviderAdapter>` — to get an
`AIProviderAdapter` (`src/lib/ai/types.ts`), then calls its
`languageModel(modelId?)` to get an AI SDK `LanguageModel`. `generateText` /
`generateObject` / `streamText` in `index.ts` never know which provider
they're talking to — they just call the standard `ai` package functions
(`generateText`, `Output.object`, `streamText`) against whatever model the
router handed back. That's what makes the interface identical across
providers: it's the same underlying AI SDK call in every case, only the
`LanguageModel` instance changes.

**Adding a provider** — none of the above changes:

1. Create `src/lib/ai/providers/<name>.ts` implementing `AIProviderAdapter`
   (an `id`, a `defaultModel`, and a lazy `languageModel(modelId?)`).
2. Add `<name>` to `AI_PROVIDER_IDS` in `types.ts`.
3. Register it in `PROVIDER_REGISTRY` in `router.ts`.

**Current providers** (all via their AI SDK package, not the Gateway):

| Provider     | Package                                                                                | Default model                 |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------- |
| `nvidia`     | `@ai-sdk/openai-compatible` (NIM has no dedicated package; OpenAI-compatible base URL) | `meta/llama-3.3-70b-instruct` |
| `groq`       | `@ai-sdk/groq`                                                                         | `llama-3.3-70b-versatile`     |
| `gemini`     | `@ai-sdk/google`                                                                       | `gemini-2.5-flash`            |
| `openrouter` | `@openrouter/ai-sdk-provider`                                                          | `openai/gpt-4o`               |

Model ids drift constantly — each provider file has a comment noting how its
default was verified (a live models endpoint, or the package's bundled
docs). Re-verify before changing one, don't trust memory.

**Configuration**: `AI_PROVIDER` and each provider's API key
(`NVIDIA_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`)
are all **optional** in `env.server.ts` — deliberately, so environments that
don't use the router (or use only one of the four providers) aren't forced
to configure all of them, and adding the router couldn't break any existing
deployment. Missing configuration fails at call time instead, as a typed
error, not at app startup:

- `AIProviderUnknownError` — `AI_PROVIDER` unset, or set to something not in
  `AI_PROVIDER_IDS`.
- `AIProviderNotConfiguredError` — the selected provider's API key isn't set.
- `AIGenerationError` — the provider was reached but generation failed
  (including a schema mismatch from `generateObject`, detected via the AI
  SDK's `NoObjectGeneratedError`).

All three extend the shared `AppError` (`src/lib/errors.ts`) — catch them
the same way as any other domain's typed errors.

Note on `.env` values: an env var set to an empty string (`GROQ_API_KEY=`
with nothing after the `=`) is treated as unset, not as an invalid short
string — `env.server.ts` preprocesses empty strings to `undefined` for
these optional fields, so leaving an unused provider's key blank doesn't
fail validation for the whole app.

**Logging**: every call logs through the existing `src/lib/logger.ts`
(`ai.router.generate_text.start/success/failed`, same for `generate_object`
and `stream_text`), including provider, model, and duration — reuse the
same events when adding a provider or a new router function rather than
inventing a new logging shape.

**Streaming errors**: `streamText`'s errors surface through the returned
stream itself, not as a thrown exception — see the AI SDK's streaming
error-handling docs (`node_modules/ai/docs`). The router's `streamText`
still throws synchronously for setup failures (unknown/misconfigured
provider) and logs in-stream failures via its default `onError`.

## Logging & error handling

- **`src/lib/logger.ts`** — dependency-free structured JSON logger
  (`logger.info/warn/error(event, context)`) writing to stdout/stderr, which
  Vercel Functions already capture and index. Not pino — its worker-thread
  transports don't reliably work across Next.js's mixed Node/Edge runtimes.
- **`src/lib/errors.ts`** — `AppError` base class (`NotFoundError`,
  `ForbiddenError`, `ParsingError`, `ValidationError`). Server Actions catch
  `AppError` specifically and surface `.message` directly (it's written to
  be shown to a user); anything else gets logged in full via `logger.error`
  and a generic message is returned instead — see `toActionError()` in
  `src/actions/resume.ts` for the pattern to reuse.

## Resume pipeline

`src/features/resume/` — upload → parse → ATS score → optimize, backed by
the `Resume` and `ResumeAnalysis` Prisma models. Resume content and analysis
results are stored as `Json`, validated by zod at the application boundary
(`ResumeDataSchema`, `AtsScoreBreakdownSchema`, `OptimizationSuggestionSchema`)
rather than normalized into tables — sections are variable-shape and always
read/written as a whole.

- **Storage**: private `resumes` Supabase Storage bucket, one object per
  file at `{userId}/{resumeId}/{filename}`. Apply
  `prisma/sql/002_resume_storage.sql` once per environment (same pattern as
  `001_handle_new_user.sql`) — it creates the bucket and RLS policies.
  Storage calls always go through the request's own Supabase server client
  (`src/lib/supabase/server.ts`), never the admin client, so RLS is enforced
  by the user's own JWT.
- **Text extraction**: `src/lib/files/extract-text.ts` — `unpdf` for PDF
  (PDF.js compiled for serverless/edge, no filesystem dependency), `mammoth`
  for DOCX.
- **Flow is synchronous**: `uploadResumeAction` uploads, extracts text, and
  runs the AI parse in one request before redirecting to the resume's detail
  page — there's no background-job queue yet, and Fluid Compute's default
  timeout comfortably covers this. **Revisit this** (e.g. `after()` +
  polling, or a real queue) if file sizes or upload volume grow enough that
  the synchronous path becomes slow or unreliable.
- Parsing failures are captured on the `Resume` row itself
  (`status: FAILED`, `failureReason`) rather than thrown all the way up —
  the upload always succeeds and redirects; the detail page shows the
  failure.

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

Not every var has to be required, though: fields only a specific,
optional subsystem needs (e.g. the AI Router's per-provider API keys) are
declared `.optional()` here and validated lazily, at the call site that
actually needs them, throwing a typed error instead. Making them required
in this top-level schema would mean _any_ environment missing that one
optional subsystem's config fails to start at all — since `env.server.ts` is
imported transitively by almost everything (`lib/prisma.ts`, etc.), that's
a much bigger blast radius than the feature that actually needs the value.
Also preprocess empty strings (`KEY=` with nothing after `=`) to `undefined`
for optional fields — dotenv parses that as `""`, not "absent", and `""`
still fails a `.min(1)` check.

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
