# ADR 0001 — MVP Technology Stack

- Status: Accepted
- Date: 2026-08-15
- Amended: 2026-08-21 by ADR 0009 and ADR 0010

## Context

Krunditark needs a map-heavy static web application, geospatial database, user auth, server-side external-source adapters and a low-operations MVP deployment path.

The frontend is initially developed/deployed through GitHub Pages. The backend is Supabase Cloud.

## Decision

Use:

### Frontend

- React
- TypeScript strict mode
- Vite
- **Leaflet 1.9.x stable** for the Phase 4 browser map, per ADR 0010
- React Router
- runtime validation at trust boundaries; ADR 0009 clarifies that Zod is optional rather than mandatory
- remote-state orchestration owned explicitly; ADR 0009 clarifies that TanStack Query is optional until justified

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
- Leaflet is open source, mobile-friendly and sufficient for Krunditark's current 2D parcel/proposal workflow. ADR 0010 records the detailed map-engine/basemap decision and the Maa- ja Ruumiamet tiled-service policy.
- Runtime validation is mandatory, but the domain must not depend on a particular schema library.

## Consequences

- GitHub Pages cannot host secret/server logic; Edge Functions own it.
- Browser uses only publishable Supabase configuration.
- SPA routing needs a static-host-compatible strategy during Pages phase.
- Data adapters must be written to run server-side.
- Core domain logic should remain provider-independent so Supabase/hosting/map renderer can evolve later.
- Leaflet classes/plugins stay behind Krunditark-owned map components/adapters and do not become domain contracts.

## Alternatives considered

### Next.js/server hosting

Rejected for MVP because it introduces a server/frontend deployment runtime that is unnecessary while Supabase already supplies backend functions and the stated development target is GitHub Pages.

### Client-only government APIs

Rejected because CORS, secret handling, provider instability, normalization and provenance need server-side control.

### Non-spatial database

Rejected because geometry intersection/distance/containment is core product functionality.

### MapLibre GL JS

Originally selected in this ADR. ADR 0010 supersedes that map-engine choice after Phase 4 requirements and current Maa- ja Ruumiamet tiled-service guidance were reviewed. MapLibre remains a valid future option for vector-tile-heavy/WebGL rendering but is not the Phase 4 default.

## Change policy

Changing the primary frontend framework, backend platform, spatial database or browser map engine requires a superseding ADR and migration plan.
