# Phase 4 Implementation Guide — Map and Proposal Creation

Last reviewed: **2026-08-21**

This document is the detailed implementation contract for Phase 4 work. It complements `TASKS.md` and `docs/PHASE_4_READINESS.md` and is mandatory reading for every Phase 4 task.

Source-of-truth order remains `AGENTS.md` -> accepted ADRs -> `TASKS.md` -> this guide -> detailed specs.

## Phase 4 fixed architecture

Before coding any Phase 4 task, assume these decisions unless a newer ADR supersedes them:

- React + TypeScript strict + Vite + React Router;
- Leaflet 1.9.x stable for the browser map (ADR 0010);
- optional `@geoman-io/leaflet-geoman-free` for Phase 4 geometry editing; no Pro dependency required;
- Maa- ja Ruumiamet pre-tiled `Kaart` + `Ortofoto` basemaps through a Krunditark-owned fixed proxy;
- browser display/interchange may use EPSG:4326/3857, canonical Parcel/Proposal remains EPSG:3301;
- Supabase anonymous Auth owns stateful guest projects before proposal persistence;
- browser proposal draft is mutable/non-authoritative;
- server/PostGIS validates/canonicalizes and computes authoritative geometry metrics;
- persisted proposals are versioned;
- no permanent account is required to reach meaningful parcel/proposal value;
- normal CI uses deterministic fixtures, not live MaRu/In-AKS services.

## Shared Phase 4 engineering rules

Every task must:

1. preserve existing Phase 0–3 parcel/source/freshness/error semantics;
2. use locale-independent IDs/domain codes in application state;
3. keep user-facing text in ET/RU/EN catalogs according to current localization status;
4. preserve loading/error/unsupported states rather than collapsing them into empty success;
5. keep source attribution and uncertainty visible;
6. keep authoritative GIS on server/PostGIS;
7. avoid a second parallel Parcel/Proposal/project model;
8. add unit/component/integration/E2E coverage appropriate to the task;
9. update API/architecture/UX docs in the same PR if the contract changes;
10. satisfy `docs/DEFINITION_OF_DONE.md` in addition to the task-specific DoD below.

---

# KT-038 — Add real-browser E2E foundation

## Objective

Create the browser-level safety net before the map/editor workflow becomes timing-, layout- and pointer-sensitive.

## Dependencies

- Phase 0 CI/build foundation.
- Existing deterministic component/API fixtures.

## Implementation contract

- Add Playwright as a pinned dev dependency through the lockfile.
- Add `test:e2e` or an equivalently explicit script.
- E2E runs against a production-like built frontend, not only `vite dev`.
- Backend/network behavior in normal CI is controlled by deterministic fixtures/mocks/test endpoints; no live official-provider dependency.
- Cover desktop Chromium and at least one mobile viewport/project.
- Store failure trace/screenshots where they materially help diagnosis.
- E2E must not require developer-local secrets.
- CI execution time should remain bounded; broad beta coverage remains KT-136.

## Minimum tests

- locale landing route opens from built app;
- deterministic parcel discovery/selection reaches free overview;
- intent selection enters Phase 4 route without state loss;
- map container can mount at non-zero dimensions;
- mobile route remains operable;
- provider fixture failure produces the expected UI state rather than hanging.

## Definition of Done

- [ ] Playwright dependency and browser install strategy are committed/documented.
- [ ] `npm run test:e2e` (or documented equivalent) works from a clean clone/CI environment.
- [ ] tests use the production build/preview server path.
- [ ] deterministic test backend/network setup is documented.
- [ ] desktop Chromium test passes.
- [ ] mobile viewport/project test passes.
- [ ] failing E2E produces useful diagnostics.
- [ ] normal E2E does not call live MaRu/In-AKS/Gemini/payment services.
- [ ] GitHub Actions runs the agreed critical E2E gate.
- [ ] `TESTING.md` and task docs match the implemented command/setup.

## Out of scope

Full report/payment/auth-conversion beta journey; that remains KT-136 and later phases.

---

# KT-039 — Establish Phase 4 guest workflow ownership/state

## Objective

Ensure the stateful proposal workflow has a real owner and deterministic route/state behavior without creating a permanent-account signup wall.

## Dependencies

- ADR 0006.
- ADR 0009.
- existing projects/RLS schema and clean-start tests.

## Implementation contract

- Public search/free overview remains possible without permanent identity.
- When the user enters the stateful build/proposal flow, create or reuse a Supabase anonymous Auth session.
- Create or reuse an owner-scoped guest project through the normal RLS path.
- Persist/reference the confirmed parcel and canonical intent in project state.
- Never use a browser service-role key, shared guest identity or globally writable draft row.
- Define one explicit application-state contract for `projectId`, selected parcel reference, intent and current draft.
- Locale route changes preserve project/draft.
- Browser back/forward behavior is deterministic.
- Refresh behavior is documented: persisted project state is recoverable; unsaved draft loss/restore behavior must be explicit.
- Guest limits are bounded even if full production abuse controls are later.

## Required tests

- anonymous A creates/reads own project;
- anonymous A cannot read/update B;
- public visitor cannot access private guest project;
- entering build flow creates/reuses anonymous identity once;
- repeated route transitions do not create duplicate projects;
- locale change preserves project/parcel/intent;
- refresh recovers persisted state as documented;
- no service-role credential exists in browser bundle/config.

## Definition of Done

- [ ] anonymous Auth creation/reuse path is implemented.
- [ ] project owner is current `auth.uid()`.
- [ ] selected parcel + intent use stable domain IDs/codes.
- [ ] RLS owner isolation is verified against clean DB/live DB test path where applicable.
- [ ] no permanent signup is shown merely to enter proposal editing.
- [ ] route/locale/back-forward behavior is covered by component and/or Playwright tests.
- [ ] refresh/recovery semantics are documented and tested.
- [ ] duplicate anonymous project creation on retry/navigation is prevented or safely reconciled.
- [ ] guest project creation is bounded.
- [ ] auth/network failures preserve a recoverable UI state.
- [ ] `AUTH_AND_ONBOARDING.md`, architecture and API docs match implementation.

## Out of scope

Email OTP, Google OAuth, cross-device recovery and full anonymous-account cleanup policy.

---

# KT-040 — Add Leaflet map shell and map-entry flow

## Objective

Introduce the production-directed browser map shell and make `Vali krunt kaardilt` a real parcel-selection path.

## Dependencies

- KT-038.
- ADR 0010.
- issue #50 research/operational requirements.
- existing `parcel-resolve` point selector.

## Implementation contract

### Renderer

- Use Leaflet 1.9.x stable.
- Import required Leaflet CSS through the app build; no CDN dependency in production bundle.
- Encapsulate Leaflet behind `components/map` / owned map adapter APIs.
- Map instance lifecycle is explicit: create once per mounted shell, remove listeners/map on unmount.
- Do not leak Leaflet object types into domain models.

### Basemap

- Default mode: `Kaart`.
- Optional mode: `Ortofoto`.
- Use Krunditark-owned tile proxy only; no direct production browser request to MaRu tile origin.
- No Google Maps SDK/base layer.
- Do not use browser WMS fan-out for the main basemap when pre-tiled MaRu services are available.
- Attribution remains visible on desktop/mobile.
- Tile failure shows degraded-map state but preserves overlays/workflow.

### Map parcel selection

- `Vali krunt kaardilt` navigates/opens map-selection mode.
- One deliberate click/tap invokes canonical point parcel resolution.
- No parcel-resolve request on pointer/mouse move.
- pending request has visible loading state and repeat-click behavior is controlled.
- `resolved` / `ambiguous` / `not_found` / `unavailable` / `invalid_source` remain distinct.

### Performance/accessibility

- Lazy-load Leaflet/map code where practical so landing does not pay the full map cost before map is needed.
- Map controls have accessible labels.
- Map is not the only way to understand selected parcel/result.
- Container sizing works through desktop/mobile layouts and route transitions.

## Required tests

- map module lazy-load boundary;
- map mount/unmount does not duplicate listeners;
- Kaart/Ortofoto mode switch keeps overlays/state;
- visible attribution in both modes;
- one click -> one point-resolution request;
- pointer move -> zero requests;
- rapid click/pending behavior bounded;
- tile failure -> degraded map message, not parcel not-found;
- desktop + mobile Playwright smoke.

## Definition of Done

- [ ] Leaflet 1.9.x is pinned through lockfile.
- [ ] no MapLibre/Google map runtime dependency is introduced for Phase 4.
- [ ] MaRu basemap modes are configured through owned proxy URL/config.
- [ ] default `Kaart` and optional `Ortofoto` work.
- [ ] attribution/data-age metadata is visible and sourced from config/metadata.
- [ ] tile proxy contract is allow-listed and documented.
- [ ] map click calls canonical `parcel-resolve` point selector.
- [ ] ambiguous parcel flow requires confirmation.
- [ ] tile failure degrades safely.
- [ ] map code is lazy-loaded where practical and bundle impact is reviewed.
- [ ] desktop/mobile map sizing and controls pass Playwright.
- [ ] MaRu provider-contact/proxy operational requirement is recorded for the target public environment.
- [ ] `MAP_STACK_AND_BASEMAP.md`, environment/deployment docs and UX docs match implementation.

## Out of scope

Proposal editing, advanced polygon editing, analytical Phase 5 layers, legal findings.

---

# KT-041 — Render and confirm selected parcel

## Objective

Render the exact selected parcel consistently regardless of whether it came from address, cadastral ID or map click.

## Dependencies

- KT-040.
- canonical Parcel model and CRS helpers.

## Implementation contract

- Use canonical selected-parcel domain data; no second map-specific parcel DTO becomes product state.
- Convert canonical EPSG:3301 parcel geometry to browser-safe geometry through the established conversion boundary.
- Render Polygon and MultiPolygon including interior rings/holes correctly.
- Fit bounds with padding; avoid pathological zoom for tiny/huge parcels.
- Parcel source layer styling is visually distinct from future proposal layer.
- Search-resolved and map-resolved parcels use the same rendering path.
- Map ambiguity requires explicit user selection; never choose by array order.
- Selected parcel summary stays available textually.

## Required tests

- Polygon rendering;
- Polygon with hole;
- MultiPolygon;
- fit bounds calculation/command;
- search-resolved == map-resolved render contract;
- ambiguous candidate explicit confirmation;
- unavailable/invalid-source states do not render stale candidate as confirmed;
- mobile confirmation UI.

## Definition of Done

- [ ] exact confirmed parcel outline renders.
- [ ] holes/MultiPolygon are preserved.
- [ ] bounds fit is deterministic and usable.
- [ ] parcel/proposal visual roles are tokenized/separate.
- [ ] all entry methods converge on the same selected-parcel state.
- [ ] ambiguous result cannot become selected without user confirmation.
- [ ] parcel facts/source/freshness remain text-accessible.
- [ ] no authoritative geometry calculation moved into Leaflet.
- [ ] component + Playwright tests cover confirmation flow.
- [ ] locale switch does not lose selected parcel.

## Out of scope

Proposal footprint or analysis evidence layers.

---

# KT-042 — Build intent step

## Objective

Persist the user's real decision context using canonical `IntentCode` values and route only supported flows.

## Dependencies

- KT-039.
- KT-024 intent domain contract.

## Canonical intent codes

- `build`
- `pre_purchase`
- `understand_parcel`
- `existing_building_modification`
- `professional`

## Implementation contract

- User-facing labels are localized; persisted IDs are canonical codes.
- `build` enters active Phase 4 proposal flow.
- `understand_parcel` remains in parcel-context path.
- `pre_purchase` is explicitly planned/placeholder until Ostukontroll is implemented; no fake full support.
- `existing_building_modification` is explicitly unsupported/planned and must not reuse new-building rules.
- `professional` is a future context marker/route, not an automatic legal-analysis profile.
- Selecting/changing intent updates owner project state deterministically.
- Route changes keep project and parcel.

## Required tests

- each card -> correct canonical code;
- locale changes labels only, not stored code;
- unsupported/planned intents show correct state;
- build route preserves project/parcel;
- invalid intent never persists;
- retry/update behavior deterministic.

## Definition of Done

- [ ] all canonical intent choices are represented intentionally.
- [ ] no deprecated alias (`purchase_check`, `modify_existing_building`) is persisted as an intent code.
- [ ] localized labels do not leak into domain/database values.
- [ ] support state is distinct from code validity.
- [ ] build intent reaches structure selection.
- [ ] planned intents cannot accidentally run build rules.
- [ ] project intent persists under owner RLS.
- [ ] locale/navigation preserves intent/project/parcel.
- [ ] unit/component/Playwright coverage exists for the active build path.

## Out of scope

Implementing Ostukontroll or existing-building analysis.

---

# KT-043 — Build supported structure selection

## Objective

Let a beginner choose a structure scenario without implying unsupported legal coverage.

## Dependencies

- KT-042.
- OQ-005 / issue #51 verified scenario-matrix decision.

## Implementation contract

- Cards use stable structure/scenario codes, not translated labels.
- A domain-valid enum does not automatically mean product/legal support.
- Support metadata has explicit state such as `verified_supported`, `limited`, `planned`, `unsupported`.
- Only scenarios verified against current official law may be labeled fully supported.
- `Muu`/custom may continue only with explicit limited-check semantics.
- Unknown custom structure never silently maps to `sauna`, `auxiliary_building` or another verified rule profile.
- Card text states what will and will not be checked.

## Required tests

- verified card mapping;
- planned/unsupported card cannot masquerade as supported;
- `Muu` limited path;
- locale switch preserves code/support state;
- stale/missing support matrix fails safe (no all-supported default).

## Definition of Done

- [ ] issue #51/OQ-005 evidence required for any `verified_supported` scenario is linked/documented.
- [ ] support state is separate from structure code.
- [ ] cards use localized copy + stable domain code.
- [ ] `Muu` has explicit limited-check copy and state.
- [ ] no unsupported scenario can enter a verified rule profile silently.
- [ ] selected structure state survives navigation/locale change.
- [ ] tests cover supported, limited and unsupported states.
- [ ] UX/API/domain docs match support semantics.

## Out of scope

Implementing Phase 7 permit/process rules themselves.

---

# KT-044 — Build beginner footprint templates

## Objective

Create a low-friction proposal draft from simple dimensions without presenting templates as legal/design advice.

## Dependencies

- KT-043.
- ADR 0009.

## Implementation contract

- Offer a small curated set of rectangular starting dimensions plus `Sisestan ise mõõdud`.
- Template ID is UI provenance/convenience only in Phase 4.
- Result is a typed mutable editor draft, not a persisted authoritative Proposal.
- Width/length validation is deterministic and bounded.
- Initial footprint is placed relative to a documented parcel/map anchor without claiming optimal placement.
- Client area/perimeter are preview values only.
- Units are explicit metres/m².
- Templates are configurable/centralized, not duplicated in components/locales.

## Required tests

- each template creates expected dimensions/preview area;
- custom dimensions validation boundaries;
- invalid/zero/negative/non-finite values rejected;
- locale changes labels, not template structure;
- changing template replaces/updates draft according to explicit UX;
- no persistence/API call until the intended save/continue boundary.

## Definition of Done

- [ ] typed template registry exists.
- [ ] templates create deterministic browser draft geometry/dimensions.
- [ ] custom dimensions work with clear validation.
- [ ] template wording states convenience, not approval/design advice.
- [ ] no template ID is required as authoritative analysis input.
- [ ] client metrics are clearly preview-only.
- [ ] no implicit save/version is created merely by previewing templates.
- [ ] tests cover templates and dimension boundaries.
- [ ] mobile template controls are usable.

## Out of scope

Optimal placement, legal setback calculation, paid prefab catalog.

---

# KT-045 — Build proposal placement editor

## Objective

Let a beginner place and adjust a simple proposal footprint on the selected parcel using understandable map + numeric controls.

## Dependencies

- KT-040/041/044.
- ADR 0010.

## Implementation contract

### Editing

- drag footprint;
- rotate footprint;
- edit width/length numerically;
- reset/delete unpersisted draft;
- keep map manipulation and form values synchronized.

Use `@geoman-io/leaflet-geoman-free` only for capabilities verified in the free MIT package. Phase 4 must not rely on Pro-only features.

### State

- editor state is one typed draft model; avoid independent unsynchronized map/form copies.
- every editor operation emits a canonical draft-state update.
- locale route change preserves draft.
- accidental map pan must not mutate proposal.
- persisted proposal is not silently edited in place.

### UX

- desktop: map + side panel;
- mobile: map + bottom sheet/controls;
- touch targets and rotation/drag affordances understandable;
- provide numeric alternative to precision pointer operations;
- mark output as `Eelvaade` until server validation.

### Safety

- client can provide approximate boundary visual feedback but not authoritative legal distance/containment result;
- no analysis claim from Leaflet geometry alone.

## Required tests

- drag updates draft coordinates;
- rotate updates orientation/geometry;
- numeric resize updates footprint;
- reset/delete semantics;
- map pan does not mutate proposal;
- map/form synchronization after multiple operations;
- locale navigation preserves draft;
- mobile pointer/touch Playwright flow;
- invalid numeric edit leaves prior valid state or explicit invalid draft state without corruption.

## Definition of Done

- [ ] drag works.
- [ ] rotate works.
- [ ] numeric resize works.
- [ ] reset/delete works for unpersisted draft.
- [ ] map and form share one typed draft state contract.
- [ ] editor does not mutate selected parcel geometry.
- [ ] client preview is visually identified as non-authoritative.
- [ ] mobile bottom-sheet workflow is usable.
- [ ] keyboard/numeric alternative exists for essential placement parameters.
- [ ] no Geoman Pro feature is required.
- [ ] real-browser tests cover drag/rotate/resize and state preservation.
- [ ] cleanup/unmount does not leave duplicate map/plugin listeners.

## Out of scope

Advanced arbitrary polygon editing and authoritative GIS checks.

---

# KT-046 — Add advanced polygon mode

## Objective

Offer an explicit secondary mode for users who need non-rectangular footprints without making it the beginner default.

## Dependencies

- KT-045.

## Implementation contract

- advanced mode is opt-in (`Täpsem paigutus`).
- draw/edit polygon vertices using the selected Leaflet editing layer.
- enforce client-side soft/hard vertex/resource limits before server submission.
- prevent or clearly flag obviously invalid/self-intersecting drafts where the editing library can detect them, but server remains authoritative.
- preserve holes only if the Phase 4 proposal contract explicitly supports them; otherwise reject with clear limitation rather than flattening silently.
- conversion to request GeoJSON is deterministic.
- leaving advanced mode must not silently destroy draft without confirmation when data would be lost.

## Required tests

- create polygon;
- edit vertex;
- delete/reset;
- too many vertices;
- self-intersection/invalid draft feedback;
- conversion to GeoJSON;
- mobile limitations/controls documented and usable;
- advanced mode does not become default on normal template journey.

## Definition of Done

- [ ] advanced mode is clearly secondary.
- [ ] polygon draw/edit works.
- [ ] vertex/resource limits exist.
- [ ] invalid geometry feedback is explicit.
- [ ] unsupported hole/multipolygon semantics fail safe.
- [ ] draft serializes deterministically to server-request GeoJSON.
- [ ] switching modes handles possible data loss explicitly.
- [ ] component + real-browser tests cover create/edit/invalid cases.
- [ ] no client validation is described as authoritative acceptance.

## Out of scope

DXF/PDF/IFC import, snapping to authoritative legal layers, CAD-grade design.

---

# KT-047 — Server-side proposal validation/canonicalization

## Objective

Turn untrusted browser draft geometry into the only canonical Proposal input accepted for persistence/analysis.

## Dependencies

- ADR 0009.
- canonical CRS/domain validation helpers.
- PostGIS migration/test foundation.

## Implementation contract

### Input

Accept a typed request containing only the facts required by the proposal contract. Treat all browser geometry and metrics as untrusted.

### Validation pipeline

1. validate JSON/schema/type/size;
2. validate finite coordinates and geometry structure;
3. enforce supported browser/input CRS contract;
4. enforce Estonia/supported extent and vertex/resource limits;
5. transform to EPSG:3301 server-side;
6. validate topology with explicit repair policy;
7. calculate authoritative area and perimeter in metric CRS;
8. validate proposal domain dimensions/height/storeys/use where applicable;
9. return canonical normalized proposal input + warnings or typed error.

Do not trust client-supplied area/perimeter, bounding box or validity flags.

### Repair policy

No silent geometry repair that materially changes user intent. If `ST_MakeValid` or equivalent is used, policy must state when result can be accepted, when user confirmation is required and when request is rejected.

### Errors

Use stable codes for malformed geometry, unsupported CRS, outside supported area, too many vertices/resource limit, invalid topology and unsupported structure/scenario as applicable.

## Required tests

- valid rectangle/polygon;
- forged area/perimeter ignored;
- NaN/Infinity/invalid coordinate types;
- out-of-Estonia geometry;
- too many vertices/oversized payload;
- invalid/self-intersecting topology;
- touching/edge cases according to proposal validity semantics;
- transform reference fixture EPSG:4326 -> EPSG:3301;
- authoritative area/perimeter known fixture;
- deterministic same input -> same canonical output;
- repair-policy cases;
- no public-network dependency.

## Definition of Done

- [ ] request boundary accepts `unknown` and runtime-validates it.
- [ ] canonical output is EPSG:3301 only.
- [ ] client metrics are ignored/recomputed.
- [ ] authoritative area and perimeter are server-derived.
- [ ] geometry/resource limits are explicit constants/config with tests.
- [ ] unsupported CRS/extent/topology fail with typed safe errors.
- [ ] any repair behavior is documented and regression-tested.
- [ ] canonicalization is deterministic.
- [ ] API spec includes request/response/error contract.
- [ ] tests include malicious/oversized/invalid inputs.
- [ ] no proposal persistence occurs before successful canonical validation.

## Out of scope

Phase 5 restriction intersections and Phase 7 legal rules.

---

# KT-048 — Version proposal persistence

## Objective

Persist canonical validated proposals as owner-scoped versions without destroying history or creating retry/concurrency ambiguity.

## Dependencies

- KT-039.
- KT-047.
- existing `project_proposals` migration/RLS model.

## Implementation contract

- only canonical server-validated proposal data may be persisted;
- project owner is current anonymous/permanent `auth.uid()`;
- client cannot choose another owner/user ID;
- save creates a proposal version under the project's version lifecycle;
- editing an existing persisted scenario creates a new version when saved rather than mutating historical state;
- a proposal referenced by a terminal/completed analysis is immutable;
- retries must not create uncontrolled duplicate versions;
- concurrent saves/version number allocation must be transaction-safe;
- persistence response returns stable proposal ID/version and canonical metrics;
- client draft may remain dirty/new after server error; do not discard it.

### Idempotency/version allocation

Choose and document one safe mechanism, for example an idempotency key + unique constraint/transaction or equivalent. Same semantic save retry must not create a new version accidentally; same key with a different payload must fail safely.

## Required tests

- anonymous owner creates proposal;
- A cannot access B proposal;
- valid canonical proposal persists;
- invalid/unvalidated input rejected before write;
- same idempotent retry -> same saved outcome;
- same key + different payload -> conflict;
- concurrent version creation -> unique deterministic version sequence/no overwrite;
- editing persisted proposal -> new version;
- completed-analysis referenced proposal cannot mutate;
- DB rollback leaves no partial version;
- returned canonical area/perimeter agree with validation result.

## Definition of Done

- [ ] save path requires authenticated anonymous/permanent owner context.
- [ ] RLS owner isolation passes.
- [ ] persisted geometry is EPSG:3301 canonical geometry.
- [ ] proposal version creation is transaction-safe.
- [ ] retry/idempotency semantics are documented and tested.
- [ ] editing creates a new version instead of overwriting history.
- [ ] analysis-referenced proposal immutability is enforced/tested.
- [ ] server error preserves client draft/retry path.
- [ ] no service-role browser bypass exists.
- [ ] clean-start migration/RLS suite passes.
- [ ] API/database documentation matches actual version lifecycle.
- [ ] Phase 4 Playwright journey can save and reopen/re-render the exact persisted proposal in the same guest session.

## Out of scope

Full A/B comparison UI, permanent-account conversion, payment/entitlements and analysis execution.

---

# Phase 4 final integration/exit test

Before Phase 5 begins, run one controlled end-to-end scenario using deterministic/test data:

1. visitor opens landing without account;
2. selects parcel by search and separately proves map-click selection path;
3. confirms exact parcel;
4. sees free overview/source/freshness;
5. chooses `build` intent;
6. anonymous Auth + owner project is created/reused invisibly;
7. selects a verified-supported or intentionally limited structure;
8. creates beginner footprint draft;
9. drags, rotates and resizes it;
10. optionally enters advanced polygon mode and returns safely;
11. submits draft for server validation;
12. server returns canonical EPSG:3301 geometry + authoritative metrics;
13. saves a versioned owner-scoped proposal;
14. page refresh recovers persisted project/proposal;
15. locale switch preserves project/proposal identity;
16. another anonymous user cannot access it;
17. basemap failure does not destroy saved parcel/proposal state;
18. desktop and mobile Playwright flows pass;
19. normal CI makes no live official-provider requests.

Phase 4 is not complete because individual component tests pass. It is complete when this integrated contract works and all KT-038…KT-048 task-specific DoD items are satisfied.
