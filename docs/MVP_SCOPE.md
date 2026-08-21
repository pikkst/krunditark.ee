# MVP Scope — Krunditark

Last scope review: **2026-08-21**

## Objective

Deliver one trustworthy vertical slice:

> A user finds and confirms an Estonian cadastral parcel by address, cadastral identifier or map, chooses a supported build intent, places a supported proposed building on that parcel, runs a deterministic analysis, and receives a source-backed Ehituspass showing supported spatial conflicts/conditions, supported permit-path implications, unknowns and official next steps.

The MVP is successful when this works reliably for real supported Estonian parcels without using an LLM as the decision engine and without re-fetching every official source for every user request.

The vertical slice is deliberately narrow, but the entry UX is **not cadastral-ID-only**.

## In scope

### Geography

- Estonia only.
- Estonian official address/cadastral parcel discovery.
- L-EST97 / EPSG:3301-aware authoritative spatial analysis.
- Estonian canonical UI/copy with ET/RU/EN architecture preserved.

### Parcel discovery

The initial consumer may enter through:

- official address search;
- cadastral identifier;
- map selection.

Rules:

- address search uses the approved In-AKS path;
- cadastral identifiers are normalized/validated explicitly;
- map point selection resolves the parcel server-side;
- ambiguous results require explicit user confirmation;
- source unavailable is never presented as `not_found`/no restriction;
- parcel selection does not prove ownership.

### User input

For the initial build vertical slice:

- selected parcel;
- stable intent code;
- structure/scenario category;
- footprint placement/drawing;
- area/dimensions;
- height;
- storeys;
- intended use;
- optional project note where supported.

### Initial structure categories

Start with a deliberately small matrix that can be legally verified and tested, for example:

- detached house;
- sauna;
- shed / small auxiliary building;
- garage / auxiliary building.

**Candidate domain labels are not automatically supported legal product scenarios.**

Before KT-043 marks a structure as fully supported, OQ-005 / issue #51 must define the verified first scenario matrix against current official law. Unsupported/custom `Muu` may continue only under an explicitly limited-check contract and must never silently use a verified legal/process profile.

### Proposal creation

Beginner mode should provide templates/dimensions and map placement without requiring GIS expertise.

Phase 4 proposal state is split deliberately:

- browser/editor draft — mutable, browser-safe geometry/interchange;
- canonical persisted proposal — server-validated EPSG:3301 versioned geometry.

Server/PostGIS is authoritative for geometry validity and material metrics. Client-computed area/perimeter are previews only.

A persisted proposal is versioned. A proposal referenced by terminal analysis is never silently mutated in place.

See ADR 0009 and `PHASE_4_READINESS.md`.

### Official data categories

Required first integrations:

1. cadastral parcel geometry/basic facts;
2. cadastral restriction zones;
3. PLANIS planning areas and metadata;
4. selected public EELIS environmental layers;
5. official heritage protection data once a suitable machine-readable source is verified;
6. state-road/access context once a suitable official machine-readable source is verified.

EHR integration may enter late MVP only after exact API/access behavior is documented. It must not block the initial parcel + proposal + restriction vertical slice.

### Data refresh and versioning

`docs/DATA_REFRESH_AND_CACHE.md` is the **canonical** implementation policy.

MVP must include the foundation for source-specific scheduled/versioned official-data releases.

Required behavior:

- approved replicated sources are synchronized server-side rather than bulk-fetched during each user request;
- heavy analytical spatial sources use scheduled baseline/incremental reconciliation appropriate to each source, with a monthly baseline where that source policy says so;
- lightweight legal/source/schema/EHR change watches may run daily/weekly where appropriate;
- In-AKS remains an interactive live/short-cache source;
- source-specific manual/emergency refresh is possible through the same safety gates;
- source data is staged/validated before promotion;
- failed/incomplete refresh cannot replace the previous known-good version;
- exact source dataset versions are grouped into a promoted `data_release`;
- every completed analysis pins the exact `data_release_id` it used;
- historical analyses remain reproducible after later source refreshes;
- stale/carried-forward data is explicit in analysis freshness metadata;
- normal source synchronization uses zero Gemini tokens.

For an initial narrow vertical slice, one or more source adapters may temporarily use bounded server-side lookups before full national replication is implemented, but persisted analysis/provenance contracts must still be compatible with versioned source/data releases.

`docs/DATA_REFRESH_AND_VERSIONING.md` is compatibility-only and must not be treated as the implementation authority.

### Analysis categories

MVP must support:

- proposal inside/outside/touching parcel boundary;
- supported restriction intersections;
- supported distances needed by verified rules;
- planning-area detection;
- explicit statement when plan textual provisions have not been fully parsed;
- verified basic permit/notification/project requirements for the supported structure matrix;
- source freshness and completeness;
- data release identification;
- deterministic overall summary;
- official verification links.

### AI

MVP AI is an optional explanation layer using **Google Gemini API** server-side.

The product must remain fully functional without Gemini:

- factual findings still render;
- next steps still render from structured rule data;
- fallback templates explain findings;
- only conversational/plain-language enhancement is reduced.

Gemini is not used for routine source synchronization and is not used to rediscover current laws/restrictions for every parcel request.

### Guest-first accounts and project ownership

MVP uses a **guest-first, identity-later** model.

Public/identity-free value includes:

- landing/public content;
- parcel search and selection;
- free parcel overview.

When the user enters the **stateful proposal workflow**, the application creates/reuses a Supabase anonymous Auth identity and an owner-scoped guest project as needed. This is a technical ownership mechanism, not a permanent-account/signup wall.

Required behavior:

- guest project/proposal writes use normal `auth.uid()` + RLS ownership;
- anonymous A cannot access anonymous B;
- guest project creation is bounded/rate-controlled;
- selected parcel/intent and persisted proposal versions survive route/locale transitions;
- unlinked guest state may be lost if browser/session identity is lost and must be communicated before relying on long-lived recovery;
- later email OTP/Google conversion preserves the exact project/proposal;
- paid/durable cross-device recovery requires permanent identity according to the later account/commerce phases.

The minimum anonymous Auth/project-ownership slice is therefore a **Phase 4 dependency** before owner-RLS proposal persistence; full permanent-account UX remains later.

See ADR 0006, ADR 0009 and `AUTH_AND_ONBOARDING.md`.

### Map provider

MapLibre GL JS is fixed, but the production basemap/style/orthophoto provider is not yet fixed.

A development source may be used temporarily, but production-ready KT-040 requires OQ-003 / issue #50 to verify current terms, attribution, privacy, rate/availability expectations, orthophoto support and deployment configuration.

### Deployment

Development/public preview:

- GitHub Pages static frontend;
- Supabase Cloud backend;
- Supabase Cron / `pg_cron` for scheduled source synchronization where enabled.

Production hosting/DNS remains a separate explicit release decision.

## Explicitly out of scope for first MVP

Unless promoted by a documented product decision, do **not** block MVP on:

- automatic blueprint PDF interpretation;
- DXF/DWG/IFC import;
- AI-generated site plan;
- automatic optimal building placement;
- 3D building visualization;
- detailed terrain/slope engineering;
- geotechnical suitability;
- detailed flood simulation;
- guaranteed electricity capacity or connection price;
- guaranteed water/sewer connection feasibility;
- nationwide parsing of every historic KOV PDF/scan;
- automatic interpretation of every detailed-plan textual clause;
- official application submission to EHR;
- payment/billing;
- marketplace for architects/builders;
- professional digital signature of reports;
- mobile native apps;
- countries outside Estonia;
- batch developer API;
- property valuation;
- land ownership verification.

## MVP trust boundary

The MVP may say:

> “The proposed footprint intersects a supported registered restriction geometry from Krunditark data release X, sourced from authority Y and retrieved on date Z.”

It may say, where a verified rule supports it:

> “This intersection indicates that additional coordination/conditions are required.”

It must not generalize that into:

> “You definitely cannot build here”

unless a specifically verified deterministic rule and evidence justify that exact conclusion.

## MVP data-completeness and freshness behavior

For each analysis category, store one completeness state:

- `complete_for_supported_scope`;
- `partial`;
- `unavailable`;
- `not_supported`.

For replicated source data, also retain freshness state such as:

- `fresh`;
- `warning`;
- `stale`;
- `unknown`.

The UI must disclose critical `partial`/`unavailable` categories and material stale/carried-forward sources.

A complete source dataset containing zero matching features is not the same as a source sync/request failing.

The date on which a user runs an analysis is not automatically the source-data date.

## MVP report sections

1. **Kokkuvõte**
2. **Katastriüksus**
3. **Kavandatav ehitis**
4. **Planeeringud**
5. **Kitsendused ja kaitsevööndid**
6. **Keskkond**
7. **Muinsuskaitse** when supported
8. **Tee ja juurdepääs** when supported
9. **Loa/teatise tee** for supported structure matrix
10. **Mida ei saanud automaatselt kontrollida**
11. **Järgmised sammud**
12. **Ametlikud allikad, data release ja andmete kuupäevad**
13. **Vastutuse piirang**

## MVP acceptance scenario

Given deterministic source/data fixtures, a parcel fixture and a proposal fixture:

1. user resolves the exact parcel through address/cadastral/map discovery;
2. stateful proposal work is safely owned by a guest/permanent `auth.uid()`;
3. browser proposal draft is server-validated and canonicalized to EPSG:3301;
4. source sync/version fixtures represent a promoted data release;
5. normalized source version fixtures are selected deterministically;
6. PostGIS calculates expected proposal metrics/intersections/distances;
7. rules engine creates expected findings;
8. analysis snapshot stores exact data release, source versions, rule versions and evidence;
9. API returns the documented contract;
10. UI renders findings, freshness and map evidence;
11. Gemini can be disabled and the report remains understandable;
12. all normal tests run without public network dependency.

Source-sync tests additionally prove:

- a second identical import is idempotent;
- incomplete/failed import cannot delete source objects or replace active version;
- candidate promotion is atomic;
- old analysis remains bound to its historical release;
- new analysis can use a newly promoted release;
- legal-source changes cannot automatically verify a new deterministic rule.

A separate controlled integration environment may verify live official providers.

## Phase 4 readiness before continuing the vertical slice

Read `docs/PHASE_4_READINESS.md` before KT-040–KT-048.

At minimum:

- production map source/attribution decision is explicit before production-ready map status;
- map-based parcel selection is wired end to end;
- anonymous guest ownership is available before persisted owner-RLS proposal writes;
- intent codes are canonical and locale-independent;
- verified structure support is separate from a valid enum value;
- proposal browser draft and canonical persisted proposal are separate contracts;
- real-browser Playwright coverage protects critical map/editor routing/interaction;
- public discovery functions have bounded resource/abuse behavior.

## Launch blockers

MVP must not launch publicly as a decision-support product if any of these are true:

- service/elevated secret is exposed to browser;
- user/anonymous RLS isolation is not verified;
- source failure is displayed as “no restriction”/not found;
- map parcel ambiguity can silently select the wrong parcel;
- persisted proposal geometry/metrics can be trusted from client input without server validation;
- a failed/incomplete scheduled import can replace the previous verified dataset;
- analyses cannot identify the exact promoted data release/source versions used;
- production legal rules lack official source/version metadata;
- detected legal changes can silently overwrite verified rules;
- Gemini can change deterministic finding status;
- Gemini is required for normal source synchronization;
- map/report lacks required source attribution;
- production map usage violates provider terms/attribution requirements;
- current law/source review has not been completed for the supported rule matrix;
- critical user journey lacks production-like browser E2E coverage before public beta.
