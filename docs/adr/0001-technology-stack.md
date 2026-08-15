# ADR 0001 — MVP Technology Stack

- Status: Accepted
- Date: 2026-08-15

## Context

Krunditark needs a map-heavy static web application, geospatial database, user auth, server-side external-source adapters and a low-operations MVP deployment path.

The frontend is initially developed/deployed through GitHub Pages. The backend is Supabase Cloud.

## Decision

Use:

### Frontend

- React
- TypeScript strict mode
- Vite
- MapLibre GL JS
- React Router
- TanStack Query
- Zod for trust-boundary validation

### Backend

- Supabase Cloud
- PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- SQL migrations under `supabase/migrations/`

### Testing

- Vitest
- Playwright
- database/RLS/PostGIS tests

### CI/deployment

- GitHub Actions
- GitHub Pages for preview/static frontend stage

## Rationale

- PostGIS is required for authoritative geospatial calculations and spatial indexes.
- Supabase provides managed PostgreSQL, PostGIS support, auth, RLS, storage and server-side Edge Functions with relatively low MVP operations overhead.
- React/Vite fits an interactive map/editor application and static deployment.
- MapLibre avoids tying core map UI to a proprietary map SDK.

## Consequences

- GitHub Pages cannot host secret/server logic; Edge Functions own it.
- Browser uses only publishable Supabase configuration.
- SPA routing needs a static-host-compatible strategy during Pages phase.
- Data adapters must be written to run server-side.
- Core domain logic should remain provider-independent so Supabase/hosting can evolve later.

## Alternatives considered

### Next.js/server hosting

Rejected for MVP because it introduces a server/frontend deployment runtime that is unnecessary while Supabase already supplies backend functions and the stated development target is GitHub Pages.

### Client-only government APIs

Rejected because CORS, secret handling, provider instability, normalization and provenance need server-side control.

### Non-spatial database

Rejected because geometry intersection/distance/containment is core product functionality.

## Change policy

Changing the primary frontend framework, backend platform or spatial database requires a superseding ADR and migration plan.
