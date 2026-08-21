# ADR 0009 — Client/server state, query and validation boundaries

- Status: Accepted
- Date: 2026-08-21
- Amended: 2026-08-21 by ADR 0010 for the browser map-engine decision

## Context

ADR 0001 named TanStack Query and Zod in the intended frontend stack before the first parcel-discovery implementation existed. Phases 0–3 subsequently established working typed clients, explicit runtime parsers/validators, source-specific caches, React Router and deterministic domain validation without either dependency.

Phase 4 introduces a Leaflet map/editor (ADR 0010), route transitions, anonymous guest ownership and an interactive proposal editor. This makes it important to distinguish four different concerns rather than adding libraries merely because they appeared in an early stack list:

1. **remote/server state** — parcel resolution, projects, persisted proposals and later analyses;
2. **interactive editor state** — the current map viewport and mutable proposal draft;
3. **trust-boundary validation** — untrusted browser/provider/API payloads;
4. **canonical domain validation** — provider-independent deterministic invariants.

## Decision

### 1. TanStack Query is optional, not an architectural requirement

Krunditark does not require TanStack Query merely to satisfy ADR 0001.

Current typed API clients and bounded source-specific caches may remain in place while they are simple and deterministic. TanStack Query may be introduced later when shared remote-state invalidation, background refetching, mutation coordination or cache ownership becomes sufficiently complex to justify it.

If introduced:

- it owns application/server-state orchestration, not provider/source cache policy;
- it must not duplicate a second independent cache with conflicting freshness semantics;
- source freshness and HTTP/source cache policy remain explicit domain/infrastructure concerns;
- query keys must use stable locale-independent identifiers;
- locale changes must not cause deterministic parcel/proposal/analysis state to be recreated unnecessarily.

### 2. Zod is optional at trust boundaries

Krunditark requires **runtime validation**, not a particular validation library.

Zod may be used at browser/server/third-party boundaries when it improves clarity, but existing explicit deterministic parsers and validators are equally valid when they:

- accept `unknown`;
- validate required structure and primitive types;
- reject non-finite numbers and invalid timestamps/geometry;
- return typed stable errors;
- have deterministic regression tests;
- keep provider-specific fields outside canonical domain types.

Domain models and deterministic rule logic must not depend on Zod schemas or provider SDK types as their source of truth.

### 3. Phase 4 workflow state has explicit ownership

The Phase 4 build workflow separates recoverable project state from ephemeral editor state.

#### Public/transient state

Before project state is needed, the visitor may search and inspect a free parcel overview without permanent identity.

#### Anonymous project state

When the user chooses a stateful proposal workflow, the application creates/reuses a Supabase anonymous Auth session and a guest project owned by that `auth.uid()`.

Persisted project state includes at least:

- selected parcel/project parcel reference;
- intent code;
- persisted proposal versions when the user explicitly saves/continues through the proposal boundary.

This anonymous technical identity is **not** a permanent-account/signup wall.

#### Editor draft state

The in-progress footprint before persistence is mutable application/editor state. It may live in route-level React state or another documented editor-state container, but it must not be the only source of truth for already-persisted project/proposal state.

Leaflet map objects/layers are view/editor mechanisms, not the application-state source of truth. The typed proposal draft must be reconstructable independently from Leaflet plugin instances.

Changing locale must preserve the current project/draft. Browser back/forward behavior must be deterministic and tested.

### 4. Proposal draft and canonical proposal are different contracts

A browser proposal draft may use browser-safe EPSG:4326 geometry for interchange/display.

The authoritative persisted `Proposal` uses canonical EPSG:3301 geometry only.

The server boundary:

1. validates the draft request;
2. transforms geometry into EPSG:3301;
3. validates topology, bounds and resource limits;
4. computes authoritative geometry metrics;
5. persists a new proposal version.

Client-computed area/perimeter are previews only. Server/PostGIS values win.

### 5. Proposal version lifecycle

The Phase 4 editor may mutate an **unpersisted draft** freely.

Creating/saving a proposal creates a versioned persisted proposal. Editing a persisted proposal for a materially new scenario creates a new version rather than rewriting history. A proposal referenced by a terminal/completed analysis is never mutated in place.

Full A/B variant duplication/comparison remains a later workflow task; Phase 4 may implement reusable draft/version primitives without claiming variant comparison is complete.

### 6. Template identity is non-authoritative UI provenance in Phase 4

A beginner template such as `sauna-6x8` is a UI convenience used to initialize a proposal draft. In Phase 4 it is not a material authoritative fact and is not required in the canonical persisted `Proposal` contract.

If durable template provenance later becomes product-relevant, it must be added deliberately through a forward schema/API change. No analysis/rule may depend on an unpersisted `sourceTemplateId`.

### 7. Map renderer is replaceable presentation infrastructure

ADR 0010 selects Leaflet 1.9.x for Phase 4. Leaflet and its editing plugin must remain behind Krunditark-owned map/editor adapters.

Application/domain state stores:

- stable IDs;
- browser-safe GeoJSON/draft facts;
- canonical server-returned proposal facts.

It does not store Leaflet `Map`, `Layer`, `LatLng`, Geoman handler instances or other renderer-specific objects as durable state.

This keeps a future renderer migration from becoming a domain/API migration.

## Consequences

- Existing parcel/address validation code does not need a dependency rewrite merely to match an old stack list.
- README/architecture documentation must describe runtime validation requirements rather than claiming Zod/TanStack Query are already installed requirements.
- Phase 4 must introduce the minimum anonymous Auth/project-ownership slice before owner-RLS proposal persistence.
- Permanent email OTP/Google conversion remains a later account/recovery phase.
- Proposal APIs must distinguish browser draft input from canonical persisted geometry.
- Playwright coverage becomes important because route/editor/map state cannot be proven fully in jsdom.
- Leaflet lifecycle/plugin state must not become project/proposal state.

## Supersedes / clarifies

This ADR **clarifies the frontend-library portion of ADR 0001**. ADR 0001 remains authoritative for React, TypeScript, Vite, React Router, Supabase/PostgreSQL/PostGIS and the general testing/deployment stack. ADR 0010 supersedes ADR 0001's original MapLibre choice with Leaflet 1.9.x for Phase 4. ADR 0001's mention of TanStack Query and Zod is no longer interpreted as a requirement to install those libraries before they are justified.

Changing the state/validation boundary above requires a superseding ADR.
