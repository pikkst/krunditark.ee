# Phase 4 Readiness — Map and Proposal Creation

Last readiness review: **2026-08-21**

This document is the implementation gate between completed Phase 0–3 work and `TASKS.md` Phase 4 (`KT-040`–`KT-048`). It does not replace `TASKS.md`; it records cross-cutting decisions and dependencies that span multiple Phase 4 tasks.

## 1. Baseline confirmed from Phase 0–3

The following foundations are considered available for Phase 4:

- React + TypeScript + Vite + React Router + ET/RU/EN i18n shell;
- design-system primitives and basic accessibility foundation;
- GitHub Actions format/lint/typecheck/test/build pipeline;
- PostgreSQL/PostGIS clean-start migrations and database/RLS tests;
- owner-scoped `projects` / versioned `project_proposals` schema;
- canonical parcel/proposal CRS policy: EPSG:3301;
- tested EPSG:4326 <-> EPSG:3301 transforms;
- parcel, proposal, intent and finding domain foundations;
- official In-AKS address search path;
- cadastral and address parcel resolution;
- server-side point selector for map parcel resolution;
- explicit resolved/ambiguous/not-found/unavailable parcel semantics;
- free parcel overview with source/freshness/coverage limitations.

Phase 4 must reuse these contracts rather than creating parallel parcel, CRS or ownership models.

## 2. Canonical Phase 4 user-state sequence

```text
public visitor
 -> address / cadastral / map parcel discovery
 -> exact parcel confirmed
 -> free parcel overview
 -> intent selected
 -> stateful proposal workflow begins
 -> create/reuse Supabase anonymous Auth identity
 -> create/reuse owner-scoped guest project
 -> mutable browser proposal draft
 -> server validation/canonicalization
 -> create persisted proposal version
```

An anonymous Supabase Auth identity is an implementation detail for safe guest ownership. It is **not** a permanent-account/signup requirement.

Permanent email OTP / Google conversion remains later and must preserve the same project.

See ADR 0006, ADR 0009 and `AUTH_AND_ONBOARDING.md`.

## 3. Phase 4 route/state ownership

Page-local state alone is insufficient once the flow spans map/editor routes.

Required rules:

- selected parcel and selected intent become project state once the stateful flow begins;
- persisted project/proposal state is identified by stable IDs, not translated labels;
- an in-progress footprint is a mutable editor draft until persisted;
- locale changes preserve project and draft state;
- browser back/forward behavior must not silently reset the project;
- refresh behavior must be deterministic and documented;
- no service-role/shared identity is used to bypass owner RLS.

## 4. Map entry and parcel selection

The `Vali krunt kaardilt` entry path is part of Phase 4 implementation, not a decorative future CTA.

Required flow:

1. open/navigate to the MapLibre parcel-selection view;
2. user explicitly clicks/selects a location;
3. browser calls the canonical `parcel-resolve` point selector with WGS84 latitude/longitude;
4. server performs authoritative spatial parcel resolution;
5. ambiguous candidates require explicit user confirmation;
6. confirmed parcel returns to the same free-overview/intent workflow as address/cadastral search.

Pointer movement must not continuously trigger parcel resolution.

## 5. Map provider gate

MapLibre GL JS is fixed. The production basemap/style/orthophoto provider is **not** yet fixed.

Before KT-040 is considered production-ready, resolve `OPEN_QUESTIONS.md` OQ-003 / GitHub issue #50 using current authoritative provider documentation.

The decision must cover:

- map quality for Estonia;
- orthophoto mode;
- terms/licensing;
- attribution text/link;
- privacy/referrer implications;
- rate/availability expectations;
- token/public configuration rules;
- proxy/cache requirements;
- local/preview/production configuration.

A temporary development map source may be used only when clearly documented as non-production.

## 6. Structure-support gate

The TypeScript/DB `structure_type` vocabulary is not itself proof of verified legal product support.

Before KT-043 marks any card as fully supported, resolve OQ-005 / issue #51 against current official law and define the first verified scenario matrix.

The UI must distinguish:

- known domain structure code;
- currently verified-supported product scenario;
- planned/unsupported scenario;
- custom/`Muu` limited-check flow.

`Muu` must not silently fall back to a supported legal/process rule profile.

## 7. Proposal draft and canonical persistence

### Browser draft

The browser may hold an editable footprint in EPSG:4326 for map display/interchange.

Template IDs and client-computed area/perimeter are convenience metadata only.

### Server validation

Server/PostGIS must:

- validate input shape/resource limits;
- transform to EPSG:3301;
- validate topology/bounds;
- apply any repair policy explicitly;
- compute authoritative area and perimeter;
- return typed validation errors;
- create a versioned persisted proposal only after canonical validation succeeds.

Authoritative area may be persisted as currently modeled. Perimeter may be deterministically derived from canonical geometry unless a later schema decision requires a stored field.

### Version lifecycle

- unpersisted draft: mutable;
- persisted proposal: versioned state;
- editing a persisted scenario creates a new version when saved;
- proposal referenced by terminal analysis: immutable;
- full variant comparison remains Phase 9.

See ADR 0009 and `API_SPECIFICATION.md`.

## 8. Intent-code contract

Canonical intent codes are:

```text
build
pre_purchase
understand_parcel
existing_building_modification
professional
```

Support state is separate from identity.

Phase 4 behavior:

- `build` — active proposal flow;
- `understand_parcel` — supported parcel-context flow;
- `pre_purchase` — known code, dedicated product later;
- `existing_building_modification` — known code, unsupported until its separate rule/profile flow exists;
- `professional` — context marker/future route, not a consumer legal-analysis fallback.

Translated labels must never be persisted as intent IDs.

## 9. Browser E2E gate

Phase 4 introduces behavior that jsdom cannot prove reliably: WebGL initialization, real routing, focus transitions, pointer/touch interaction, viewport sizing and bottom-sheet behavior.

Before the Phase 4 editor is considered stable, Playwright must run against the production-like built frontend using deterministic backend fixtures.

Minimum early Phase 4 browser journey:

1. built app loads locale route;
2. deterministic parcel is selected;
3. free overview appears;
4. build intent is selected;
5. map/proposal route opens without state loss;
6. template draft appears;
7. desktop and mobile view remain usable.

Extend the suite as drag/rotate/resize/persistence land.

Normal CI must not call live official providers.

## 10. Public discovery hardening

Phase 4 increases map-driven parcel lookup traffic. Public discovery Edge Functions must therefore have explicit resource and abuse controls.

Required direction:

- explicit upstream timeout;
- bounded response/body handling;
- bounded result counts;
- stable rate/burst policy;
- no resolver request on pointer movement;
- request/correlation ID on success/failure;
- privacy-safe structured logs;
- full addresses not logged by default;
- source failure/rate limit never mapped to `not_found`.

Tracked by issue #55.

## 11. Query/cache and validation libraries

ADR 0009 is authoritative:

- TanStack Query is optional until shared remote-state complexity justifies it;
- Zod is optional; runtime validation is mandatory;
- existing explicit parsers/validators may remain;
- domain models remain provider/library independent;
- do not introduce duplicate cache ownership.

## 12. Documentation consistency gate

Before closing Phase 4:

- `TASKS.md`, `MVP_SCOPE.md`, `ROADMAP.md`, `API_SPECIFICATION.md`, `AUTH_AND_ONBOARDING.md`, `ARCHITECTURE.md`, `UX_UI_SPEC.md` and `TESTING.md` must describe the same state/auth/proposal boundary;
- `DATA_REFRESH_AND_CACHE.md` is the only canonical refresh implementation document;
- `DATA_REFRESH_AND_VERSIONING.md` is compatibility-only;
- open provider/legal decisions remain explicitly open rather than guessed.

## 13. Repository governance

Issue #32 remains an independent governance requirement: `main` should require PR/CI protection. Phase 4 documentation changes do not make an unprotected branch safe by convention.

## 14. Phase 4 exit gate

Phase 4 is complete only when:

- map source/attribution decision is verified for the intended environment;
- map-based parcel selection works end to end;
- guest state has an anonymous owner before persisted project/proposal writes;
- locale/navigation do not discard active work;
- supported structure cards are backed by the verified scenario matrix;
- beginner templates and editor create a typed draft, not authoritative client geometry;
- server canonicalization/validation produces EPSG:3301 proposal versions and authoritative metrics;
- historical proposal versions cannot be silently mutated;
- public discovery has appropriate resource/abuse/correlation controls;
- critical map/proposal browser flow has Playwright coverage;
- normal tests remain deterministic and network-independent;
- all Phase 4 contract docs agree.