# Connector Master Plan

CareerOS has **three separate systems that all use the word "connector."**
They solve different problems, live in different folders, and evolve on
different timelines. This doc exists so that adding to any one of them
starts from an accurate picture of what's real today, not a guess — and so
"add a connector" always resolves to "which of the three, and why." Nothing
below repeats implementation detail already documented in
`docs/ARCHITECTURE.md`; it links to the relevant section instead and
focuses on cross-system state and what's next.

## The three systems, at a glance

| # | System | Question it answers | Folder | Registry | Backed by |
|---|--------|---------------------|--------|----------|-----------|
| 1 | **Opportunity search providers** | "Which job boards can CareerOS *search* right now?" | `src/features/opportunities/providers/` | `registry.ts` → `PROVIDER_REGISTRY` | `Opportunity.source` (`OpportunitySource` enum) |
| 2 | **Connector Marketplace catalog** | "Which job platforms exist in the world, and which of those can CareerOS search?" | `src/features/discovery/connectors/catalog.ts` | `CONNECTOR_CATALOG` (static array) | `ConnectorPreference` (per-user enabled/favorited state) |
| 3 | **Universal Job Connector Framework** | "Which platforms can CareerOS *log into as the user* (OAuth) to read identity/calendar/mail or, eventually, apply on their behalf?" | `src/features/connectors/` | `registry.ts` → `JOB_CONNECTOR_REGISTRY` | `AccountConnection` (per-user token state) |

They compose, they don't duplicate: system 2 is a superset catalog that
*references* system 1's live-search entries (`hasLiveSearch: true`,
`opportunitySource`) and, going forward, can reference system 3's connectors
the same way once one gains search capability. System 3 is the only one that
ever touches a user's real external account (OAuth tokens); 1 and 2 are
always keyless-or-API-key, read-only, no user identity involved.

Full detail on each already lives in `docs/ARCHITECTURE.md`:
- System 1 & 2: `## Job Discovery Engine` → `### Universal Job Connector
  Marketplace`, and `## Opportunities` → `### Connector framework`.
- System 3: `## Opportunities` → `### Account Connections` describes the
  schema-only starting point; this doc is where its Sprint 6/7 build-out
  and forward roadmap are tracked, since `ARCHITECTURE.md` hasn't been
  updated past the schema-only description yet (see "Known doc drift"
  below).

---

## System 1 — Opportunity search providers

**Status: 8 live, real connectors.** `adzuna`, `jooble`, `arbeitnow`,
`remoteok`, `greenhouse`, `lever`, `usajobs`, `reed` — each implements
`OpportunityProviderAdapter` (`providers/types.ts`) against that platform's
actual documented public API. `searchOpportunities()` fans out to every
*configured* one via `Promise.allSettled`; a keyless provider (Arbeitnow,
RemoteOK) is always configured, an API-key provider needs its env var set
(`.env.example`).

**To add one:** create `providers/<name>.ts`, add its id to
`OpportunityProviderId` (`providers/types.ts`), register it in
`registry.ts`. Requires a real, documented, self-serve API — see the hard
constraints section below before starting.

## System 2 — Connector Marketplace catalog

**Status: 37 catalog entries, 8 with `hasLiveSearch: true`** (exactly
System 1's eight — every live-search entry is required to have a matching
`OpportunityProviderAdapter`, never the reverse). The other 29
(LinkedIn, Naukri, Indeed, Glassdoor, Monster, Foundit, Wellfound, Apna,
Internshala, and more) exist so the Marketplace UI shows the *whole*
landscape honestly, each with a real `unavailableReason` instead of a dead
"Connect" button. Per-user state (`enabled`, `favorited`, `lastUsedAt`,
`jobsFound`) lives in `ConnectorPreference`, keyed by the catalog's plain
string `id` — deliberately not a Prisma enum, so a catalog-only addition
(the common case) never needs a migration.

**To add a catalog-only entry** (the platform has no live-search API
available to CareerOS): one line in `CONNECTOR_CATALOG` — no migration, no
UI change.

**To promote an entry to `hasLiveSearch: true`:** build the System 1
adapter first, then flip the flag and add `opportunitySource` (which does
need a migration, adding the enum value).

## System 3 — Universal Job Connector Framework

**Status: architecture built Sprint 6, first real connector (Google) built
Sprint 7.** This is the newest and least-finished of the three, and the one
this plan tracks most closely.

### What's real today

- **`google`** — the only registered entry in `JOB_CONNECTOR_REGISTRY`
  (`features/connectors/registry.ts`). Real OAuth 2.0 + PKCE against
  Google's actual endpoints (`connectors/google/oauth.ts`) — authorize
  (`app/api/connectors/google/authorize/route.ts`) → consent → callback
  (`app/api/connectors/google/callback/route.ts`) exchanges the code, calls
  `googleConnector.login`, persists via `upsertConnectionState`.
  Capabilities: `auth: OAUTH2`, `supportsOAuth: true`,
  `supportsInterviewTracking: true` (Calendar), Gmail read scope for future
  application-tracking use — **no job search, no apply**
  (`supportsEasyApply: false`; `searchJobs`/`getJob`/`apply` all throw
  `GoogleJobsNotSupportedError` on purpose — Google Cloud Talent Solution is
  an enterprise product with no consumer job-search surface, so there's
  nothing real to call). Scopes requested: `openid`, `email`, `profile`,
  `calendar.readonly`, `gmail.readonly` (`connectors/google/types.ts`).
- **Token security**: `AccountConnection.accessToken`/`refreshToken` are
  AES-256-GCM ciphertext (`features/connectors/crypto.ts`), keyed by
  `CONNECTOR_TOKEN_ENCRYPTION_KEY` (32 bytes, base64, `.env.example`).
  Encryption/decryption happens only in `manager.ts` — no other file
  touches raw tokens, and nothing falls back to a derived/default key if
  the env var is missing (fails loud instead).
- **Connection Manager** (`manager.ts`) is the only read/write path to
  `AccountConnection`: `getConnection`/`listConnections` (server-only,
  decrypted, for a connector's own use), `listConnectionSummaries`
  (token-free DTO, safe for a page/Client Component), `upsertConnectionState`,
  `clearConnection`, and `listConnectorSources` (merges catalog +
  `AccountConnection` + registry into one `CONNECTED`/`SUPPORTED`/
  `UNAVAILABLE` view for a future unified dashboard).
- **Disconnect** (`src/actions/connectors.ts`,
  `disconnectConnectorAction`) best-effort revokes at the provider, then
  always clears the local row regardless of whether the revoke call
  succeeded — never leaves a user stuck "connected" locally.
- **Surfaced in product**: `/settings/identity` (Career Identity page)
  reads `listConnectionSummaries` and shows Google's connection state via
  `IdentityOverviewPanel`.

### The contract every future connector implements

`JobConnector` (`contracts.ts`): `isConfigured`, `searchJobs`, `getJob`,
`login`, `refresh`, `apply`, `disconnect`, plus a `capabilities` object
(`ConnectorCapabilities`) declared **honestly** — a connector with no Easy
Apply support sets `supportsEasyApply: false`, never a placeholder `true`.
`login`/`refresh`/`apply` for a capability the connector doesn't support
must reject (throw or return an `ERROR`/`FAILED` result), never fabricate
success — Google's `jobs.ts` is the reference example of doing this
honestly for a real, shipped connector rather than leaving it a stub.

A connector never touches Prisma directly — it does the network call and
returns a typed result; the caller (a route handler or Server Action)
persists it via `manager.ts`. This keeps every connector implementation's
only external dependency the provider's API, not the database, which is
what makes `disconnect`/`refresh` reusable the same way regardless of which
provider they're for.

### Roadmap — next connectors, in likely order

None of the below are started. Ordering is by "real, documented,
self-serve API exists" first, since that's the hard gate (see
constraints below), not by product priority alone.

1. **Microsoft/Outlook** — same shape as Google (OAuth2 identity +
   Calendar + Mail), Microsoft Graph API is well-documented and self-serve.
   Natural second connector because it validates the framework generalizes
   past Google-specific assumptions (e.g. token refresh behavior, scope
   labeling) before a third, more different connector is attempted.
2. **Greenhouse / Lever "Apply" extension** — these already have real,
   *unauthenticated* System-1 search adapters (`providers/greenhouse.ts`,
   `lever.ts`). Some company boards on both platforms expose an
   unauthenticated public POST-application endpoint per job — if verified
   real and stable (not all boards enable it), this would be the first
   connector with real `supportsEasyApply: true` and a real path from
   `apply()`'s `NormalizedApplicationResult` into
   `ApplicationSubmission` (`SubmissionMethod.OFFICIAL_API`, reserved for
   exactly this, unused by any code path today — see
   `features/applications/service.ts`'s `recordApplicationSubmission` doc
   comment before wiring this). Needs its own verification pass per
   company board before being trusted as "real," same standard already
   applied to every other adapter in this codebase.
3. **LinkedIn** — gated entirely on Partner Program access, which CareerOS
   does not have. Not started until that business relationship exists; no
   architecture work is blocked on this, since the `JobConnector` contract
   already accommodates it.
4. **Naukri, Indeed, Foundit, Wellfound, Apna, Internshala** — same
   `CATALOG_ID_TO_PROVIDER` mapping already exists in `manager.ts` for
   these (dead code today, since none is registered), and each has a
   `ConnectionProvider` enum value already reserved
   (`prisma/schema.prisma`). No public self-serve OAuth API exists for any
   of them today for individual-user use — revisit if/when one publishes
   one, same gate as everything else on this list.

### Known doc drift

- `src/features/connectors/connectors/README.md` still opens with "No
  connector implementation lives in this directory yet" — true when Sprint
  6 wrote it, false since Sprint 7 shipped `google/`. Update that README's
  opening paragraph (and its "Building a real connector" walkthrough, which
  is otherwise still accurate) the next time this directory is touched.
- `docs/ARCHITECTURE.md`'s `### Account Connections — schema-ready, not
  wired to anything live` section (under `## Opportunities`) still
  describes the pre-Sprint-6 schema-only state. This master plan is the
  current source of truth for System 3 until that section is rewritten to
  match; don't take that section's "nothing writes a row with any status
  other than `NOT_AVAILABLE`" line as still true — Google does today.

---

## Hard constraints (apply to all three systems)

These are load-bearing, repeated decisions across every sprint that's
touched connectors so far — not stylistic preferences:

- **No scraping, ever.** Every connector — search or OAuth — must use that
  platform's own official, documented, self-serve API or partner program.
  A platform with no such API stays catalog-only (`hasLiveSearch: false` /
  no `JobConnector` entry) with an honest `unavailableReason`, never a
  scraper built to work around the absence.
- **No fabricated success.** A capability a connector doesn't have must
  reject explicitly (throw / `ERROR` status), never return an empty-looking
  success (`[]`, `null`, a silently-ignored `apply()`) that's
  indistinguishable from "tried and found nothing."
- **No password collection.** CareerOS never asks a user for a third-party
  site's credentials. Every authenticated connector uses that platform's
  own OAuth (or equivalent officially-supported) flow.
- **Tokens are always encrypted at rest** before a real connector's first
  token write — `features/connectors/crypto.ts`'s AES-256-GCM, keyed by
  `CONNECTOR_TOKEN_ENCRYPTION_KEY`, is the only sanctioned mechanism. Adding
  a second encryption scheme instead of reusing this one is not expected —
  loop in whoever owns this doc if a connector's needs don't fit it.
- **Declare capabilities honestly.** `ConnectorCapabilities` and
  `hasLiveSearch`/`unavailableReason` exist specifically so the UI never
  offers a "Connect" or "Apply" button that can't actually do what it says.
- **Verify the contract against a live response before trusting it.**
  Every existing adapter (System 1 and System 3) was built against the
  platform's real API responses, not assumed field names — `normalize.ts`'s
  `stripHtml()` and Google's Gmail/Calendar scope choices both came from
  this kind of verification. Re-verify, don't guess from memory or training
  data, especially for anything OAuth/token-shaped (see `AGENTS.md`'s
  general "this Next.js version has drifted from training data" warning —
  the same discipline applies to third-party API shapes).
