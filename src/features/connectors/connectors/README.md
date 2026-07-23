# Connectors

No connector implementation lives in this directory yet. Sprint 6 built the
Universal Job Connector Framework's architecture only — per that sprint's
explicit rules ("no placeholder portal logic," "no fake OAuth") — so this
directory is intentionally empty until a real one is built.

## What lives where

- **`../contracts.ts`** — the `JobConnector` interface every connector must
  implement (`searchJobs`, `getJob`, `login`, `refresh`, `apply`), plus the
  `ConnectorCapabilities` shape every connector declares honestly.
- **`../types.ts`** — `NormalizedJob` (reused from
  `features/opportunities/providers/types.ts`'s `NormalizedOpportunity`) and
  `NormalizedApplicationResult`, the two shapes every connector's methods
  return.
- **`../registry.ts`** — where a real connector gets registered once built.
- **`../manager.ts`** — the Connection Manager, real CRUD over the
  `AccountConnection` Prisma model for per-user connection state.
- **`../normalize.ts`** — pure mapping helpers between a connector's output
  and this codebase's existing models.

## Building a real connector

1. Create `<portal-id>.ts` here, implementing `JobConnector` from
   `../contracts.ts`. Declare `capabilities` honestly — a portal with no
   Easy Apply support sets `supportsEasyApply: false`, not a fake `true`.
2. If the portal doesn't already have an entry in
   `features/discovery/connectors/catalog.ts` (the Connector Marketplace's
   full catalog of known job portals), add one there.
3. Register the connector in `../registry.ts`'s `JOB_CONNECTOR_REGISTRY` —
   one line, no other file needs to change (no switch statements anywhere
   discover connectors).
4. If the portal requires authentication, its `login()`/`refresh()` should
   write real state via `../manager.ts`'s `upsertConnectionState` — never
   fabricate a `CONNECTED` status without a real, successful auth exchange.
5. If the portal supports Easy Apply, its `apply()` should return a real
   `NormalizedApplicationResult`. Wiring that result into
   `ApplicationSubmission` persistence requires revisiting
   `features/applications/service.ts`'s `recordApplicationSubmission`,
   which today deliberately only accepts manual submission methods — see
   that function's doc comment before changing it.

## What this is not

This is not a scraper framework. Every connector must use that portal's own
official, documented API or partner program — never automated scraping or
credential-based login bypassing a site's own auth flow, consistent with
`features/discovery/connectors/catalog.ts`'s existing "respect each
platform's Terms of Service" discipline.
