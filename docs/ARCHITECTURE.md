# CareerOS — Architecture

This document describes the foundation the app is built on: folder
structure, auth model, database workflow, and the conventions to follow when
extending it. See the root `AGENTS.md` for the Next.js version notes that
shaped some of the choices below (e.g. `proxy.ts` instead of `middleware.ts`).

**CareerOS is not a job board — it's an AI Career Agent.** The product is
built as two layers: a growing set of **AI services** (Career Intelligence —
resume, LinkedIn, job-fit, interview, salary, and career-progression
analysis, all reusable independently of any one feature) sitting underneath
whatever **surfaces** consume them (the Resume pipeline today; more UI
later). Features are built one complete vertical slice at a time rather than
in parallel — **Resume pipeline** (upload → parse → ATS score → optimize)
was first, **Career Intelligence** (see below) is the intelligence layer
built next. Auto-apply / browser-driven form filling is deliberately out of
scope until specific target ATS platforms and a human-in-the-loop approval
model are decided — never build it as a fully autonomous submit.

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
- **Vercel AI SDK** (`ai`) for all LLM calls, through a single direct-provider
  system — the AI Router (`src/lib/ai/router.ts`, see "AI Router" below).

## Folder structure

```
prisma/
  schema.prisma       # Data model (generator + models only — no connection URLs, see below)
  sql/                # Hand-written SQL not owned by Prisma Migrate (auth.users triggers, Storage RLS, backfills)
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
    resume/            # Resume upload/parse/score pipeline (file-backed, has DB models)
    career-intelligence/ # Reusable AI service layer — see "Career Intelligence" below
      analysis/         # Shared foundation: DI types, zod primitives, service/action factories
      resume/ career/ skills/ linkedin/ jobs/ interview/ salary/ # 17 services across 7 domains
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
    ai/               # The AI Router — see "AI Router" below
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

Each domain (`resume`, `career-intelligence`, `dashboard`, `opportunities`,
and future ones) is split across three layers:

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

`src/features/resume/` is the reference implementation of this pattern for a
_file-backed_ feature (has Prisma models, Storage, a DB-driven pipeline).
`src/features/career-intelligence/` (below) is the reference implementation
for a _stateless AI service_ feature — no database models, no Storage, no
pages — and standardizes further (a service factory, a fixed 5-file layout
per service) because it's 17 services rather than one.
`src/features/opportunities/` (below) is the reference implementation for a
_multi-provider connector_ feature — a `providers/` subfolder with a
registry pattern mirroring the AI Router (`src/lib/ai/router.ts`), so a new
external data source is one new adapter file, not a change to business
logic.

## AI Router (multi-provider — `router.ts` / `index.ts`)

The only LLM system in this app — every feature calls it for direct control
over _which provider_ serves a request (cost, latency, rate limits, or
data-residency reasons). Business logic imports only from `src/lib/ai` (the
`index.ts` barrel):

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

**Current providers** (each via its own direct AI SDK package):

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

## Career Intelligence

`src/features/career-intelligence/` is CareerOS's reusable AI service
layer — 17 independent AI services across 7 domains, all built the same
way, all consumable from anywhere in the app (Server Actions today; route
handlers or background jobs later). **There is no UI or routing for this
module yet** — it's the intelligence layer other surfaces will call into,
not a feature with its own pages.

### Structure

```
src/features/career-intelligence/
  index.ts            # Top-level barrel — re-exports every domain
  analysis/            # Shared foundation, not a domain itself
    types.ts            # AIDependencies (DI), AnalysisActionResult<T>, shared inferred types
    schema.ts            # Shared zod primitives: scoreSchema, severityLevelSchema, importanceLevelSchema
    service-factory.ts    # createAnalysisService() — see below
    action-helper.ts       # runAnalysisAction() — see below
  resume/               # Resume Analysis, ATS Analysis, Keyword Analysis, Strength Analysis, Weakness Analysis
  career/               # Career Timeline Analysis, Career Progression Suggestions
  skills/               # Experience Gap Analysis, Skill Gap Analysis
  linkedin/             # LinkedIn SEO Analysis, Recruiter Visibility, Headline Optimization, About Optimization
  jobs/                 # Job Match Analysis, Company Match Analysis
  interview/            # Interview Readiness
  salary/               # Salary Estimation
```

Each of the 17 services lives in its own `<domain>/<service-name>/` folder
with exactly five files:

| File         | Contents                                                             |
| ------------ | -------------------------------------------------------------------- |
| `schema.ts`  | zod input schema **and** output schema for this one service          |
| `types.ts`   | `z.infer<>` of both schemas — nothing else                           |
| `prompt.ts`  | the system prompt (a constant) and a `buildXPrompt(input)` function  |
| `service.ts` | one call to `createAnalysisService(...)` — see below                 |
| `actions.ts` | one `"use server"` function wrapping the service for the app to call |

**Never return plain strings.** Every service's output is a zod object
schema, however small — even a service that's conceptually "generate one
paragraph" (e.g. About Optimization) returns `{ optimizedAbout: string,
keyPointsHighlighted: string[], rationale: string }`, not a bare string.
This is enforced structurally: `createAnalysisService`'s `outputSchema` is
required, and the AI Router's `generateObject` only accepts calls with a
schema (see "AI Router" above).

### The service factory (`analysis/service-factory.ts`)

Every service's `service.ts` is a thin call to `createAnalysisService`:

```ts
// resume/ats-analysis/service.ts
export const analyzeResumeAts = createAnalysisService<
  ResumeAtsAnalysisInput,
  ResumeAtsAnalysisOutput
>({
  name: "resume.ats_analysis", // namespaces log events
  inputSchema: ResumeAtsAnalysisInputSchema,
  outputSchema: ResumeAtsAnalysisOutputSchema,
  systemPrompt: RESUME_ATS_ANALYSIS_SYSTEM_PROMPT,
  buildPrompt: buildResumeAtsAnalysisPrompt,
});
```

The factory validates input against `inputSchema` (throwing `ValidationError`
from `src/lib/errors.ts` on failure), calls the AI Router's `generateObject`
with the given prompt/schema, logs `career_intelligence.<name>.start` /
`.success` / `.failed` through `src/lib/logger.ts` with duration and
provider/model, and returns the typed, schema-validated result. This is the
**only** place that plumbing is implemented — adding service #18 means
writing a schema and a prompt, not re-implementing request handling.

**Dependency injection**: the function `createAnalysisService` returns
takes the AI Router's `generateObject` as an optional second-argument
dependency:

```ts
export async function runAnalysisService(
  input: TInput,
  deps: AIDependencies = {}, // { generateObject?: typeof generateObject }
): Promise<TOutput>;
```

This is what makes every service **independently testable** without a
network call or an `AI_PROVIDER` configured — pass a fake:

```ts
const result = await analyzeResumeAts(
  { resumeText: "...", targetJobDescription: "..." },
  {
    generateObject: async () => ({
      object: fakeAtsAnalysisOutput,
      provider: "groq",
      model: "test-model",
    }),
  },
);
```

No mocking library, no module-mocking, no real AI Router or `AI_PROVIDER`
needed — just an object literal matching `generateObject`'s return shape.

### The action pattern (`analysis/action-helper.ts`)

Each service's `actions.ts` exports one literal `"use server"` function —
**not** a factory-produced value. Next.js's Server Functions compiler
statically instruments the exports of a `"use server"` file at the source
location; assigning `export const foo = someFactory()` would bypass that
static analysis, so every `actions.ts` writes the export directly and
delegates its _body_ to a shared, plain (non-`"use server"`) helper:

```ts
// resume/ats-analysis/actions.ts
"use server";

export async function analyzeResumeAtsAction(
  input: ResumeAtsAnalysisInput,
): Promise<AnalysisActionResult<ResumeAtsAnalysisOutput>> {
  return runAnalysisAction("resume.ats_analysis", () =>
    analyzeResumeAts(input),
  );
}
```

`runAnalysisAction` (in `analysis/action-helper.ts`) calls `verifySession()`
from the DAL, runs the service, and maps the result to
`AnalysisActionResult<T>` (`{ status: "success"; data: T } | { status:
"error"; message: string }`) — a different shape from the form-mutation
`ActionResult` in `src/types/action.ts`, because these actions return real
data, not just a submission status. `AppError` subclasses (including the AI
Router's own typed errors — see "AI Router" above) surface their message
directly; anything else is logged in full and replaced with a generic
message, the same pattern used elsewhere in the app.

### All 24 services

| Domain       | Service                         | Function                      |    Needs a target job/role?    |
| ------------ | -------------------------------- | ------------------------------ | :----------------------------: |
| resume       | Resume Analysis (general)      | `analyzeResume`              |            optional            |
| resume       | Resume ATS Analysis            | `analyzeResumeAts`           |            optional            |
| resume       | Resume Keyword Analysis        | `analyzeResumeKeywords`      |            required            |
| resume       | Resume Strength Analysis       | `analyzeResumeStrengths`     |               no               |
| resume       | Resume Weakness Analysis       | `analyzeResumeWeaknesses`    |               no               |
| resume       | Resume Tailoring                | `tailorResume`               |            required            |
| career       | Career Timeline Analysis       | `analyzeCareerTimeline`      |               no               |
| career       | Career Progression Suggestions | `suggestCareerProgression`   |            optional            |
| skills       | Experience Gap Analysis        | `analyzeExperienceGap`       |            required            |
| skills       | Skill Gap Analysis             | `analyzeSkillGap`            |        required (role)         |
| linkedin     | LinkedIn SEO Analysis          | `analyzeLinkedInSeo`         |      optional (keywords)       |
| linkedin     | Recruiter Visibility Analysis  | `analyzeRecruiterVisibility` |            optional            |
| linkedin     | Headline Optimization          | `optimizeLinkedInHeadline`   |        required (role)         |
| linkedin     | About Optimization             | `optimizeLinkedInAbout`      |            optional            |
| jobs         | Job Match Analysis             | `analyzeJobMatch`            |            required            |
| jobs         | Company Match Analysis         | `analyzeCompanyMatch`        |       required (company)       |
| interview    | Interview Readiness            | `analyzeInterviewReadiness`  |            required            |
| salary       | Salary Estimation              | `estimateSalary`             | n/a (role+location+experience) |
| applications | Application Document Generation | `generateApplicationDocument` |            required            |
| applications | Application Review              | `reviewApplication`           |            required            |
| applications | Company Snapshot                | `summarizeCompany`            |               no               |
| discovery    | AI Search Strategy               | `buildSearchStrategy`         |               no               |
| discovery    | Job Ranking                      | `rankJobs`                    |            required            |
| discovery    | Company Ranking                  | `rankCompanies`                |            required            |

All are importable from the top-level barrel: `import { analyzeResumeAts,
estimateSalary } from "@/features/career-intelligence"`, or from a domain
barrel (`.../career-intelligence/resume`) for a narrower import surface.

### What's deliberately not here yet

Five of the 24 are wired into the dashboard (see `## Dashboard` below):
`suggestCareerProgression`, `analyzeSkillGap`, `analyzeJobMatch`,
`analyzeRecruiterVisibility`, `estimateSalary`. Four more are wired into the
Resume Studio (see `## Resume Studio` below): `tailorResume`,
`analyzeResumeKeywords`, `analyzeResumeStrengths`,
`analyzeResumeWeaknesses`. Three more are wired into the Application
Studio (see `## Application Studio` below): `generateApplicationDocument`,
`reviewApplication`, `summarizeCompany`. Three more are wired into the Job
Discovery Engine (see `## Job Discovery Engine` below, new this sprint):
`buildSearchStrategy`, `rankJobs`, `rankCompanies` — the latter two are
also reused by `analyzeSkillGap` for company eligibility notes rather than
a bespoke call. The rest (LinkedIn SEO, headline/about optimization,
company match, interview readiness, resume analysis (general), career
timeline analysis) still have no page, component, or route handler calling
them — that's the next sprint(s), one surface at a time. `salary-estimation`
is explicit in its own prompt that it's a general estimate from the model's training
knowledge, not a live compensation-database lookup; don't present it to
users as authoritative without that caveat carried through to the UI
later.

**Note on `analyzeResumeAts`**: the resume detail page's ATS score card
(`## Resume pipeline` above) does **not** call this service — it calls
`scoreResume` in `src/features/resume/service.ts`, a separate, older
pipeline. `scoreResume` (and `parseResume`) originally ran on a since-removed
Gateway-based client and have been migrated onto the AI Router
(`generateObject` from `@/lib/ai`), same as every other AI call in the app —
there is now exactly one LLM transport, not two.

## Resume Studio

`src/components/resume/studio/` + `src/actions/resume-studio.ts` — the
editing/tailoring/export surface for a parsed resume, reached from the
resume detail page via "Open Resume Studio". It **extends** the existing
Resume pipeline (`## Resume pipeline` above) rather than duplicating it:
the same `Resume` row and `ResumeDataSchema`-shaped `parsedData` are read
and written in place; nothing here re-parses a file or re-derives resume
content from scratch.

- **Builder + Live Preview**: `resume-builder-editor.tsx` (contact/skills/
  experience/education/certifications/projects section components) edits
  the in-memory `ResumeData` object; `resume-live-preview.tsx` renders it
  through one of the visual templates in `src/components/resume/templates/`
  (`minimal`, `modern` — plain HTML/Tailwind, distinct from the PDF-specific
  templates below). Both read the same `data` state, so preview is always
  exactly what's currently in the editor, not a stale server render.
- **Auto-save + draft recovery**: every edit writes synchronously to
  `localStorage` (`careeros:resume-draft:{resumeId}`) as a cheap local
  backup, then debounces (1500ms) a call to `saveResumeDraftAction`, which
  validates and persists to `Resume.parsedData`. The `localStorage` key is
  cleared only after a *confirmed successful* server save. On mount, the
  client compares the local draft against the server-rendered initial data
  and — only if they differ — offers a toast "Restore" action; this is what
  recovers work from a closed tab or a failed save, without silently
  clobbering a server value that's actually current.
- **Versioning**: `ResumeVersion` (new this sprint — see the Prisma schema)
  is an explicit, user-triggered snapshot of `parsedData`, distinct from
  auto-save. "Save version" in `resume-version-panel.tsx` writes one;
  restoring re-validates the stored `Json` against `ResumeDataSchema` before
  writing it back to `parsedData` (a `Prisma.JsonValue` from the DB is not
  automatically an `InputJsonValue` for a write — it has to be re-parsed,
  not just re-cast). Resume Comparison (`resume-version-compare.tsx`) is a
  **structural** diff (counts + `Set`-based skill add/remove), not a
  word-level text diff — no diff library was added for this; if
  line-level/word-level diffing is wanted later, that's a real addition, not
  something this sprint's comparison view secretly does already.
- **AI Tailoring, Keyword Optimization, Resume Suggestions**: three panels
  in the "Tailor & Optimize" tab, each backed by an AI Router service under
  `src/features/career-intelligence/resume/` — `tailoring/` is new this
  sprint (see `## Career Intelligence` above), `keyword-analysis`,
  `strength-analysis`, and `weakness-analysis` already existed but had no
  caller before this sprint. Tailoring uses synthetic, request-scoped
  bullet ids (`${experienceIndex}:${bulletIndex}`, generated client-side,
  never persisted) so the model's response can reference a specific bullet
  without the schema needing real per-bullet database ids (bullets are a
  plain `string[]` on each experience entry). `tailorResume`
  (`resume/tailoring/service.ts`) defensively post-processes the AI
  Router's already-schema-valid output: it drops any `bulletSuggestion`
  whose `bulletId` doesn't match one actually sent, and strips stray
  JSON-artifact punctuation from `keywordsToEmphasize` entries — both are
  real, reproduced model-output issues, not hypothetical hardening.
- **Export**: `src/features/resume/export/` renders the current resume data
  to PDF (`@react-pdf/renderer`, one PDF-specific template component per
  visual template — `pdf-templates.tsx`) or DOCX (`docx`, `docx.ts`).
  DOCX deliberately uses **one unified layout** regardless of which visual
  template is selected for PDF/preview: ATS parsing quality benefits from a
  simple, consistent document structure, while visual template variety is a
  concern for human readers only (PDF/preview), so building per-template
  DOCX variants would add real complexity for no ATS benefit. Both are
  served from route handlers, not Server Actions —
  `resume/[resumeId]/export/pdf/route.ts` and `.../export/docx/route.ts` —
  because a file download needs a raw `Response` with a
  `Content-Disposition` header, which a Server Action can't return. The
  client (`resume-export-menu.tsx`) fetches the route as a `Blob` rather
  than linking to it directly, specifically so a 403 entitlement-limit
  response (JSON, not a file) can be shown as a toast instead of being
  downloaded as a garbled "file".
- **Entitlement gating**: both AI Tailoring and Export check
  `checkEntitlement` (see `## Entitlements` below) before doing any real
  work — confirmed via server logs that a blocked request never reaches the
  AI Router or the export renderer.

## Entitlements

`src/features/entitlements/` — real, DB-backed usage metering for
AI-and-export-heavy actions, added this sprint because Sprint 4 explicitly
requires "Entitlement Engine integration" and none existed yet. This is
**not a billing system**: `Profile.planTier` (`FREE` | `PRO`) is just a
label with no payment processor behind it — every profile defaults to
`FREE` and stays there until a real billing integration is built to move
it. What's real is the counting: `FeatureUsageEvent` gets one row per
metered action (`RESUME_TAILORING`, `RESUME_EXPORT`, four for the
Application Studio — `APPLICATION_DOCUMENT_GENERATION`,
`APPLICATION_REVIEW`, `APPLICATION_EXPORT`, `COMPANY_SNAPSHOT` — and one
more added this sprint, `JOB_DISCOVERY_RUN`), and
`checkEntitlement`/`consumeEntitlement` (`service.ts`) count a user's rows
in a rolling 30-day window against `PLAN_LIMITS` for their plan tier — an
honest, if minimal, limit rather than either a fabricated billing UI or
skipping the requirement. The check runs *before* the expensive operation
(AI Router call, PDF/DOCX render, connector search), so a limit hit
fast-fails instead of paying for work that gets thrown away. Hardcoded
limits were deliberately avoided at the call site — every gated action
below reads its limit from this same `PLAN_LIMITS` table, never a literal
number inline. `JOB_DISCOVERY_RUN` covers one full discovery run
(connector search + AI ranking) regardless of whether it was triggered
manually or by the scheduled cron — a scheduled run that would exceed the
limit is skipped for that user that cycle, never force-run for free (see
`## Job Discovery Engine`).

**Sprint 7** adds three more metered features (`APPLICATION_STRATEGY`,
`FOLLOW_UP_RECOMMENDATION`, `ANALYTICS_INSIGHTS` — see `## Application
Automation Engine`) and one extension to `checkEntitlement` itself: it now
looks for an `EntitlementOverride` row (`userId` + `feature`, admin-set via
the Admin Application Center) *before* falling back to `PLAN_LIMITS` —
`customLimit: null` means unlimited, same convention `PLAN_LIMITS` already
uses for `PRO`. `EntitlementCheck.overridden` tells callers/UI whether a
result came from an override so it can be shown as such rather than silently
looking like a normal plan limit.

**Sprint 8** adds five more (`INTERVIEW_PREP`, `COMPANY_RESEARCH`,
`SALARY_ESTIMATE`, `CAREER_HEALTH_SCORE`, `OFFER_COMPARISON` — see
`## Career Intelligence Foundation`), same pattern as every prior addition.
Note `computeCareerHealthV2` itself is *not* metered — it's a pure DB
aggregation with zero AI Router calls, computed fresh on every dashboard
load; only explicitly *persisting* a snapshot (`generateCareerHealthAction`)
counts against `CAREER_HEALTH_SCORE`.

## Dashboard

`src/app/(app)/dashboard/page.tsx` is the AI Career Copilot command center —
a Server Component that fetches everything up front
(`src/features/dashboard/queries.ts`) and passes real data down to a grid of
Client Component cards (`src/components/dashboard/`). No section ever shows
invented data: what's real and persisted renders directly; what needs a
live AI call renders an honest empty state with a real trigger. The two
`roadmap-card.tsx` placeholders ("Applications", "Interview Pipeline") that
used to say "isn't built yet" were removed in Sprint 8 once both became
real — `roadmap-card.tsx` itself was deleted (zero remaining callers) once
the second one was replaced.

- **Persisted signals** (survive a reload): Resume Score reads straight
  from `ResumeAnalysis`. **Career Health Score is now a real composite**
  (`features/career/health.ts`'s `computeCareerHealthV2`, Sprint 8) — see
  `## Application Automation Engine` and the new Career Intelligence
  Foundation section below for what replaced the old single-signal alias.
  Applications and Interview Readiness are also now real, persisted-data
  cards (`applications-summary-card.tsx` reuses `computeApplicationAnalytics`
  as-is; `interview-readiness-card.tsx` reads the latest real
  `InterviewPrep.confidenceScore`). Recent Activity is synthesized from
  real `Resume`/`ResumeAnalysis` timestamps, not `AuditLog` (which only
  records auth events).
- **On-demand signals** (ephemeral, regenerated each time): LinkedIn Score,
  Job Match Score, Salary Insights, and Skills Progress each call a real
  Career Intelligence Server Action through a thin wrapper in
  `src/actions/dashboard.ts` — which fetches the caller's own latest parsed
  resume server-side rather than trusting a client-supplied resume text —
  and render whatever comes back. Nothing here is stored: reopening the
  dashboard shows the empty state again. See the "On-demand only" decision
  in this module's git history if that trade-off (vs. adding a persistence
  table) needs revisiting.
- **`useAiGeneration`** (`src/hooks/use-ai-generation.ts`) is the shared
  pending/result/error hook behind every on-demand card. Two things about
  it aren't optional: the `try/catch` around the action call (a dropped
  connection throws before the action returns its own error shape), and
  the `HARD_TIMEOUT_MS` race. Both exist because the AI Router itself has
  **no request timeout** today — a slow provider has been observed to hang
  a request indefinitely with neither a success nor an error ever logged.
  That's a gap in `lib/ai`, not something worth papering over further at
  the dashboard layer; fixing it there (so this hook's client-side
  workaround can eventually shrink) is a good candidate for a future
  AI Router sprint.
- **Command palette** (`command-palette.tsx`) is scoped to navigation +
  sign-out, not to remotely triggering the AI cards above — that would mean
  lifting card state into shared context for marginal benefit over just
  clicking the card.

## Opportunities

`src/features/opportunities/` is the AI Job Discovery / Opportunity &
Application Engine. Same layering as every other feature: `schema.ts`
(Zod), `types.ts`, `queries.ts` (server-only Prisma reads),
`match.ts` (deterministic scoring, no AI), `service.ts` (orchestration),
`providers/` (the connector framework). Route-facing mutations live in
`src/actions/opportunities.ts`; UI lives in `src/components/opportunities/`
and `src/app/(app)/opportunities/`.

### Connector framework (`providers/`)

Same registry pattern as the AI Router (`src/lib/ai/router.ts`) —
deliberately: `types.ts` defines `OpportunityProviderAdapter` (`id`, `name`,
`isConfigured()`, `search()`), `registry.ts` is the one file that lists
every connector, and adding a new one never touches `service.ts` or any
caller of `searchOpportunities`. Four real adapters exist today —
`adzuna.ts`, `jooble.ts`, `arbeitnow.ts`, `remoteok.ts` — built against
each provider's actual documented (or, where undocumented, live-verified)
REST contract, not guessed field names. Arbeitnow and RemoteOK are public,
keyless APIs and are always "configured"; Adzuna and Jooble need
`ADZUNA_APP_ID`/`ADZUNA_APP_KEY`/`JOOBLE_API_KEY` (see `.env.example`).
`normalize.ts`'s `stripHtml()` is applied to every provider's description —
RemoteOK and Arbeitnow were confirmed (via live response inspection) to
return raw HTML, which without this rendered as literal `<p>`/`<strong>`
tags in the UI and would otherwise pollute the AI Match Analysis prompt.

`searchOpportunities()` fans out to every *configured* provider in
parallel via `Promise.allSettled` — one provider erroring or timing out
never fails the whole search, it's surfaced in `providerFailures` instead.
If zero providers are configured, the Discovery page shows an educational
empty state naming exactly which env vars to set, never a fake "no
results" state.

LinkedIn, Naukri, Indeed, Foundit, Wellfound, Apna, and Internshala are
**not** implemented as connectors — none offer a public, self-serve API
for search/application automation (LinkedIn's is Partner-Program-gated;
the rest have no consumer API at all). Building an adapter that scraped
these would violate the sprint's own "do not scrape" instruction, so they
don't exist even as stubs.

### Match scoring — two deliberately different tiers

- **Card-level (`match.ts`, `computeMatch`)**: deterministic, synchronous,
  zero AI calls — skill overlap, title overlap, location/remote fit, each
  scored independently and only averaged over the dimensions that actually
  had data (a provider with no listed skills doesn't silently score that
  dimension 0 — it's marked unavailable, and the UI says why). This exists
  because scoring every card in a result list via an LLM call is a
  non-starter: the AI Router has been observed taking 8–110+ seconds per
  call (see `## Dashboard` above), and a search page can't wait on N of
  those sequentially or even in parallel without both a terrible UX and a
  real cost/reliability problem.
- **Workspace-level (`getOpportunityMatchAnalysisAction`)**: the real,
  existing `analyzeJobMatch` Career Intelligence service (the same one the
  dashboard's Job Match card uses) — one on-demand AI call for the one
  opportunity a user has actually committed to (saved), not run
  automatically for anything.

### Application Workspace, Timeline, and Status — self-reported, and honest about it

`Opportunity.status` (`DISCOVERED` → ... → `JOINED`/`ARCHIVED`) is a plain
user-set field with an append-only `statusHistory` Json log — CareerOS has
no integration that observes real employer-side state (an ATS view event,
a recruiter's inbox), so every status past `SAVED` is something the user
marked, not something the platform verified. The UI says this explicitly
next to the status control rather than implying otherwise.
`APPLIED` intentionally collapses the spec's "Submitted" and "Application
Sent" into one value — without a real submission channel there's no way to
distinguish them honestly.

`checklist` and `skills` are `Json` columns (array-of-object /
array-of-string), following the exact precedent set by
`Resume.parsedData` — variable-shape, always read/written as a whole, so
normalizing them into their own tables buys nothing.

### Account Connections — schema-ready, not wired to anything live

`AccountConnection` (provider, status, token fields, scopes, health) is
real schema, provisioned for a future sprint. Nothing writes a row with
any `status` other than `NOT_AVAILABLE` today, and the Connections page
(`/opportunities/connections`) says so per-provider with the specific
reason (no public OAuth API, Partner-Program-only, etc.) rather than
showing a "Connect" button that can't actually connect anything. **CareerOS
never collects a password for a third-party site** — when a real
connector is eventually built here, it must use that platform's own
OAuth/officially-supported flow, never a credential-collection form. The
`accessToken`/`refreshToken` columns are nullable and must be encrypted at
rest (e.g. pgcrypto or app-level envelope encryption) before the first
real token is ever stored — see the model's doc comment in
`schema.prisma`.

### Interview Management — architecture only

`InterviewNote` (opportunity-scoped free-text notes, optional
`scheduledAt`) is the only piece built this sprint, per the spec's own
"implementation beyond architecture is optional." Calendar sync, invite
parsing, and mock-interview tooling don't exist yet.

## Application Studio

`src/components/opportunities/application-studio/` +
`src/actions/application-studio.ts` + `src/features/applications/` — the AI
Cover Letter / Email / Recruiter Message workspace, reached as a new
"Application Studio" tab inside the existing per-opportunity **Application
Workspace** (`## Opportunities` above). This extends that page rather than
duplicating it: the opportunity, resume list, and match data the page
already fetches are reused as-is; Application Studio only adds the tab and
its own data (documents, company snapshot, reviews).

### Why this lives inside the Application Workspace, not a new route

`Opportunity` already carried `resumeId`, `coverLetter`, `recruiterNotes`,
status, and a checklist before this sprint — its own doc comment already
called becoming a `Resume`-linked, status-tracked row "what turns it into
an Application Workspace." Sprint 5 extends that existing concept instead
of introducing a parallel "Application" entity: every new model below
(`ApplicationDocument`, `ApplicationReview`, `CompanySnapshot`) hangs off
`Opportunity`, and the existing `DocumentsPanel` (resume picker, plain-text
cover letter, recruiter notes) is untouched — Application Studio is
additive, not a replacement, so nothing that already worked stops working.

### One document model, one AI service, three studios

Cover Letter Studio, Email Studio, and Recruiter Message Studio are one
generic pipeline parameterized by `kind` (`COVER_LETTER` | `EMAIL` |
`RECRUITER_MESSAGE`), not three separate features:

- **One Prisma model**, `ApplicationDocument` (+ `ApplicationDocumentVersion`
  for explicit checkpoints, same restore/compare pattern as `ResumeVersion`).
  `subtype` (email/message type — Follow-up, Interview Thank You, LinkedIn
  Message, etc.), `audience` (cover-letter-only — Hiring Manager, Fresher,
  Executive, etc.), `tone`, and `length` are the shaping inputs; a document
  only ever populates the ones relevant to its `kind`.
- **One AI Router service**, `generateApplicationDocument`
  (`career-intelligence/applications/document-generation/`), driven by
  `kind` **and** `action` (`GENERATE`, `REWRITE`, `EXPAND`, `SHORTEN`,
  `IMPROVE`, `ATS_FRIENDLY`, `GRAMMAR`, `CHANGE_TONE`) — every "Generate"
  button and every toolbar action across all three studios is this one
  function with different input, not eight separate prompts.
- **One generic UI set** —
  `application-document-panel.tsx` (generation form + document list,
  configured per `kind` via a small `DocumentKindConfig` object),
  `application-document-editor.tsx` (textarea + action toolbar + export +
  versions, identical for all three studios), `application-document-
  version-panel.tsx`, `application-document-export-menu.tsx`. Three studios
  in the UI, not three sets of components.
- **One generic export pair**, `features/applications/export/plain-pdf.tsx`
  / `plain-docx.ts` — a title + paragraph-split body, reused for cover
  letters, emails, and messages alike (same "one shared layout" reasoning
  as the resume exporter, simpler here since these are plain prose, not
  multi-section documents). Route handlers live at
  `opportunities/[opportunityId]/documents/[documentId]/export/{pdf,docx}`.

### Email subject lines

`ApplicationDocument.subjectLine` (and `ApplicationDocumentVersion.
subjectLine`) exists only for `kind: EMAIL`. **Real, reproduced model
behavior**: the AI occasionally omits `subjectLine` from its structured
output despite the system prompt asking for one, and occasionally leaves a
dangling punctuation-only trailing line in `content` (e.g. a lone comma
after the signature). Both are cleaned up in
`document-generation/service.ts`'s `cleanDocumentOutput`: a missing subject
line gets a deterministic, **non-fabricated** fallback built from real
inputs already known (`subtype` label + role + company — e.g. "Following
up — Staff Backend Engineer at Meridian Cloud"), never invented text; a
trailing punctuation-only line is dropped. Revising a document (Rewrite/
Expand/etc.) passes the existing subject line back into the prompt
(`existingSubjectLine`) so the model revises it consistently rather than
rewriting the body with no awareness of what the subject currently says.

### Application Review and Readiness — computed, not fabricated

`reviewApplication` (`career-intelligence/applications/review/`) is one AI
call that reads the resume, job description, and whatever cover
letter/email currently exist, returning strengths/weaknesses/missing
keywords/missing skills/suggestions (each with a required "why", not a bare
claim) plus a per-factor score breakdown. Two things are deliberately never
trusted to the model directly:

- **`coverLetterQuality` / `emailQuality` availability** — if no cover
  letter or email exists yet, the service overrides whatever the model
  returned with a fixed `{ score: 0, available: false, explanation: "No
  cover letter has been drafted yet…" }` in code, so a hallucinated score
  for a document that doesn't exist can never reach the UI.
- **`linkedinCompleteness`** — never sent to the AI at all. CareerOS has no
  real LinkedIn integration (`AccountConnection` is schema-only, see
  `## Opportunities`), so this factor is always a fixed, honest
  "not available" rather than an estimate with nothing behind it.
- **`overallReadiness`** — a plain code-computed average of every
  `available` factor, never a number the AI reports directly. This is what
  makes the number on screen always traceable to the factors rendered next
  to it (`ReadinessBreakdown` component), and it's why nothing here is ever
  presented as a hiring probability — every score ships with its own
  explanation string.

`ApplicationReview` rows accumulate (new row per run, same convention as
`ResumeAnalysis`) so readiness visibly changes as the application package
improves; it's triggered on demand from the Review tab, never automatically.

### Company Snapshot — verified data vs. AI summary, kept visually separate

`CompanySnapshot` is a **cached** (one row per opportunity, regenerated in
place) AI summary of the job listing's own text, via `summarizeCompany`
(`career-intelligence/applications/company-snapshot/`). The Package tab's
`CompanySnapshotCard` renders two clearly separate blocks:

- **Verified listing data** — company name, location, employment type,
  salary, required skills — read directly from `Opportunity`'s own fields
  (sourced from the job board provider), the same real data the rest of
  the app already trusts.
- **AI-generated summary** — explicitly labeled, and explicitly instructed
  in its own prompt to use *only* the job description text, never general/
  training knowledge about the named company. `aiHighlights` are concrete
  facts the listing text actually states; `aiCaveats` is a checked list of
  what the listing does *not* state (industry, size, funding — CareerOS's
  job board providers don't reliably report any of these, see
  `## Opportunities`), rendered so the summary's confident prose never
  implies completeness it doesn't have.

### Entitlement-gated actions

Four new `MeteredFeature` values (`## Entitlements` above):
`APPLICATION_DOCUMENT_GENERATION` (covers generate *and* every revise
action across all three studios — one shared AI call, one shared limit),
`APPLICATION_REVIEW`, `APPLICATION_EXPORT`, `COMPANY_SNAPSHOT`. Every
Server Action in `src/actions/application-studio.ts` calls
`checkEntitlement` before the AI Router or export renderer runs, and
`consumeEntitlement` only after the operation actually succeeds — same
fast-fail-before-expensive-work discipline as Resume Studio.

### Audit trail

Every mutating action is logged via `logAuditEvent`:
`application_document.{generated,revised,version_created,version_restored,
duplicated,archived,deleted,exported}`, `application_review.generated`,
`company_snapshot.generated` (see `src/lib/audit.ts`).

### What's deliberately not built this sprint

- **No background job queue.** The sprint brief asks to "reuse Background
  Jobs when appropriate" and "reuse AI Memory" — neither exists anywhere in
  this codebase today (confirmed by audit before writing any code), and
  nothing in Application Studio strictly requires either: every AI call
  here follows the same synchronous-request-plus-client-side-timeout
  pattern already proven out by Resume Studio's tailoring flow
  (`useAsyncAction`'s 120s hard timeout). Building a job queue or a
  persistent "AI memory" store from scratch to satisfy an aspirational
  bullet, with no real consumer needing it yet, would be exactly the kind
  of premature infrastructure the engineering rules ask to avoid. Revisit
  if/when a specific Application Studio feature genuinely needs
  long-running background execution or cross-session AI context.
- **Application History** is a flat cross-kind view
  (`application-history-panel.tsx`) over the same `ApplicationDocument`/
  `ApplicationReview` rows every other tab already reads — it isn't a
  separate audit/versioning system, just a different view over one.

## Job Discovery Engine

`src/features/discovery/` + `src/features/location/` +
`src/features/opportunities/providers/` (extended) +
`src/features/career-intelligence/discovery/` — continuous, explainable
job and company discovery, reached as a new "AI Job Discovery" entry point
from the existing Opportunities page (`/opportunities/discovery`), plus a
scheduled background job (`vercel.json` cron → `/api/cron/discovery`).

### Why this reuses the existing Opportunities feature instead of a new one

`Opportunity`, `saveOpportunity`, the provider registry
(`OpportunityProviderAdapter`), and the Job Match / Company Match Career
Intelligence services all already existed. Discovery extends them rather
than duplicating them:

- **Saving a discovered job still goes through `saveOpportunity`** — a
  `DiscoveredListing` (the pre-save candidate row, see below) is never a
  parallel "real" opportunity; saving one calls the exact same function
  the manual Opportunities search page already used, so an
  `Opportunity`'s shape and lifecycle (status, checklist, Application
  Studio, everything in `## Opportunities` and `## Application Studio`
  above) is identical regardless of whether the user found it by
  searching or it was discovered for them.
- **The connector registry is extended, not replaced.** Four new
  `OpportunityProviderAdapter`s were added this sprint (below); the
  existing four (Adzuna, Jooble, Arbeitnow, RemoteOK) and `service.ts`'s
  `searchOpportunities`/`getConfiguredProviders` are untouched.

### Universal Job Connector Marketplace — real connectors vs. an honest catalog

The sprint's own hard lock says to respect each platform's Terms of
Service and use official APIs where automation isn't supported — most of
the ~30 requested platforms (LinkedIn, Naukri, Indeed, Glassdoor, Monster,
etc.) either explicitly prohibit third-party scraping or only offer
partner APIs CareerOS has no relationship with. Building scrapers for
these would violate that rule directly, so the marketplace is split:

- **`CONNECTOR_CATALOG`** (`features/discovery/connectors/catalog.ts`) is
  the full ~38-entry marketplace catalog — every platform the UI shows,
  searches, filters, and categorizes. Adding a catalog-only entry (the
  common case) is a one-line static-data addition, no migration, no UI
  change — satisfying "future connectors must require zero UI redesign"
  for the vast majority of the requested platform list.
- **8 entries have `hasLiveSearch: true`** and a real
  `OpportunityProviderAdapter`: the pre-existing Adzuna, Jooble, Arbeitnow,
  RemoteOK, plus four added this sprint —
  **Greenhouse** and **Lever** (both expose a public, unauthenticated,
  per-company JSON API explicitly designed for external embedding — not a
  scraper; `providers/greenhouse.ts`/`lever.ts` fan out across a curated,
  env-configurable list of company board tokens, since neither platform
  has a directory of every company hosted there), **USAJobs** (the U.S.
  federal government's own official public search API), and **Reed** (a
  UK job board with an official public API). All four new connectors
  follow the exact same `OpportunityProviderAdapter` interface, `isConfigured()`/
  error-handling conventions, and `Promise.allSettled` per-connector
  isolation as the pre-existing ones.
- **Every other catalog entry carries `unavailableReason`**, shown
  directly in the UI, rather than a "Connect" button that can't actually
  connect anything — the same honesty convention as `AccountConnection`'s
  `NOT_AVAILABLE` status.

Per-user marketplace state (enabled/disabled, favorited, last used, jobs
found) lives in a new `ConnectorPreference` model — deliberately separate
from `AccountConnection` (which models OAuth-style linking a user's own
platform account, a different, still-unbuilt concern) since "which sources
should CareerOS search on my behalf" and "have I linked my own LinkedIn
account" aren't the same thing. `connectorId` is a plain string matching a
catalog id, not a Prisma enum, for the same zero-migration-for-catalog-only
reason as above.

### Global Location Intelligence

`src/features/location/` wraps the `country-state-city` npm package (250
countries, their real states/provinces, their real cities) — nothing here
hardcodes a country, state, or city; `listCountries()`/`listStates(code)`/
`listCities(countryCode, stateCode)` all come straight from that dataset.
`LocationPicker` (`components/location/`) is a cascading Country → State →
City combobox (built on the new generic `MultiSelectCombobox`, itself
built on the existing `Command`/`Popover` primitives — reused for the
Connector Marketplace's search too) that only loads a country's states
once it's selected, and a state's cities once *that's* selected, matching
the sprint's own drill-down example exactly. Composite location strings
(`"US:CA"`, `"US:CA:San Francisco"`) are how `DiscoveryPreference` stores
multi-country/state/city selections without three arrays that could drift
out of sync by index — encode/decode helpers are the only place that
format is built or read.

### One AI Search Strategy, explainable Job/Company Ranking

`buildSearchStrategy` (Career Intelligence) turns a resume + preferences
into 3-8 concrete search queries, each with its own "reasoning" — shown
directly to the user, not hidden. `runDiscovery`
(`features/discovery/run-discovery.ts`) runs only the top 2 per run to
bound connector call volume.

Job and Company Ranking follow the same split Application Studio's
Readiness score established: **the AI only scores genuinely fuzzy,
semantic-understanding factors** (resume/skills/experience/industry fit
for jobs; industry/role-alignment fit for companies) — everything
computable from data the app already has (`features/discovery/ranking.ts`)
is computed in code and merged in afterward, never asked of the model:

- **Location match** — compares a listing's location text against the
  user's selected countries/states/cities (resolved back to real names via
  `features/location/service.ts`), not a guess.
- **Salary match** — a real range-overlap comparison against the user's
  stated expectation.
- **Company preference match** — a real lookup against the user's
  whitelist/blacklist/preferred-companies lists.
- **Recent hiring activity** — a real count of how many listings from the
  same company appeared in *this run's own results* — never an invented
  hiring statistic, and explicit that it's from this run, not a live
  company-wide signal CareerOS doesn't have.

`overallScore` is always this module's own weighted average of the
`available` factors, exactly like `overallReadiness` in Application
Studio — never a number the AI reports directly, and every factor ships
with its own explanation (`MatchFactorsList`, reused for both job and
company cards).

### Company Discovery and eligibility notes

`DiscoveredCompany` rows are aggregated from a run's own listings (grouped
by company name, `openRoles` is a real count), not a separate company
data source. For companies that rank in a borderline range (40-70 —
specifically where "you're close" advice is most useful) up to 3 per run
get `eligibilityNotes` populated by **reusing the existing
`analyzeSkillGap` service** against one of the company's own open-role
titles — not a bespoke "company eligibility" AI call.

### Background Discovery — the first real use of Vercel Cron in this codebase

Sprint 4 and Sprint 5 both explicitly declined to build a background job
queue, since nothing needed one and none existed to reuse. This sprint's
own audit reconfirmed the same: still no queue, no "AI memory." This time
there's a genuine, sprint-mandated need (continuous discovery, not a
one-off action), so the **minimal real mechanism the deployment platform
already provides** was used instead of building bespoke infrastructure:
`vercel.json` schedules an hourly hit to `/api/cron/discovery`
(`src/app/api/cron/discovery/route.ts`), authenticated via `CRON_SECRET`
(Vercel's own documented cron-security pattern). The route calls
`listUsersDueForDiscovery` (per-user due-check based on their own
`discoveryFrequency` — hourly/daily/weekly/manual-only) and runs
`runDiscovery` for whoever's due, entitlement-checked exactly like the
manual "Discover now" button so scheduled runs can't bypass a plan's
monthly limit.

**Known scaling limit, documented rather than silently capped**: each
`runDiscovery` call makes several sequential AI Router calls and can
legitimately take minutes (this session's own verification observed AI
Router calls ranging from about a minute to over ten minutes — see
`## AI Router` above for the general characteristic). With no job queue,
one cron invocation processes a capped batch of users
(`MAX_USERS_PER_INVOCATION = 5`) sequentially rather than everyone due at
once, to stay within a single serverless function's execution budget. A
real queue (`runDiscovery` unchanged as the worker function) is the
natural next step once user volume makes this the bottleneck.

### AI Daily Career Agent

`features/discovery/briefing.ts`'s `buildDiscoveryBriefing` follows the
exact same discipline as the pre-existing dashboard briefing
(`features/dashboard/briefing.ts`) — entirely derived from the latest real
`DiscoveryRun` row and its `DiscoveredCompany` rows, no AI call just to
render a summary, and no number that wasn't actually written to the
database by `runDiscovery`. "Dream employer" matches and the improvement
note are both computed from real `DiscoveredCompany.matchFactors`/
`eligibilityNotes`, never invented.

## Application Automation Engine

Sprint 7. Extends the same `Opportunity`-centered Application Workspace as
Application Studio (`## Application Studio` above) rather than introducing
a parallel "Application" entity — every new model below hangs off
`Opportunity`, `Resume`, or `ApplicationDocument`, reusing Resume Studio,
Job Match Analysis, and the Cover Letter/Email/Recruiter Message engine
wherever the module called for them instead of rebuilding.

### Universal Application Model

`OpportunityStatus` gained 6 states this sprint: `READY` (decided to
apply, not yet prepared), `AWAITING_APPROVAL` (package prepared, waiting
on the user's explicit go-ahead — CareerOS never submits without this),
`ASSESSMENT`, `DECLINED` (user declined an offer), `REJECTED` (employer
rejected — previously indistinguishable from the catch-all `ARCHIVED`),
`WITHDRAWN`. `Opportunity.statusHistory` (pre-existing) remains the one
append-only timeline every new feature reads from —
`transitionOpportunityStatus` (`features/applications/service.ts`) is now
the single place any code path is allowed to write a status change, so
the history can never drift out of sync with `status` itself.

### Smart Application Strategy + Smart Resume Selection (Modules 2 & 3)

`generateApplicationStrategy` (`features/applications/service.ts`) splits
its 9 recommendation factors by how they're actually knowable, rather
than asking the model to guess at all nine:

- **AI-judged** (`career-intelligence/applications/strategy/`) — needs
  tailoring, ATS optimization, a resume rewrite, skill improvement,
  certifications. These genuinely require judging resume/job *content*,
  so they're the only ones sent to the AI Router, grounded in the
  selected resume's real `rawText` and the job description.
- **Code-computed, never asked of the model** — needs a cover letter /
  recruiter message (does a `DRAFT` `ApplicationDocument` of that kind
  already exist?), needs a portfolio link (does the resume's
  `parsedData.contact.links` have one?), needs a LinkedIn update (always
  `false` with a fixed "LinkedIn isn't connected — CareerOS has no
  verified LinkedIn data" reasoning — same honesty pattern as
  `ApplicationReview.linkedinCompleteness`).

Smart Resume Selection (`selectBestResume`) is real, not a placeholder:
with one parsed resume on file it's used directly (no AI call, honest
`matchScore: null`); with more than one, every candidate (capped at 5) is
scored against the job via the pre-existing `analyzeJobMatch` (Job Match
Analysis, `## Career Intelligence`) and the highest-scoring one wins — the
winning score and summary become the strategy's `bestResumeReasoning`.
`ApplicationStrategy` rows accumulate (new row per run, same convention as
`ApplicationReview`), and `reasoning` is one flat JSON object keyed by
factor name (plus a `bestResume` key) rather than nine separate text
columns, read back by `toStrategyOutput` (`features/applications/
format.ts`) into the same shape a fresh generation returns.

### Submission Engine — honest, user-confirmed, never automated (Module 7)

Confirmed by this sprint's own audit (and every prior sprint's): no job
platform offers a real, individual-user application-*submission* API
(Greenhouse/Lever's public APIs are read-only job-board *listing* APIs),
and the sprint's own rule forbids bypassing login/anti-automation
protections. `ApplicationSubmission.method` is therefore always one of
three explicitly user-confirmed manual workflows —
`COMPANY_CAREER_PAGE_MANUAL`, `EMAIL_MANUAL`,
`USER_APPROVED_BROWSER_MANUAL` — the user applies themselves, then tells
CareerOS via `recordApplicationSubmissionAction`. `OFFICIAL_API` exists in
the enum as a reserved, documented-as-unused value, same honesty pattern
as `AccountConnection.NOT_AVAILABLE` (`## Opportunities`) — nothing writes
it today. Recording a submission calls the same
`transitionOpportunityStatus` the rest of the app uses, moving the
opportunity to `APPLIED`. `retryCount`/`failureReason` on the row (plus
`recordFailedSubmission`) are what the Admin Application Center's Failure/
Retry Queues read from.

### AI Follow-up Engine (Module 9)

`generateFollowUpRecommendation` only runs for opportunities already past
`READY`/`PREPARING`/`AWAITING_APPROVAL` (`PRE_APPLICATION_STATUSES` guard
in `features/applications/types.ts`) — asking "should I follow up" about
an application that was never submitted would have nothing real to
reason about. Timing inputs (`daysSinceLastUpdate`, `daysSinceApplied`,
`hasRecruiterContact`) are computed in code from `statusHistory`, never
estimated by the model — the AI Router only picks a
`FollowUpRecommendationType` (`FOLLOW_UP_NOW` | `WAIT` | `SEND_REMINDER` |
`UPDATE_RESUME` | `WITHDRAW` | `APPLY_ELSEWHERE`) and explains why, given
those real numbers. `FollowUpRecommendation` rows accumulate the same way
`ApplicationStrategy`'s do.

### Background Automation (Module 12)

`src/app/api/cron/follow-up/route.ts` extends the exact cron pattern
`## Job Discovery Engine` established (`CRON_SECRET` bearer auth, a
bounded per-invocation batch, sequential processing, entitlement-checked
before each AI call) rather than building new queue infrastructure —
confirmed by this sprint's own audit that no job queue exists anywhere in
this codebase, same conclusion Sprint 6 reached. `listOpportunitiesDueForFollowUp`
(`features/applications/queries.ts`) is the "who's due" query: active
(non-terminal), status unchanged for at least a day, and no
`FollowUpRecommendation` in the last 3 days. Registered in `vercel.json`
alongside the discovery cron.

### Application Package (Module 6)

`ApplicationPackagePanel` (Documents tab) is a **read-only assembled
view**, not a new document type — Resume, Cover Letter, Recruiter
Message, and Email are the latest `DRAFT` `ApplicationDocument` of each
kind; Portfolio/LinkedIn links, Certifications, and Projects are read
directly from the selected resume's existing `ResumeDataSchema` fields
(`contact.links`, `certifications`, `projects` — all pre-existing,
zero new resume schema needed). Custom Questions
(`Opportunity.customQuestions`, a new lightweight `Json` field — a
`{id, question, answer}[]`, same "variable-shape, always read/written as
a whole" rationale as `checklist`) are the only genuinely new content
type, and the user writes both the question and the answer themselves —
CareerOS never fabricates either.

### Application Analytics (Module 10)

`computeApplicationAnalytics` (`features/analytics/service.ts`) is almost
entirely real-data aggregation, not AI: applications/interviews/offers
and every rate are counted from `Opportunity.status` **and its full
`statusHistory`** (so an opportunity that interviewed and was later
rejected still counts as having interviewed — checking only the current
status would miss that), Resume Performance groups by `resumeId`, Cover
Letter Performance compares response rates for applications with vs.
without a `COVER_LETTER` document, and Best Companies/Roles/Locations
group the same way. **"Industries" is deliberately not a card** —
CareerOS collects no industry classification for opportunities, so
showing one would mean fabricating it; the dashboard says so explicitly
instead. The one AI call, `generateAnalyticsInsights`
(`career-intelligence/applications/analytics-insights/`), is on-demand
(a button, never run on page load) and grounded entirely in these
already-computed real numbers, passed to the model as data — never asked
to estimate anything itself.

### Admin Application Center (Module 11)

`src/app/(app)/admin/` — reuses the pre-existing `verifyRole(["ADMIN",
"SUPER_ADMIN"])` DAL helper (`## Authentication & authorization` below)
for every page and Server Action; no new auth mechanism. Connector Health
cross-references the real connector registry
(`features/opportunities/providers/registry.ts`) against the last 50
`DiscoveryRun` rows' `connectorsUsed`/`errors` — configuration status and
error counts are real, never a synthetic uptime percentage. Application/
Failure/Retry Queues read `ApplicationSubmission` rows directly. AI Usage
aggregates real `FeatureUsageEvent` rows (the same rows `checkEntitlement`
counts against a user's plan limit) via `groupBy`. The Audit Log viewer
reads `AuditLog` directly. **Manual Entitlement Override**
(`EntitlementOverride` model, one row per `(userId, feature)`) extends —
never replaces — the existing plan-tier `PLAN_LIMITS` system:
`checkEntitlement` (`## Entitlements` below) now checks for an override
row first and only falls back to the plan-tier default when none exists;
`customLimit: null` means unlimited, same convention `PLAN_LIMITS`
already uses for `PRO`. Every override write/removal is itself audited
(`entitlement_override.set`/`.removed`, plus `createdByUserId` on the row
itself) — Module 11's "everything audited" rule applied literally.

### New `MeteredFeature` values

`APPLICATION_STRATEGY`, `FOLLOW_UP_RECOMMENDATION`, `ANALYTICS_INSIGHTS` —
same `checkEntitlement`-before/`consumeEntitlement`-after discipline as
every other AI feature (see `## Entitlements` below for how overrides now
factor in).

### New audit actions

`application_strategy.generated`, `follow_up.recommendation_generated`,
`application_submission.{recorded,failed}`, `opportunity.status_changed`,
`entitlement_override.{set,removed}`, `analytics_insights.generated`.

## Career Intelligence Foundation (Knowledge Graph)

Sprint 8. Builds the graph Modules 1-13 of that sprint asked for — User →
Resume → Skills → Applications → Interviews → Offers → Recruiters →
Companies → Timeline → Goals → Salary → Learning → AI Memory — by adding
the models that genuinely didn't exist yet (`Company`, `Recruiter`,
`RecruiterInteraction`, `Interview`, `InterviewPrep`, `Offer`,
`CareerGoal`, `LearningItem`, `SalaryEstimate`, `CareerHealthScore`) and
wiring 3 previously-built-but-never-called AI services
(`interview-readiness`, `timeline-analysis`, `company-match-analysis`)
into real UI for the first time. (A 4th, `experience-gap-analysis`, was
still unwired after this sprint despite an earlier draft of this section
claiming otherwise — corrected here; it's what Sprint 9's Career Gap
Engine actually wires up, see below.)

### Company — one global, shared graph node

`Company` is deliberately **global**, keyed by `normalizedName` (trim +
lowercase + collapse whitespace), not per-user — a considered decision
(confirmed with the person running this sprint) so that AI research on one
company benefits every user who later applies there, and so aggregate
stats become real cross-user signal instead of each user re-deriving their
own from a private copy. Documented limitation: two unrelated real
companies sharing an exact name string will share one row — there is no
verified external company ID (no Crunchbase/LinkedIn Company API
integration) to disambiguate against.

`resolveOrCreateCompany` (`features/companies/service.ts`) is the one
write path, called from `saveOpportunity`
(`features/opportunities/service.ts`) so every newly-saved opportunity
gets linked via the new `Opportunity.companyId` (nullable, `SetNull`,
fully backward compatible — `companyName` the plain string field is
untouched). Opportunities saved before this sprint have `companyId: null`;
rather than a mass-migration, `ensureOpportunityCompanyId` resolves/links
one lazily the first time the Opportunity Workspace page actually needs it.

**`Company` is NOT a replacement for `CompanySnapshot`** — they answer
different questions and both stay. `CompanySnapshot` (Sprint 5) is a
per-*opportunity* cache of "how does this specific listing describe the
role/company." `Company` is the cross-opportunity structured layer: an AI
research summary (`aiSummary`/`aiHighlights`/`aiCaveats`, same honesty
contract as `CompanySnapshot` — grounded only in real job-description text
CareerOS has actually stored, via a new `researchCompany` service in
`career-intelligence/companies/company-research/`) plus **real, live-
computed aggregates that are never stored redundantly on the model**:
remote/onsite split, locations seen, salary range (from real listing
data), hiring frequency in the last 90 days, application-method
distribution (from real `ApplicationSubmission` rows), and average
self-reported interview difficulty. `getCompanyAggregates`
(`features/companies/service.ts`) computes all of this fresh on every page
load — see `Company`'s own doc comment for why nothing here is cached.

Public page: `/opportunities/companies/[companyId]` — any authenticated
user can view any company's page (not owner-gated), which is the point of
a shared graph node; there's no standalone company directory yet, only
reached from an opportunity's Overview tab or the admin dashboard.

**Deliberately not built**: hiring managers by name, a Glassdoor-style
rating, visa sponsorship, graduate/internship program flags, "Talent
Pool" size. None of these have any real data source CareerOS has access
to, and fabricating them would violate this codebase's "never fabricate
company data" rule everywhere else. `sizeEstimate` is the one AI-inferred
field kept, and it's always phrased as an estimate in the value itself
(e.g. "51-200 employees (estimated)"), never a bare confident number.

### Recruiter — per-user, never shared

Unlike `Company`, `Recruiter` is scoped per-user (`userId` FK). A
recruiter is personal, user-observed data about a real person with no
verified external identity source — treating it as a shared registry
would mean an unverifiable global people-database, a real privacy/accuracy
risk a company knowledge base doesn't have. `RecruiterInteraction` rows
(`VIEWED_PROFILE`, `CONTACTED`, `REPLIED`, `INTERVIEW_REQUESTED`,
`REJECTED`, `GHOSTED`, `HIRED`) are entirely user-entered — CareerOS has
no way to observe a recruiter's actual behavior, so nothing here is ever
inferred or AI-generated. Pages: `/recruiters` (list + add),
`/recruiters/[recruiterId]` (detail + interaction log).

### Interview Pipeline + Workspace + AI Coach

`InterviewNote` existed since an early sprint as explicit "schema-level
groundwork" with zero write path anywhere in the app — this sprint is what
it was groundwork *for*. `Interview` is the new structured entity: one row
per interview loop for an opportunity, `stage` (`APPLIED → SCREENING →
TECHNICAL → MANAGER → HR → FINAL → OFFER → ACCEPTED`, or off-path
`REJECTED`/`WITHDRAWN`) plus an append-only `stageHistory` Json that
mirrors `Opportunity.statusHistory`'s exact convention, written only
through `transitionInterviewStage`
(`features/interviews/service.ts`) — the same "one function owns every
transition" discipline as `transitionOpportunityStatus`.
`InterviewNote.interviewId` (new, nullable) lets a note optionally attach
to a specific round instead of just the parent opportunity.

The **AI Interview Coach** reuses `analyzeInterviewReadiness`
(`career-intelligence/interview/interview-readiness/`) exactly as it was
built — this service existed with zero callers anywhere in the codebase
before this sprint. Its output (`likelyQuestions` as a flat
`{question, category}[]`, `suggestedTalkingPoints`, `areasToStrengthen`,
`readinessScore`) is persisted into a new versioned `InterviewPrep` row
per generation (new row per run, same convention as `ApplicationStrategy`)
rather than reshaped into a different category taxonomy — reusing the
service's real contract mattered more than forcing a "technical/
behavioral/HR" bucketing its prompt was never designed to guarantee. A
second, genuinely new small service, `analyzeAnswerFeedback`
(`career-intelligence/interview/answer-feedback/`), critiques one
user-submitted practice answer (STAR-rewrite, strengths/weaknesses, score)
and appends the result to that same `InterviewPrep.weakAnswerFlags` —
never pre-populated with a guess at what the user might answer.

The Interview tab lives inside the existing Opportunity Workspace
(`components/opportunities/interview-workspace-panel.tsx`), reusing the
same tab-per-concern pattern as Application Studio/Automation — stage
picker, recruiter link, a 1-5 self-reported `difficultyRating` (the real
signal behind `Company`'s interview-difficulty aggregate above), notes,
the AI Coach panel, and an Offer panel once `stage` reaches `OFFER`.
"Documents" in the interview context deliberately reuses the existing
`ApplicationDocument` rows from the parent opportunity rather than a new
document model.

### Offers and Offer Comparison

`Offer` is one row per opportunity (`opportunityId @unique`, updated in
place if renegotiated — user-entered real terms, not an AI output, so
unlike `InterviewPrep` it's never versioned). Location/remote/status are
deliberately not duplicated onto `Offer` — always read from the parent
`Opportunity`. `compareOffers` (`features/interviews/service.ts`) scores
2-5 of a user's own offers: **compensation** (normalized total comp
relative to the highest in the compared set), **benefits** (normalized
listed-benefit count), and **remote** are all code-computed from real
entered data; **culture/growth fit** is the one AI-scored factor, reusing
`analyzeCompanyMatch` (`career-intelligence/jobs/company-match-analysis/`
— also a previously-unwired service) grounded in the linked `Company`'s
research summary when one exists, honestly `available: false` otherwise.
`overallScore` is always this function's own average of `available`
factors, never a number the AI reports directly — same discipline as
`overallReadiness` everywhere else in this codebase.

### Career Goals, Learning, and the unified Career Timeline

`CareerGoal` is one row per user (same 1:1-upsert convention as
`DiscoveryPreference`), entirely user-entered. `LearningItem` tracks
skill/course progress (`PLANNED`/`IN_PROGRESS`/`COMPLETED`) — always
user-marked, even when a suggestion originated from an AI skill-gap
analysis; CareerOS never marks something "completed" on its own.

The unified Career Timeline (Module 10) is **not a new table**.
`buildUnifiedTimeline` (`features/career/timeline.ts`) is a pure
aggregation that reads real rows already sitting in `Resume`,
`Opportunity.statusHistory`, `Interview.stageHistory`, `Offer`, and
completed `LearningItem`s, and sorts them into one feed — every fact it
surfaces already lives somewhere else, so a dedicated
`CareerTimelineEvent` table would just be a second, driftable copy of the
same data. The separate AI *narrative* over a resume's timeline
(`analyzeCareerTimeline`, `career-intelligence/career/timeline-analysis/`
— also previously unwired, now called from a new
`getCareerTimelineNarrativeAction` in `src/actions/dashboard.ts`,
following the exact same on-demand-card pattern as the other dashboard
actions) is a genuinely separate, resume-text-only concern from this
code-computed aggregator.

### Salary Intelligence, persisted

The existing `estimateSalary` service (`career-intelligence/salary/
salary-estimation/`, already wired to the dashboard's ephemeral Salary
Insights card) gained three new output fields this sprint —
`marketComparison`, `costOfLivingAdjustment`, `growthProjection` — same
service, richer contract, no parallel pipeline. `features/salary/service.ts`'s
`generateSalaryEstimate` wraps the exact same AI call and persists the
result into a new `SalaryEstimate` row (versioned, new row per
generation). The dashboard's original `getSalaryEstimateAction` is
**unchanged** and stays free/ephemeral/unmetered — the new persisted path
is a separate, `SALARY_ESTIMATE`-metered action
(`generateSalaryEstimateAction`, `src/actions/salary.ts`) for callers that
need a durable signal (Career Health, in practice).

### Career Health Engine V2

`features/dashboard/career-health.ts` (the old V1) is deleted — it was a
direct alias of the latest resume ATS score with an explicit doc comment
anticipating "as more signals gain persistence in a future sprint." This
is that sprint. `computeCareerHealthV2`
(`features/career/health.ts`) composes 7 named factors, each honestly
`null` when its underlying signal doesn't exist yet for that user (never
padded with a value nobody measured):

- `resumeQuality` — latest `ResumeAnalysis.overallScore` (same source V1
  used).
- `interviewReadiness` — latest `InterviewPrep.confidenceScore`.
- `linkedinQuality` — **always `null`** today; no LinkedIn analysis is
  persisted anywhere (the dashboard's LinkedIn card is ephemeral, same as
  it's always been) — honestly unavailable rather than stale or guessed.
- `skillReadiness` — ratio of the user's own `LearningItem`s marked
  `COMPLETED`.
- `marketReadiness` — reuses `computeApplicationAnalytics`'s
  `responseRate` (Sprint 7) as-is — real signal, zero new counting logic.
- `companyReadiness` — % of the user's active opportunities' companies
  that have generated `Company` research.
- `growthReadiness` — presence/completion of `CareerGoal` + `LearningItem`
  activity.

Crucially, **this function never calls the AI Router itself** — it's a
pure composition of signals other features already generated and
persisted, so viewing your current Career Health Score on every dashboard
load costs nothing extra. Only explicitly *saving* a snapshot
(`CareerHealthScore`, a versioned row) is a metered action
(`generateCareerHealthAction`) — that's the one exposed via a "Save
snapshot" button on `CareerHealthCard`, distinct from the always-live
score the card already shows.

### "AI Memory" — deliberately not a new store

The graph's final node is **not** a new table. An earlier sprint
explicitly reasoned that a speculative "AI memory" store with no real
consumer would be premature infrastructure — that reasoning still holds,
but this sprint's own new persisted tables (`InterviewPrep`,
`SalaryEstimate`, `CareerHealthScore`) plus everything already persisted
(`ResumeAnalysis`, `ApplicationReview`, `ApplicationStrategy`,
`FollowUpRecommendation`, `CompanySnapshot`) are collectively real,
durable AI output — "AI Memory" is satisfied as a read-composed view
across these existing tables, not a new duplicate one.

### Career Opportunity Score V2

Extends (never replaces) the existing `JobMatchFactors`/`mergeJobFactors`
scoring from `features/discovery/ranking.ts` — the live Discovery
pipeline's own bounded per-run scoring is untouched. A new
`OpportunityScoreV2Factors` interface adds exactly 3 real, code-computed
factors on top of the existing 8: `careerGoalAlignment` (compares the
opportunity against the user's own `CareerGoal` fields),
`recruiterConnection` (does the user already have a `Recruiter` with a
logged interaction at this company?), and `companyHealth` (derived from
`Company`'s real hiring-frequency aggregate). **Deliberately not
built**: "Growth", "Promotion", and "Competition" from the sprint's own
wishlist — these would require external market data CareerOS has no
source for, and fabricating them would violate the same "never fabricate"
rule this decision applies everywhere else. Only meaningful for
already-*saved* opportunities (`computeOpportunityScoreV2`,
`features/opportunities/score.ts`) — a fresh, unsaved `DiscoveredListing`
has no linked `Company`/`Recruiter`/`CareerGoal` data yet for the 3 new
factors to mean anything.

### Admin Application Center extensions

Purely additive, same `verifyRole(["ADMIN","SUPER_ADMIN"])` +
`features/admin/queries.ts` + `EntitlementOverridePanel`-style skeleton as
every existing admin section — no impersonation anywhere, every new
function is a read-only view scoped by `userId`. `/admin/users/[userId]`
gained Interview timeline, Recruiter history, Offer history, and Career
Health history. `/admin` gained a fleet-wide Company Intelligence list (the
same shared `Company` rows the public page reads, just browsable).

## AI Job Discovery Engine V2 (Opportunity Intelligence Platform)

Sprint 9. The mandatory self-review (3 parallel `Explore` passes over the
existing connector, ranking, location, admin, and discovery-UI code)
found that the sprint brief's Modules 1-3 and most of Module 4 already
existed, in places matching the brief's own wording almost exactly — see
`## Job Discovery Engine` above (Universal Provider Engine, Connector
Marketplace, Location Intelligence all pre-date this sprint). This
sprint's real engineering effort concentrated on the genuine gaps below;
Module 5 (AI Company Discovery) was likewise already covered by
`## Job Discovery Engine`'s existing Company Discovery/eligibility-notes
work and wasn't rebuilt.

### Module 4 — Discovery Preferences extension

`DiscoveryPreference` gained 6 fields confirmed genuinely absent
(`preferredCompanySize`, `visaSponsorshipRequired`, `travelWillingness`,
`shiftPreference`, `joiningTimeline`, `languages`), plus `LocationPicker`
gained the one real UI gap found in Module 3: a `radiusKm` input. It's
saved but honestly disclaimed as not-yet-filtering — `Opportunity`/
`DiscoveredListing.location` is a free-text string with no coordinates,
so real radius filtering would require geocoding every listing, out of
scope for this pass. Matching still uses selected cities/states/countries
directly.

### Module 6 — Duplicate Opportunity Engine

`DiscoveredListing` gained `fingerprint` (normalized
`"${companyName}|${title}"`, computed in `features/discovery/dedupe.ts`)
and a self-relation `duplicateOfId`. On upsert (`run-discovery.ts`), a
brand-new listing is checked against existing listings from a *different*
source, same fingerprint, posted within `DUPLICATE_MATCH_WINDOW_MS` (14
days) — a match sets `duplicateOfId` instead of surfacing as a second
independent result. Nothing is ever deleted or hidden: the original stays
fully intact, and `listDiscoveredListings` simply filters
`duplicateOfId: null`. `DiscoveryRun.duplicatesFound` tracks the real
count per run, feeding Module 11/12's analytics.

### Module 7 — Opportunity Score extension (Career Gap Readiness, ATS Readiness)

`OpportunityScoreV2Factors` (built Sprint 8, computed by
`computeOpportunityScoreV2` — confirmed to have **zero UI references
anywhere** before this sprint) gained 2 factors and was finally rendered,
in a new `OpportunityScoreCard` on the Opportunity Workspace's Overview
tab:

- **`careerGapReadiness`** reads the *latest persisted*
  `ExperienceGapAssessment` row for the opportunity (new model, see
  Module 8) rather than triggering a fresh AI call on every score view —
  `computeOpportunityScoreV2` stays entirely AI-free and instant, same
  property it already had.
- **`atsReadiness`** reuses the resume's existing, already-persisted
  `ResumeAnalysis.overallScore` (Resume Studio) — again zero new AI call.

Both factors are `available: false` (never averaged in as a real score)
until the relevant data actually exists, same `RankingFactor` discipline
as every other factor.

### Module 8 — Career Gap Engine

`analyzeExperienceGap` (built earlier, confirmed to have zero call sites
before this sprint — see the corrected note on the Sprint 8 section
above) is now wired into a real, opportunity-scoped `CareerGapPanel` on
the Workspace Overview tab. Output is persisted to a new
`ExperienceGapAssessment` model — one new row per run, same
versioned-AI-output convention as `ApplicationStrategy`/`ApplicationReview`
— via `generateExperienceGapAssessment`
(`features/applications/service.ts`), metered under a new
`CAREER_GAP_ASSESSMENT` entitlement.

Each identified gap shows a real "N companies in your discovery feed
already require this" count (`countCompaniesRequiringSkills`,
`features/discovery/queries.ts`) — genuinely computed by checking whether
any of a `DiscoveredListing`'s own `skills` tags appears as a whole word
inside the gap's AI-written requirement sentence (word-boundary regex,
case-insensitive), not an AI estimate. An exact-string match was tried
first and rejected during this sprint's own live verification: AI gap
requirements are full sentences ("Experience with Kubernetes") while
`DiscoveredListing.skills` are short tags ("Kubernetes"), so exact
equality matched nothing in practice.

**Observed AI output-quality caveat** (not a Sprint 9 defect — the
pre-existing `analyzeExperienceGap` prompt/schema, unchanged this
sprint): live verification runs against the AI Router's currently-routed
model occasionally returned gap text with stray formatting artifacts
(trailing parens, fragments resembling leaked prompt/example syntax) in
`requirement`/`requiredLevel` strings. The Zod output schema validates
shape, not prose quality, so this passes through as-is. Flagged here
rather than silently normalized away, consistent with this codebase's
"never fabricate or silently paper over AI output" discipline — a future
sprint tightening this skill's prompt is the right fix, not something
patched from the persistence layer.

### Module 9 — AI Discovery Feed shelves

`buildDiscoveryShelves` (`features/discovery/shelves.ts`) is a pure
filter/sort over the same already-fetched, already-scored `newListings`/
`newCompanies` arrays the Discovery page's Feed tab already had — Today's
Best (existing default order), Highest Salary, Fastest Hiring (by the
existing `recentHiringActivity` factor), Remote Picks, Internships &
Campus (keyword-matched on title/employment type, since `DiscoveredListing`
has no typed `OpportunityType` equivalent), and Companies to Contact.
Zero new queries, zero new AI calls — rendered above the existing flat
`JobFeed` via a new `DiscoveryShelves` component.

### Module 10 — Background Discovery Engine (stale-listing pass)

`hideStaleListings`/`hideStaleCompanies`
(`features/discovery/maintenance.ts`) move any row still sitting at
disposition `NEW` 30+ days after `createdAt` to `HIDDEN` — never deleted,
fully reversible from the Hidden tab. Runs every invocation of the
existing hourly `/api/cron/discovery` cron, before the due-user discovery
sweep.

**Scope decision on periodic Opportunity re-scoring**: the sprint brief
also asked for "periodic re-scoring of saved Opportunity rows." Module 7's
own design (above) makes this a non-gap rather than a deferred feature —
`computeOpportunityScoreV2` was already, and remains, computed live from
current data on every view with nothing cached to go stale. Building a
background job to "refresh" a value that's never stale would be busywork
for its own sake, which the standing "don't build what isn't needed"
discipline argues against; documented here instead of silently building
it anyway.

### Module 11 — Discovery Analytics

`getDiscoveryAnalytics` (`features/discovery/analytics.ts`, optional
`userId` — see Module 12) computes real aggregates over the user's own
`DiscoveryRun`/`DiscoveredListing`/`DiscoveredCompany`/`Opportunity` rows:
jobs/companies discovered, duplicates collapsed, recommendations accepted,
applications started, interviews reached (scanned from each saved
opportunity's own `statusHistory`, not just current status, so a later
rejection doesn't erase that an interview happened), and connector
latency. Rendered in a new Analytics tab on the Discovery Dashboard.
**Latency caveat, documented rather than overclaimed**: `DiscoveryRun`
only records one `completedAt - startedAt` for the whole run, not
per-connector — the latency numbers shown are that whole-run duration
averaged across every run each connector participated in, not an
isolated per-call measurement.

### Module 12 — Admin Discovery Center

Fleet-wide extension of Module 11, same `verifyRole`/read-only/no-
impersonation discipline as every other admin section:
`getFleetDiscoveryAnalytics` (calls `getDiscoveryAnalytics()` with no
`userId`), `listDiscoveryRunFailures` (the actual `DiscoveryRun.errors`
messages, not just `getConnectorHealth`'s existing bare count — `userId`
shown as metadata only, never the user's own resume/application content),
and `getDiscoveryGrowthTrend` (14-day day-bucketed counts, computed in
application code from already-fetched `createdAt` values, no new SQL).
Added as a new "Discovery" card on the existing `/admin` page.

## AI Career Profile Optimization Suite

Sprint 10. The mandatory self-review (3 parallel `Explore` passes over
resume/ATS scoring, LinkedIn/profile infrastructure, and cover-letter/
recruiter-message/dashboard/versioning patterns) found that most of this
sprint's 10 requested modules already existed: Cover Letter Generation
(Module 5) needed zero changes; Recruiter Message Generation (Module 6)
needed one new subtype; Resume SEO (Module 2), Resume vs Job Intelligence
(Module 3), the AI Resume Optimizer (Module 4), and Resume Version
History (Module 9, resume half) were all ~85-100% built already. Real new
work concentrated on LinkedIn (Module 1 — 3 of 4 AI services existed with
zero call sites, nothing persisted profile data), and two genuinely new
cross-cutting modules (7, 8) explicitly scoped to reuse existing scores
rather than compute anything new.

### Module 1 — LinkedIn SEO Intelligence

New `LinkedInProfile` (live draft, mirrors `Resume`)/`LinkedInProfileVersion`
(insert-only snapshot, mirrors `ResumeVersion`)/`LinkedInAnalysis`
(insert-only, mirrors `ExperienceGapAssessment`) models. `/linkedin` is a
new top-level page (paste-profile-text editor, SEO Analysis tab, Versions
tab) — the paste-text pattern was a considered decision, not a default:
LinkedIn has no public per-user profile-read API, so a real "import" was
never on the table, and pasting matches the exact `profileText: string`
shape all 4 `linkedin/*` AI services already expected. Persisting it (a
change from the old dashboard card's "nothing is saved" promise) was
confirmed with the user, since Module 9 needs to version it.

`analyzeLinkedInProfile` (`features/linkedin-profile/service.ts`)
orchestrates 5 AI slices — `analyzeLinkedInSeo`, `analyzeRecruiterVisibility`,
`optimizeLinkedInAbout`, `optimizeLinkedInHeadline` (all pre-existing,
3 of the 4 had zero call sites before this sprint), plus one genuinely new
service, `career-intelligence/linkedin/experience-improvement/` (same
`createAnalysisService` factory pattern, same anti-invention prompt
discipline as `tailoring`) — plus one code-computed, non-AI factor:
**Missing Sections**, a documented heuristic checking whether common
section-header keywords appear anywhere in the pasted text (never a claim
to have inspected the real LinkedIn profile). The old dashboard
`LinkedInScoreCard` (session-only paste-and-forget dialog) was replaced
with a server-fed summary card reading the latest persisted
`LinkedInAnalysis`, linking to the full `/linkedin` flow — one LinkedIn
surface, not two parallel ones.

**Cost/latency discipline, tightened after this sprint's own live
verification found a real problem**: an initial version ran all 5 slices
via `Promise.all`. Live testing hit a genuine AI Router provider timeout
on one call and a worker rate-limit rejection on another *in the same
run* — `Promise.all` discarded the other 3 slices that had already
succeeded, and nothing persisted at all. The fixed design:
- **At most 2 AI calls in flight at once** (`runSlicesWithBoundedConcurrency`,
  batches of `Promise.allSettled`), not 5 unbounded — directly what
  caused the rate-limit rejection.
- **Skips AI entirely** when a fully-successful `LinkedInAnalysis` already
  exists for the current profile text (`profile.updatedAt` no newer than
  the analysis's `createdAt`) — returns the cached row, zero AI calls,
  zero entitlement cost.
- **Retries only the slices that failed** (`LinkedInAnalysis.failedSlices`
  records exactly which), reusing every already-succeeded slice's real
  output rather than regenerating all 5 again on every retry.
- The metered `LINKEDIN_ANALYSIS` entitlement is only consumed when the
  service actually made an AI call (`madeAiCalls`) — a cache hit doesn't
  cost the user a credit.
- Every AI-sourced field (`seoScore`, `recruiterVisibilityScore`,
  `aboutSuggestions`, etc.) is nullable/empty-able rather than the model
  requiring all 5 to succeed — a partial run still persists real, honest
  partial results instead of losing everything to one flaky call.

No true background-job/polling architecture was built for this — this
codebase still has no job queue (same fact established in
`## Job Discovery Engine`'s "Background Discovery Engine" section), and
building one was judged out of scope for an optimization pass. The
concurrency cap + cache + retry-only-what's-missing design is the
in-scope mitigation; a real queue is the natural next step if LinkedIn
analysis volume ever makes it the bottleneck.

### Module 2 — Resume SEO Engine

`ResumeAnalysis`/`scoreResume` and `analyzeResumeKeywords` already
covered ATS score, keyword density, impact language, and quantified
achievements — reused as-is. Added exactly 2 new **code-computed** (not
AI) factors in `features/resume/seo.ts`: `computeActionVerbUsage` (flags
bullets opening with a duty phrase — "responsible for," "worked on,"
etc.) and `computeReadability` (a bullet-length heuristic, ideal 10-22
words). Both are pure functions over `Resume.parsedData.experience[]
.bullets` (already structured, no new parsing), rendered as 2 extra
deterministic mini-scores in `AtsScorePanel`, explicitly kept separate
from the AI's `overallScore` average — a mechanically-checkable fact
shouldn't be re-litigated by a model.

### Module 3 — Resume vs Job Intelligence

No new AI call, no new model. `categorizeRequirements`
(`features/opportunities/requirement-categories.ts`) is a
presentational-only classifier splitting `analyzeJobMatch`'s
`unmatchedRequirements` into Skills / Tools / Certifications buckets via
plain keyword matching (a curated, necessarily non-exhaustive tools list
+ a certification-pattern regex) — anything unmatched defaults to the
broad Skills bucket rather than guessing, same "when unsure, don't claim
precision" discipline used elsewhere.

### Module 4 — AI Resume Optimizer

`tailorResume` (existing) was already a full bullet/summary rewriter with
a strong anti-invention prompt. The one real gap — tailored output was
never versioned — is now closed: a "Save as new resume version" button in
`ResumeTailoringPanel` (enabled once at least one suggestion is applied)
calls the existing `createResumeVersion`. Since that function snapshots
whatever's currently *persisted* in `Resume.parsedData` (not client
state), the save handler explicitly flushes the live-edited draft via
`saveResumeDraftAction` first rather than racing the studio's 1.5s
autosave debounce.

### Module 6 — Recruiter Message Generator

One new `ApplicationDocumentSubtype` value, `THANK_YOU_MESSAGE`
(RECRUITER_MESSAGE-scoped, distinct from EMAIL's longer, formal
`INTERVIEW_THANK_YOU`) — reuses the exact same `generateApplicationDocument`
service and Recruiter Message Studio dropdown, no new service or
component.

### Module 7 — Profile Optimization Dashboard

`getProfileOptimizationSummary` (`features/profile-optimization/service.ts`)
computes nothing new — it reads 5 already-persisted-or-computed scores
(latest `ResumeAnalysis.overallScore`, latest `LinkedInAnalysis`, latest
`ExperienceGapAssessment.overallReadiness` across all opportunities,
`computeOpportunityScoreV2` for the user's most recently active saved
opportunity, latest `ApplicationReview.readinessScore`), each wrapped in
the existing `RankingFactor` shape with `available:false` when nothing's
been generated yet. The sprint brief listed 7 scores; this returns 5 —
"ATS Score" and "Resume Score" are the same `ResumeAnalysis.overallScore`
in this codebase, and LinkedIn's "SEO Score" is already part of the
LinkedIn factor, so showing the identical number twice under different
labels was deliberately not done. Rendered as one new
`ProfileOptimizationCard` on the existing dashboard grid.

### Module 8 — AI Insights

Zero new AI calls. `generateProfileInsights`
(`features/profile-optimization/insights.ts`) is a pure
aggregation/templating function: weak-bullet counts come from Module 2's
`computeActionVerbUsage`, missing-keyword counts from `LinkedInAnalysis
.missingKeywords`, and "N saved opportunities" counts from a new
`countSavedOpportunitiesRequiringSkill` (the same word-boundary matching
approach as Sprint 9's `countCompaniesRequiringSkills`, scoped to the
user's own saved `Opportunity.skills` instead of the wider discovery
feed, since the brief's own example says "saved opportunities"
specifically). No model is ever in the loop for this module — the
strictest possible reading of "never fabricate."

### Module 9 — Version History

Resume: already complete (`ResumeVersion`), Module 4 closes the one real
gap. LinkedIn: new `LinkedInProfileVersion` + `createLinkedInProfileVersion`
/`restoreLinkedInProfileVersion`, surfaced in `/linkedin`'s Versions tab.
Comparison is a deliberately simple side-by-side raw-text view rather
than a structural differ like `ResumeVersionCompare` — LinkedIn profile
data here is free text, not a structured shape, so a real diff isn't
available cheaply, and building one was out of this sprint's effort
budget.

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
with `npx prisma db execute --file prisma/sql/001_handle_new_user.sql`
after running migrations. (Prisma 7's `db execute` reads its connection from
`prisma.config.ts` directly — no `--schema` flag.)

**Backfilling missing profiles**: any `auth.users` row created before the
trigger above was installed in a given environment (or created through some
other path that bypassed it) has no matching `profiles` row —
`getCurrentUser()` returns `null` for that user even though their Supabase
session is perfectly valid, so they can log in but every protected page
bounces them back to `/login`. `prisma/sql/003_backfill_profiles.sql` fixes
this: it finds every `auth.users` row with no matching `profiles` row and
inserts one, using the same field mapping as the trigger
(`raw_user_meta_data ->> 'full_name'` / `'avatar_url'`). Run it the same way:

```bash
npx prisma db execute --file prisma/sql/003_backfill_profiles.sql
```

Idempotent two ways at once — safe to run after every deploy, or on a
schedule, not just once: a `where not exists (...)` clause means a second
run has nothing left to insert, and `on conflict (id) do nothing` is a
backstop against the same insert race the trigger itself guards against.

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
  CLI with `--overwrite` instead so future upgrades aren't fighting local
  edits. **Exception**: `button.tsx`, `input.tsx`, `select.tsx`,
  `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, and `sidebar.tsx` carry
  intentional touch-target and viewport-safety changes (see below), and
  `src/hooks/use-mobile.ts` was rewritten to use `useSyncExternalStore`
  instead of upstream's `useState`+`useEffect` (which fails this repo's
  `react-hooks/set-state-in-effect` lint rule) — re-running `--overwrite`
  on any of these silently reverts them. Diff against upstream before
  overwriting, not after.
- `src/components/shared` / `layout` — hand-written, reusable across
  features. Put anything feature-specific closer to the feature instead.

## UI — Responsive & accessibility conventions

CareerOS is mobile-first: every page/component/dialog/form is expected to
work, unmodified, from 320px to 1920px, with no horizontal scroll, no
clipped text, and no overflowing cards. Required test widths: **320, 360,
375, 390, 414, 768, 1024, 1280, 1440, 1920**. Re-run the verification
described at the end of this section after any UI change, not just once.

### Navigation: sidebar (desktop) / sheet (mobile), one component

`src/components/layout/app-sidebar.tsx` + `app-header.tsx`, built on
shadcn's `sidebar` primitive (`src/components/ui/sidebar.tsx`,
`src/hooks/use-mobile.ts`). It's one component that renders as a persistent
collapsible sidebar at `md:` (768px) and above, and automatically becomes a
`Sheet`-based slide-out drawer below that — don't build a second, separate
mobile nav. Toggle via `AppHeader`'s `SidebarTrigger` or Cmd/Ctrl+B.
`(app)/layout.tsx` wires it up: `SidebarProvider` → `AppSidebar` +
`SidebarInset` (which **is** the page's one `<main>` landmark — don't nest
another `<main>` inside it; the skip link's `#main-content` target lives on
`SidebarInset` itself). Nav items come from `mainNav` in `src/config/site.ts`
(each with an `icon`); add new top-level nav there, not by hand-editing the
sidebar component.

### Touch targets: 44×44px minimum, no exceptions

`Button`'s `default`/`icon`/`lg` sizes (the only ones actually used in this
app — confirmed by grep before changing anything) are 44px/44px/48px tall
respectively, not upstream shadcn's default 32px. `Input` and `Select`'s
default trigger height match at 44px so form rows don't look mismatched
next to 44px buttons. Before using `sm`/`xs`/`icon-sm`/`icon-xs` anywhere
(still defined, upstream-compatible, but unused today), confirm the control
they're on isn't someone's only way to trigger an action — if it is, it
needs to be 44px too.

### Dialogs never exceed the viewport

`DialogContent` and `AlertDialogContent` both have
`max-h-[calc(100%-2rem)] overflow-y-auto` — long content scrolls _inside_
the dialog instead of pushing buttons off-screen. `AlertDialogContent`'s
max-width uses `max-w-[min(20rem,calc(100%-2rem))]` rather than a bare
`max-w-xs`, so it never touches both screen edges at once even at exactly
320px (a bare `max-w-xs` _is_ 320px — zero margin left). `DialogFooter`/
`AlertDialogFooter` are `sticky bottom-0`, so primary actions stay reachable
without scrolling to the end — reuse this pattern (don't reintroduce a
plain, non-scrolling dialog) for any new dialog with more than a couple of
lines of content.

### Text overflow in flex rows

The recurring bug pattern found in this codebase: a `flex ... justify-between`
row pairing a growing text side against a `shrink-0` metadata side (e.g. a
job title next to a date range) — without `min-w-0` on the text side, long
content doesn't wrap, it overflows the container. Fix (see
`resume-content-preview.tsx`, the resume detail page's title row): add
`min-w-0` (plus `wrap-break-word` if the content can be an unbroken long
string) to the growing side, and consider stacking vertically below `sm:`
(`flex-col sm:flex-row sm:justify-between`) rather than squeezing both
sides onto one line on a narrow screen.

### Loading, empty, and error states

- `loading.tsx` (Next.js's file convention) exists for every route under
  `(app)/` — built from `Skeleton` (`src/components/ui/skeleton.tsx`)
  shaped to match that page's real layout, so the swap-in doesn't shift
  content around. Add one for every new route the same way.
- `(app)/error.tsx` is a nested error boundary so an error on a page inside
  the app shell keeps the sidebar/header visible, instead of falling
  through to the global `src/app/error.tsx` (which still exists, for errors
  outside `(app)/`, e.g. auth pages).
- Empty states go through `src/components/shared/empty-state.tsx`
  (see `resume/page.tsx` for the pattern) — every list/collection page needs
  one, not just a blank div when there's no data.

### Responsive tables (convention for the first one — none exist yet)

No page currently renders an HTML `<table>` (verified by grep — the resume
list is card-based already). When the first real table is built: cards on
mobile (below `sm`), a real `<table>` at `sm:` and above, either as two
conditionally-rendered branches or one component that switches internally
— don't ship a bare `<table>` that just shrinks, wide tables cause
horizontal scroll on narrow screens no matter how small the font gets.

### Verification

Beyond the standard `npx tsc --noEmit`, `npm run lint`, `npx next build`:
Playwright (`npm i -D playwright`, `npx playwright install chromium firefox
webkit`) drives the key pages at all 10 required widths across all three
engines, asserting `document.documentElement.scrollWidth <=
window.innerWidth` (the automatable check for "no horizontal scroll") and
screenshotting each for visual review; `@axe-core/playwright` runs against
each page/breakpoint for automated WCAG issues (contrast, labels,
landmarks). If the sandbox/CI environment can't download browser binaries,
that specific check can't run — say so explicitly rather than skipping it
silently, and get it run in an environment that can before shipping. Real
multi-OS cross-browser (actual Safari/Windows Edge) still needs manual QA;
Playwright's WebKit/Firefox engines approximate but don't replace it.

## Marketing / landing page

`src/app/page.tsx` composes the public landing page from
`src/components/landing/` — one section component per section (hero,
benefits, features, product showcase, testimonials, pricing, FAQ, CTA,
header, footer). Keep that one-file-per-section shape when adding or
reordering sections rather than growing `page.tsx` inline.

- **Product screenshots**: no real product photography exists yet.
  `src/components/landing/product-preview.tsx` renders illustrated,
  finished (not placeholder-labeled) browser-chrome mockups built from the
  actual UI structure — the real sidebar nav icons from `mainNav`, the real
  ATS dimension labels from `ats-score-panel.tsx`. Replace with real
  screenshots post-launch; keep the same `BrowserFrame` wrapper if so.
- **Testimonials**: CareerOS is pre-launch with no customers yet.
  `testimonials-section.tsx` uses honest early-access framing — short
  reactions attributed to "Early Access Program", never a fabricated named
  person, company, or photo. Don't add invented attributed quotes here;
  swap in real customer testimonials (with consent) once they exist.
- **Pricing**: `pricing-section.tsx` numbers are a starting proposal
  (Free / Pro, monthly-annual toggle), not finance/legal-approved figures —
  confirm before relying on them commercially.
- **Legal pages**: the footer intentionally has no Privacy Policy / Terms
  of Service links — those pages don't exist, and fabricating legal text
  isn't something to do without review. Add real pages (and link them) as
  a prerequisite for public launch, not as part of a UI sprint.
- **PWA/icons**: `src/app/icon.svg`, `apple-icon.png`,
  `manifest.ts`, and `opengraph-image.tsx` are generated from the same
  brand mark (lucide's `sparkle` path, `#171717`/`#fafafa`) — regenerate
  all of them together if the mark ever changes, don't hand-edit one.
  `public/icons/` holds the larger PWA manifest icons (192/512, regular +
  maskable). `src/proxy.ts`'s matcher excludes `robots.txt`, `sitemap.xml`,
  and `manifest.webmanifest` by path, and all image extensions by suffix —
  add any new root-level metadata route to that same exclusion list, or it
  will silently redirect to `/login` for logged-out visitors.

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
