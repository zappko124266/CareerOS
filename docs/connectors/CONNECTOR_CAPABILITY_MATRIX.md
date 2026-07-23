# Connector Capability Matrix

**Status: specification.** This is the reference every connector
implementation — existing or new — must be checked against. It documents
what each connector actually does today (verified against code), and
separately what's planned, never blending the two. Where a capability
isn't real, the entry says so explicitly rather than being left blank or
implied.

**Sources audited to build this** (no other file was treated as
authoritative):

- `docs/connectors/CONNECTOR_MASTER_PLAN.md`
- `src/features/connectors/contracts.ts` (`JobConnector`, `ConnectorCapabilities`)
- `src/features/connectors/registry.ts`, `manager.ts`, `types.ts`, `normalize.ts`, `crypto.ts`
- `src/features/connectors/connectors/google/*.ts` (`connector.ts`, `oauth.ts`, `jobs.ts`, `types.ts`, `normalize.ts`)
- `src/features/connectors/connectors/README.md`
- `src/features/opportunities/providers/*.ts` (`registry.ts`, `types.ts`, all 8 adapters)
- `src/features/discovery/connectors/catalog.ts` (all 37 entries)
- `src/app/api/connectors/google/{authorize,callback}/route.ts`
- `src/actions/connectors.ts`
- `prisma/schema.prisma` (`ConnectionProvider`, `ConnectionStatus`, `OpportunitySource`, `AccountConnection`, `ConnectorPreference`, `ApplicationSubmission`, `SubmissionMethod`, `DiscoveryRun`)
- `.env.example` (every connector-related env var)

No capability below was inferred from a provider's marketing site or from
training-data assumptions about what a platform's API "probably" supports —
each `hasLiveSearch: true` / real-connector claim traces to a working
adapter file already in this repo; each `false`/"not supported" traces to
that adapter not existing and, for catalog entries, the `unavailableReason`
already recorded by whoever added the entry.

---

## 1. Universal Capability Taxonomy

Every flag below is either a **structural** flag (a real field in a
TypeScript type or Prisma enum — the framework mechanically enforces it)
or a **descriptive** flag (true today, but nothing in the type system
would stop a future connector from lying about it — enforced only by code
review against this document). New connectors must be honest about both
kinds; only the structural ones are actually checked by the compiler.

| Flag | Kind | Defined in | Meaning | Possible values |
|---|---|---|---|---|
| `auth` | Structural | `ConnectorCapabilities.auth` (`contracts.ts`) | How a connector authenticates, if at all | `NONE` \| `API_KEY` \| `OAUTH2` \| `SESSION_LOGIN` |
| `supportsOAuth` | Structural | `ConnectorCapabilities.supportsOAuth` | Whether this connector supports logging in *as the user* via that platform's OAuth | `boolean` |
| `supportsEasyApply` | Structural | `ConnectorCapabilities.supportsEasyApply` | Whether `apply()` can submit a real application through the provider | `boolean` — `false` means `apply()` must reject, never fabricate success |
| `supportsResumeUpload` | Structural | `ConnectorCapabilities.supportsResumeUpload` | Whether the provider's apply flow accepts an uploaded resume file | `boolean` |
| `supportsQuestionnaire` | Structural | `ConnectorCapabilities.supportsQuestionnaire` | Whether the provider's apply flow includes screening questions `apply()` must answer | `boolean` |
| `supportsInterviewTracking` | Structural | `ConnectorCapabilities.supportsInterviewTracking` | Whether the connector can read interview-relevant data (e.g. Calendar) | `boolean` |
| `hasLiveSearch` | Structural | `ConnectorCatalogEntry.hasLiveSearch` (`catalog.ts`) | Whether a real `OpportunityProviderAdapter` exists for this platform | `boolean` — `true` requires a matching `opportunitySource` and adapter file |
| `requiresApiKey` | Structural | `ConnectorCatalogEntry.requiresApiKey` | Whether live search needs a server-side API credential | `boolean` |
| `unavailableReason` | Structural | `ConnectorCatalogEntry.unavailableReason` | Required, honest, user-facing reason whenever `hasLiveSearch` is `false` | free text — must name the real blocker (ToS, no public API, partner-gated) |
| `ConnectionStatus` | Structural | Prisma enum (`schema.prisma`) | Per-user OAuth connection health, System 3 only | `NOT_AVAILABLE` \| `PENDING` \| `CONNECTED` \| `EXPIRED` \| `ERROR` |
| `ConnectorSourceState` | Structural | `features/connectors/types.ts` | Unified per-user view merging catalog + `AccountConnection` + registry | `CONNECTED` \| `SUPPORTED` \| `UNAVAILABLE` |
| Application status tracking | **Descriptive — not a flag today** | n/a | Whether the provider reports back an application's real status (viewed, rejected, interview) after submission | No connector has this. `Opportunity.status` is always user-set (see Master Plan, "self-reported, and honest about it"); nothing in `ConnectorCapabilities` models provider-reported status because no connector produces it. |
| Notifications | **Descriptive — not a flag today** | n/a | Whether a connector can push events (new message, application update) to CareerOS | No connector implements this. Google's Gmail scope is read-only and polled-on-demand only if a future feature calls it — no webhook/push subscription exists anywhere in this codebase. |
| AI support | **Framework-level, not per-connector** | n/a | Whether a listing gets AI match/ranking treatment | Not a connector capability — any connector producing a `NormalizedJob`/`NormalizedOpportunity` automatically becomes eligible for the framework's existing AI services (`computeMatch`, `analyzeJobMatch`, `rankJobs`/`rankCompanies` — see Master Plan/`ARCHITECTURE.md` `## Job Discovery Engine`). A connector with no job output (Google) has nothing for these to score. |

**Enforcement points** (where a violation of this taxonomy would actually
break something, not just look wrong):

- `createAnalysisService`/`JobConnector`'s TypeScript types make `auth`,
  `supportsEasyApply`, etc. required fields — a new connector cannot omit
  them, only lie about their value (caught in review, not by the compiler).
- `listConnectorsWithCapability()` (`registry.ts`) filters connectors by a
  capability flag — a connector that sets `supportsEasyApply: true`
  dishonestly would start receiving real `apply()` calls it can't honor.
  This is the mechanism the "declare capabilities honestly" rule in the
  Master Plan is protecting.
- `getConnectorCatalogEntry`/`getLiveSearchCatalogEntries()`
  (`catalog.ts`) is what the Discovery UI and `runDiscovery` actually query
  — an entry with `hasLiveSearch: true` and no real adapter registered
  would be selected for a live search call and fail at runtime, not be
  caught structurally.

---

## 2. Live connectors (real code exists)

These 9 are the only entries in this document backed by a working
implementation. Every other section of this doc is either a catalog-only
entry (§3) or an unstarted roadmap item (§4) — never presented with the
same weight as these.

### 2.1 Adzuna

1. **Identity** — Global job listing aggregator. `providers/adzuna.ts`. Catalog id `adzuna`, category `GLOBAL_JOB_BOARD`.
2. **Authentication** — `API_KEY`, app-level (not per-user). `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` query params on every request.
3. **Job Discovery** — Real, live. `GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`.
4. **Applications** — Not supported. No `apply()` exists for System-1 providers at all — a user follows the listing's own `applyUrl` off-platform.
5. **Status Tracking** — None. See taxonomy §1.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level (§1) — its `NormalizedOpportunity` output feeds Match/Job Ranking like any other source.
8. **Technical Constraints** — Requires both `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` or `isConfigured()` returns `false` and it's skipped in `searchOpportunities`'s fan-out; single fixed `ADZUNA_COUNTRY`.
9. **Security** — Server-side credentials only; never reaches the client; no user PII sent beyond search terms.
10. **Compliance** — Adzuna's own public partner API — no ToS conflict.
11. **Current CareerOS Status** — **LIVE.** Registered in `PROVIDER_REGISTRY`; `hasLiveSearch: true` in catalog.
12. **Planned Future Status** — Maintain as-is; no roadmap change.

### 2.2 Jooble

1. **Identity** — Global job search aggregator. `providers/jooble.ts`. Catalog id `jooble`, category `GLOBAL_JOB_BOARD`.
2. **Authentication** — `API_KEY`, app-level. `JOOBLE_API_KEY` embedded in the request path.
3. **Job Discovery** — Real, live. `POST https://jooble.org/api/{key}`, paginated (`page` param).
4. **Applications** — Not supported.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Needs `JOOBLE_API_KEY`; skipped when unset.
9. **Security** — Server-side key only.
10. **Compliance** — Jooble's own public partner API.
11. **Current CareerOS Status** — **LIVE.**
12. **Planned Future Status** — Maintain as-is.

### 2.3 Arbeitnow

1. **Identity** — Europe-focused, tech-leaning job board. `providers/arbeitnow.ts`. Catalog id `arbeitnow`, category `GLOBAL_JOB_BOARD`, region Europe.
2. **Authentication** — `NONE` — public, keyless API.
3. **Job Discovery** — Real, live, always configured (no key to be missing).
4. **Applications** — Not supported.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Returns raw HTML in description fields — `normalize.ts`'s `stripHtml()` is required on every result (verified via live response inspection, not assumed).
9. **Security** — No credentials involved at all.
10. **Compliance** — Open public job board API, designed for this use.
11. **Current CareerOS Status** — **LIVE**, always-configured.
12. **Planned Future Status** — Maintain as-is.

### 2.4 RemoteOK

1. **Identity** — Remote-first global job board. `providers/remoteok.ts`. Catalog id `remoteok`, category `GLOBAL_JOB_BOARD`, region "Global (remote)".
2. **Authentication** — `NONE` — public, keyless API.
3. **Job Discovery** — Real, live, always configured.
4. **Applications** — Not supported.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Also confirmed (live-inspected) to return raw HTML in descriptions — `stripHtml()` required, same as Arbeitnow.
9. **Security** — No credentials involved.
10. **Compliance** — Open public API.
11. **Current CareerOS Status** — **LIVE**, always-configured.
12. **Planned Future Status** — Maintain as-is.

### 2.5 Greenhouse-hosted careers

1. **Identity** — Not a single job board — per-company career pages hosted on Greenhouse. `providers/greenhouse.ts`. Catalog id `greenhouse`, category `ATS_HOSTED_CAREERS`.
2. **Authentication** — `NONE` — Greenhouse's `boards-api.greenhouse.io` is public and unauthenticated, explicitly designed for external embedding (not a scraper).
3. **Job Discovery** — Real, live, but bounded: fans out only across a curated, `GREENHOUSE_BOARD_TOKENS`-configured list of company board tokens — Greenhouse publishes no directory of every company hosted there, so CareerOS cannot discover boards automatically.
4. **Applications** — Not supported today. Flagged in the Master Plan roadmap (§2 there) as the most likely first real Easy-Apply candidate, contingent on per-board verification that an unauthenticated public apply endpoint actually exists and is stable — not yet built, not assumed.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Some boards' full response routinely exceeds Next.js's 2MB data-cache entry limit (observed, documented in-file) — handled per the adapter's own caching strategy; a board returning a non-2xx is isolated (doesn't fail the whole fan-out).
9. **Security** — No credentials at all (public endpoint); no user data sent.
10. **Compliance** — Official, documented, externally-embeddable API — no ToS conflict.
11. **Current CareerOS Status** — **LIVE**, scoped to configured board tokens only.
12. **Planned Future Status** — Candidate for a real `apply()` extension (System 3) — see Master Plan §"Roadmap," item 2. Unstarted.

### 2.6 Lever-hosted careers

1. **Identity** — Per-company career pages hosted on Lever. `providers/lever.ts`. Catalog id `lever`, category `ATS_HOSTED_CAREERS`.
2. **Authentication** — `NONE` — Lever's public `api.lever.co/v0/postings` endpoint, designed for external consumption.
3. **Job Discovery** — Real, live, bounded to a curated `LEVER_COMPANY_TOKENS` list — same "no public directory" limitation as Greenhouse.
4. **Applications** — Not supported today; same Easy-Apply roadmap candidacy as Greenhouse (Master Plan §2), unstarted, contingent on per-company verification.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Large companies' postings responses can also exceed the 2MB cache-entry limit (documented in-file); per-company request failures are isolated.
9. **Security** — No credentials; no user data sent.
10. **Compliance** — Official public postings API.
11. **Current CareerOS Status** — **LIVE**, scoped to configured company tokens only.
12. **Planned Future Status** — Same Easy-Apply candidacy as Greenhouse. Unstarted.

### 2.7 USAJobs

1. **Identity** — The U.S. federal government's official job board. `providers/usajobs.ts`. Catalog id `usajobs`, category `GOVERNMENT`, region United States.
2. **Authentication** — `API_KEY` — `USAJOBS_API_KEY` (as an `Authorization-Key` header) plus a required `USAJOBS_USER_AGENT` header (USAJobs' own API requirement, not a CareerOS convention).
3. **Job Discovery** — Real, live, paginated (`Page` param).
4. **Applications** — Not supported.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Both `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` are required or the provider is skipped.
9. **Security** — Server-side key/header only.
10. **Compliance** — Official U.S. government public API.
11. **Current CareerOS Status** — **LIVE.**
12. **Planned Future Status** — Maintain as-is.

### 2.8 Reed

1. **Identity** — UK job board. `providers/reed.ts`. Catalog id `reed`, category `REGIONAL_JOB_BOARD`, region United Kingdom.
2. **Authentication** — `API_KEY` — `REED_API_KEY` sent as HTTP Basic auth (key as username, empty password), per Reed's own API contract.
3. **Job Discovery** — Real, live.
4. **Applications** — Not supported.
5. **Status Tracking** — None.
6. **Notifications** — None.
7. **AI Support** — Yes, framework-level.
8. **Technical Constraints** — Requires `REED_API_KEY`; skipped when unset.
9. **Security** — Server-side key only.
10. **Compliance** — Reed's own official public API.
11. **Current CareerOS Status** — **LIVE.**
12. **Planned Future Status** — Maintain as-is.

### 2.9 Google (Universal Job Connector Framework, System 3)

1. **Identity** — Identity + Calendar + Gmail via the user's own Google account. `features/connectors/connectors/google/`. `ConnectionProvider.GOOGLE`. **Not** in `CONNECTOR_CATALOG` — that catalog is job-search portals only, and Google has none (see §3 below).
2. **Authentication** — `OAUTH2` with PKCE (RFC 7636), even though this is a confidential server-side client — defense in depth. Real consent screen, real token exchange (`oauth.ts`). Scopes: `openid`, `email`, `profile` (Identity), `calendar.readonly` (Calendar), `gmail.readonly` (Gmail) — `connectors/google/types.ts`.
3. **Job Discovery** — **Explicitly not supported.** `searchJobs`/`getJob` both throw `GoogleJobsNotSupportedError` on purpose — Google Cloud Talent Solution is an enterprise product for employers indexing their own postings, with no consumer job-search surface an individual OAuth user could grant. `capabilities.supportsEasyApply: false` reflects this; nothing in this codebase should call these methods.
4. **Applications** — **Explicitly not supported**, same root cause as Job Discovery — `apply()` throws the same error. No resume upload, no questionnaire support.
5. **Status Tracking** — N/A — no job data exists to track status for.
6. **Notifications** — **Scope granted, not consumed.** `gmail.readonly` is requested, but no feature in this codebase reads Gmail today — there is no polling job, no webhook, no UI surface for it yet. Do not describe this as "email notifications" in product copy; it's an unused grant.
7. **AI Support** — None today. Calendar/Gmail data is not fed into any Career Intelligence service yet.
8. **Technical Constraints** — Google does not reliably return a new `refresh_token` on refresh — `connector.ts`'s `refresh()` keeps the existing one unless a new one is issued. Access tokens expire per `expires_in`; no background refresh job exists yet — refresh happens only when a caller invokes it.
9. **Security** — Tokens are AES-256-GCM encrypted (`crypto.ts`) before ever reaching `AccountConnection`, keyed by `CONNECTOR_TOKEN_ENCRYPTION_KEY` (fails loud if unset/wrong length, never falls back to a default key). `state` + PKCE `code_verifier` are stored in short-lived, httpOnly, `sameSite: lax` cookies — never exposed to client JS, never sent anywhere but back to CareerOS's own callback. `manager.ts` is the only file that ever handles decrypted tokens server-side; `listConnectionSummaries` (the only UI-facing read) is structurally token-free.
10. **Compliance** — Real, official Google OAuth 2.0 consent flow; the user explicitly grants each scope on Google's own screen; `disconnect()` calls Google's real `/revoke` endpoint (best-effort — a revoke failure still clears the local row so the user is never stuck "connected" locally). No password is ever collected — consistent with the Master Plan's "no password collection" constraint.
11. **Current CareerOS Status** — **LIVE (Sprint 7).** The only real `AccountConnection` rows with a status other than `NOT_AVAILABLE` in this codebase today are `GOOGLE` rows. Surfaced at `/settings/identity` (`IdentityOverviewPanel`) and manageable via `disconnectConnectorAction`.
12. **Planned Future Status** — Wiring the already-granted Calendar/Gmail scopes into a real consumer (Interview Management calendar sync, Career Inbox email signals) is explicitly unstarted future work — the grant exists ahead of any feature using it, which must not be read as those features already existing.

---

## 3. Catalog-only connectors (job search — no live code)

29 platforms. Every one is fully part of the Discovery Marketplace UI
(searchable, filterable, favoritable via `ConnectorPreference`) but has
**no** `OpportunityProviderAdapter` and **no** `JobConnector`. Per the
"do not promise automation where unavailable" rule, every row below is
`hasLiveSearch: false` with a real, specific `unavailableReason` — never a
generic placeholder. None of the 12 sections apply beyond Identity,
Authentication (always `NONE` — nothing is ever configured for a
catalog-only entry), and Compliance (the reason automation is withheld);
Job Discovery / Applications / Status Tracking / Notifications / AI
Support / Technical Constraints / Security are uniformly **Not
applicable — no connector exists**, so they're collapsed into one
"Blocker" column instead of repeated 29 times.

Seven of these (marked †) already have a `ConnectionProvider` enum value
reserved in `prisma/schema.prisma` and a mapping in
`manager.ts`'s `CATALOG_ID_TO_PROVIDER` — meaning the *schema* could
record a System-3 connection for them, but since no `JobConnector` is
registered for any of them, that mapping is presently dead code: a row for
these can never leave `NOT_AVAILABLE`. This is intentional groundwork, not
a bug — see Master Plan §3, "Roadmap."

| Connector (catalog id) | Category | Region | Auth | Blocker (`unavailableReason`) | Current Status | Planned |
|---|---|---|---|---|---|---|
| LinkedIn Jobs (`linkedin`) † | Global Job Board | Global | NONE | ToS prohibits scraping; Jobs API is Partner-Program-restricted, CareerOS has no relationship | Catalog-only | Gated on Partner Program access — not started, no timeline |
| Naukri (`naukri`) † | Regional Job Board | India | NONE | No public search API for third-party integration | Catalog-only | Gated on platform publishing one — not started |
| Indeed (`indeed`) † | Global Job Board | Global | NONE | Publisher API program closed to new integrations | Catalog-only | Gated on program reopening — not started |
| Foundit / Monster India (`foundit`) † | Regional Job Board | India / APAC | NONE | No public search API | Catalog-only | Not started |
| Shine (`shine`) | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| TimesJobs (`timesjobs`) | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| Glassdoor (`glassdoor`) | Global Job Board | Global | NONE | ToS prohibits scraping; API not publicly self-serve | Catalog-only | Not started |
| Cutshort (`cutshort`) | Tech Recruiting | India | NONE | No public search API | Catalog-only | Not started |
| Instahyre (`instahyre`) | Tech Recruiting | India | NONE | No public search API | Catalog-only | Not started |
| Wellfound (`wellfound`) † | Startup | Global | NONE | No public search API | Catalog-only | Not started |
| Apna (`apna`) † | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| WorkIndia (`workindia`) | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| Internshala (`internshala`) † | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| Freshersworld (`freshersworld`) | Regional Job Board | India | NONE | No public search API | Catalog-only | Not started |
| Hirist (`hirist`) | Tech Recruiting | India | NONE | No public search API | Catalog-only | Not started |
| Monster (`monster`) | Global Job Board | Global | NONE | API requires an approved partner relationship | Catalog-only | Not started |
| Dice (`dice`) | Tech Recruiting | United States | NONE | No public search API | Catalog-only | Not started |
| ZipRecruiter (`ziprecruiter`) | Global Job Board | United States | NONE | API requires an approved publisher partnership | Catalog-only | Not started |
| TotalJobs (`totaljobs`) | Regional Job Board | United Kingdom | NONE | No public search API | Catalog-only | Not started |
| SEEK (`seek`) | Regional Job Board | Australia / NZ | NONE | API requires an approved partner relationship | Catalog-only | Not started |
| JobStreet (`jobstreet`) | Regional Job Board | Southeast Asia | NONE | No public search API | Catalog-only | Not started |
| CareerBuilder (`careerbuilder`) | Global Job Board | United States | NONE | API requires an approved partner relationship | Catalog-only | Not started |
| FlexJobs (`flexjobs`) | Freelance/Contract | Global | NONE | Listings are paid-subscription-gated, no public search API | Catalog-only | Not started |
| SmartRecruiters-hosted (`smartrecruiters`) | ATS-Hosted Careers | Global | NONE | Public API exists per company but no directory of participating companies | Catalog-only | Same "curated token list" pattern as Greenhouse/Lever could apply — not started |
| Workday-hosted (`workday`) | ATS-Hosted Careers | Global | NONE | Data endpoints undocumented for external use, vary by tenant | Catalog-only | Not started |
| Oracle-hosted (`oracle`) | ATS-Hosted Careers | Global | NONE | No officially documented public search API | Catalog-only | Not started |
| SAP SuccessFactors-hosted (`successfactors`) | ATS-Hosted Careers | Global | NONE | No officially documented public search API | Catalog-only | Not started |
| Taleo-hosted (`taleo`) | ATS-Hosted Careers | Global | NONE | No officially documented public search API | Catalog-only | Not started |
| Generic company career pages (`company-career-pages`) | ATS-Hosted Careers | Global | NONE | Automating arbitrary, unpermissioned sites is out of scope by policy, not a temporary gap | Catalog-only, permanent by design | **Never planned** — Speculative Applications (manual guided flow) is the deliberate substitute, not a future connector |

---

## 4. Planned connectors — not started, no code

These appear in the Master Plan's roadmap but have **zero** implementation
— no adapter, no registry entry, no schema row beyond what's already
generically reserved. Listed here only so this matrix is a complete
picture of "supports or plans to support," per the mission — every field
below is a projection, not a status, and must not be read as available.

| Connector | System | Projected auth | Projected capabilities | Real blocker today | Gate to start |
|---|---|---|---|---|---|
| Microsoft / Outlook | 3 (Universal Job Connector) | `OAUTH2` (Microsoft Graph) | Identity + Calendar + Mail, mirroring Google's scope shape | None technical — Graph API is documented and self-serve | Prioritization only; would be the second `JobConnector`, validating the framework generalizes past Google-specific assumptions |
| Greenhouse Easy Apply | 3, extending §2.5 | N/A (uses existing public endpoint, if one exists) | `supportsEasyApply: true`, contingent on verification | Unverified whether an unauthenticated public apply endpoint is stable per board | Per-board live verification required before any code is written |
| Lever Easy Apply | 3, extending §2.6 | N/A | `supportsEasyApply: true`, contingent on verification | Same as Greenhouse | Per-company live verification required |

No other roadmap connector exists beyond the catalog-only entries in §3,
which are gated on external parties (partner programs, ToS changes) that
CareerOS does not control and has no timeline for.

---

## 5. Compliance review

- **Zero connectors in this codebase perform scraping.** Every live
  connector (§2) uses a platform's own public, documented, or
  partner-issued API. Every catalog-only entry (§3) that lacks such an API
  stays search-incapable rather than being scraped around.
- **Zero connectors collect third-party credentials.** Google (§2.9) is
  the only authenticated connector, and it uses Google's own OAuth consent
  screen exclusively — CareerOS never sees the user's Google password.
- **Zero connectors have ever written an `AccountConnection` row with a
  fabricated `CONNECTED` status.** Before Sprint 7, every row was
  `NOT_AVAILABLE` by construction (no code path could write otherwise);
  since Sprint 7, `GOOGLE` rows reach `CONNECTED` only through a completed,
  real OAuth exchange (`upsertConnectionState`, called only from the
  callback route after `googleConnector.login` actually succeeds).
- **Zero connectors have a real application-submission integration.**
  `SubmissionMethod.OFFICIAL_API` is reserved in the schema and used by
  **no** code path — every `ApplicationSubmission` row today records a
  submission the user performed themselves (`COMPANY_CAREER_PAGE_MANUAL`,
  `EMAIL_MANUAL`, `USER_APPROVED_BROWSER_MANUAL`). §4's Greenhouse/Lever
  Easy Apply roadmap items are the only path anything in this codebase has
  toward changing that, and neither is built.
- **Token encryption is universal, not per-connector-optional.**
  `manager.ts` routes every `AccountConnection` write through
  `encryptToken`/`decryptToken` — there is no code path that persists a
  plaintext token for any provider, current or future, since `manager.ts`
  is the only writer.
- **One open compliance-adjacent gap**: `src/features/connectors/connectors/README.md`
  still describes the directory as containing no real connector, which
  understates what's actually shipped (Google) — noted as doc drift in
  the Master Plan, not repeated as fact here.

---

## 6. Remaining gaps in the capability model itself

These are gaps in the *framework's own vocabulary*, not in any one
connector — worth resolving before a second OAuth connector (Microsoft) is
built, since right now Google's undocumented behaviors (§2.9 items 6–8)
would otherwise need to be independently rediscovered per connector:

1. **No `ConnectorCapabilities` field for notification/push support.**
   Today this can only be described in prose (§1). If a future connector
   (Gmail polling, a webhook-based ATS) adds real notification behavior,
   the taxonomy needs a real flag before a second connector claims it, so
   `listConnectorsWithCapability` can filter on it structurally rather
   than by convention.
2. **No `ConnectorCapabilities` field for provider-reported application
   status.** Same issue — if Greenhouse/Lever Easy Apply (§4) ever ships
   and a provider starts reporting real status transitions, that needs a
   structural flag, not just a comment.
3. **No token-refresh scheduling.** Google's `refresh()` exists but
   nothing calls it proactively — there's no background job that refreshes
   a token before it expires. Every future OAuth connector inherits this
   gap until it's fixed once, centrally, rather than per-connector.
4. **`CATALOG_ID_TO_PROVIDER`'s seven reserved-but-unregistered mappings**
   (marked † in §3) are silent dead code today — nothing warns if one is
   left stale after a real connector is finally built for one of them.
   Worth a lint/test asserting the mapping and the registry agree, once a
   second System-3 connector exists to make that risk concrete.
