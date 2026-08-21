# Krunditark

**Tea enne, kui ehitad.**

Krunditark is an Estonia-first property/buildability decision platform. It helps a person find the correct parcel, understand supported official constraints, test a concrete building scenario on the map, compare alternatives, understand supported administrative next steps and keep a reproducible project history.

The flagship user-facing product is **Ehituspass**.

> Krunditark is an information and decision-support service. It does not issue permits or official approvals and must never present AI-generated wording as an authority decision or legal advice.

## Product position

Krunditark is deliberately **not just an AI chatbot**.

The core product is:

```text
real parcel
+ user intent
+ exact proposed geometry/scenario
+ versioned official source data
+ deterministic PostGIS checks
+ verified versioned rules
= reproducible findings + map evidence + next actions
```

Google Gemini may explain the already-computed result in plain language, but it cannot change the factual state.

The long-term differentiation is scenario modeling, variant comparison, project history/change monitoring, pre-purchase checks and professional/B2B workflows.

## Primary user journeys

Krunditark should support different decisions on the same parcel.

### I want to build

1. Search by **address, cadastral ID or map**.
2. Select the exact parcel.
3. See the free parcel overview.
4. Choose the `build` intent.
5. When stateful proposal work begins, create/reuse an anonymous Supabase Auth identity and owner-scoped guest project without showing a permanent-signup wall.
6. Start from a simple footprint template or enter dimensions.
7. Drag/rotate/resize the structure on the parcel.
8. Validate/canonicalize the proposal server-side and persist a proposal version.
9. Run Ehituspass when the deterministic analysis phases are available.
10. See conflicts, conditions, unknowns, sources and next steps.
11. Duplicate/move the proposal and compare variants in the later variant workflow.

### I am considering buying land

Use the future **Ostukontroll** flow:

- supported planning/restriction/environment/road/building context;
- important unknowns;
- questions to ask seller/KOV;
- optionally test a concrete house on the parcel afterward.

### I am a professional

Future Pro workflows add:

- many projects;
- advanced map/source detail;
- reusable templates;
- team/workspace;
- batch/API;
- client sharing/export.

The factual engine remains the same.

See [`docs/USER_JOURNEYS_AND_PERSONAS.md`](./docs/USER_JOURNEYS_AND_PERSONAS.md).

## User-experience decisions

- Consumer landing starts with **`Sisesta aadress või katastritunnus`**.
- A cadastral ID is not required as the only entry method.
- `Vali krunt kaardilt` is a real parcel-discovery path, not a decorative CTA.
- No forced permanent account before the user sees meaningful parcel/proposal value.
- Anonymous Supabase Auth may be created invisibly when stateful project ownership becomes necessary.
- Beginner mode uses building templates + drag/rotate rather than requiring GIS polygon drawing.
- Every material result shows source/freshness.
- Every report ends with next actions.
- `unknown` is a first-class safe result.
- No fake “92% buildable” score.
- Map findings always have textual equivalents.
- Parcel selection is not proof of ownership.

See [`docs/UX_UI_SPEC.md`](./docs/UX_UI_SPEC.md), [`docs/PHASE_4_READINESS.md`](./docs/PHASE_4_READINESS.md) and [`docs/PHASE_4_IMPLEMENTATION_GUIDE.md`](./docs/PHASE_4_IMPLEMENTATION_GUIDE.md).

## Authentication

Krunditark uses a **guest-first** onboarding model.

- Public parcel discovery/free overview does not require permanent identity.
- Supabase anonymous Auth owns temporary guest projects once stateful proposal work begins.
- Consumer can later link/convert to permanent identity.
- Primary permanent methods: email OTP and Google.
- No password required by default.
- Production email Auth requires custom SMTP.
- Account conversion must preserve the exact parcel/proposal.

See [`docs/AUTH_AND_ONBOARDING.md`](./docs/AUTH_AND_ONBOARDING.md), ADR 0006 and ADR 0009.

## Languages

Estonia is the only initial market, but the product is multilingual.

Architecture target from the first frontend implementation:

- **ET** — canonical/default and legal terminology source;
- **RU** — full consumer localization target;
- **EN** — full consumer/professional localization target.

Critical legal/status/payment/privacy wording is controlled/reviewed; Gemini may localize explanations but not reinterpret findings.

See [`docs/LOCALIZATION_AND_LANGUAGE.md`](./docs/LOCALIZATION_AND_LANGUAGE.md) and ADR 0008.

## Commercial direction

Krunditark uses a **hybrid** model rather than forcing every consumer into a subscription.

Recommended product ladder to validate:

- free `Krundi ülevaade`;
- one-time `Ostukontroll`;
- one-time `Ehituspass`;
- limited-duration `Projektipass` for an active project;
- recurring Pro/Team plans for professional repeat users;
- B2B/API later;
- professional referral/review layer later.

Current price points are test hypotheses, not permanent constants.

Krunditark should **not use programmatic/banner advertising inside the analysis/report workspace**. Future sponsored/referral provider content must be separate and cannot influence findings.

See:

- [`docs/BUSINESS_MODEL_AND_PRICING.md`](./docs/BUSINESS_MODEL_AND_PRICING.md)
- [`docs/COMMERCE_AND_ENTITLEMENTS.md`](./docs/COMMERCE_AND_ENTITLEMENTS.md)
- ADR 0007.

## Architecture

Current direction:

### Frontend

- React
- TypeScript strict mode
- Vite
- **Leaflet 1.9.x stable** for Phase 4 map/editor work
- optional `@geoman-io/leaflet-geoman-free` for Phase 4 geometry editing where the required capability exists in the free package
- React Router
- typed Krunditark API clients
- explicit runtime validation at external trust boundaries
- i18n architecture from first UI

TanStack Query and Zod are **not mandatory dependencies**. ADR 0009 clarifies ADR 0001: runtime validation is mandatory, but the implementation may use explicit deterministic parsers/validators; TanStack Query is introduced only when shared server-state/cache complexity justifies it. Do not create duplicate cache/validation ownership merely to match an old stack list.

### Backend

- Supabase Cloud
- PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Supabase Cron/scheduled orchestration
- ordered SQL migrations under `supabase/migrations/`

### AI

- Google Gemini API
- current supported Google GenAI SDK/API at implementation time
- server-side only
- `GEMINI_API_KEY` stored as server secret
- model ID configured server-side
- structured/validated outputs
- deterministic fallback

### Hosting

- development/preview: GitHub Pages (repository path)
  - deploy workflow: `.github/workflows/deploy-pages.yml`
  - `VITE_BASE_PATH` configures repository-path asset loading
- production: Cloudflare-compatible static hosting direction; final production hosting remains subject to the explicit production decision/open question
- custom domain: `krunditark.ee`
- domain registration: Zone
- backend: Supabase unless an ADR changes it

### Phase 4 map architecture

ADR 0010 resolves the Phase 4 renderer/basemap decision:

- Leaflet 1.9.x stable;
- Maa- ja Ruumiamet pre-tiled **`Kaart`** as default and **`Ortofoto`** as optional mode;
- browser tile requests go through a Krunditark-owned fixed/allow-listed proxy;
- source/data-age attribution stays visible;
- Google Maps and MapLibre are not the Phase 4 runtime map stack;
- public OpenStreetMap demo tile endpoints are not the production provider merely because they work without credentials;
- canonical geospatial truth remains server/PostGIS-side in EPSG:3301.

See [`docs/MAP_STACK_AND_BASEMAP.md`](./docs/MAP_STACK_AND_BASEMAP.md) and ADR 0010.

## Data refresh architecture

A normal analysis does **not** query every government source again.

Canonical policy: [`docs/DATA_REFRESH_AND_CACHE.md`](./docs/DATA_REFRESH_AND_CACHE.md).

High-level:

```text
Official sources
   |
   +--> heavy spatial scheduled/incremental sync
   +--> cheap daily/weekly change watches where supported
   +--> live/short-cache interactive lookup where appropriate
   v
versioned source datasets
   v
verified composite data release
   v
local PostGIS + verified rules
   v
cached Ehituspass
   v
cached Gemini explanation
```

Examples:

- heavy analytical spatial data: monthly baseline where appropriate;
- Riigi Teataja: cheap legal version/hash watch more frequently;
- EHR: incremental changed-after synchronization where approved;
- In-AKS: live/short-cache address lookup.

Routine sync uses **zero Gemini tokens**.

Failed sync never erases the last known-good verified dataset.

`docs/DATA_REFRESH_AND_VERSIONING.md` is compatibility-only and must not be used as the canonical implementation policy.

## Official-source baseline

Priority sources include:

- Maa- ja Ruumiamet cadastral and restriction data;
- In-AKS address search;
- PLANIS planning data/WMS/WFS;
- E-ehitus/EHR APIs where public/authorized;
- Keskkonnaportaal/EELIS selected public spatial data;
- Riigi Teataja legal sources;
- verified Muinsuskaitse authoritative data;
- verified Transpordiamet/road data;
- local-government sources where structured national data is incomplete;
- later utility/elevation/flood/geology sources.

See [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md).

## Source-of-truth rule

Krunditark separates deterministic facts from explanation:

```text
Official/source data
      |
      v
versioned normalization/data release
      |
      v
PostGIS facts + verified deterministic rules
      |
      v
immutable structured analysis
      |
      +--> deterministic user-facing templates
      |
      +--> optional Google Gemini explanation
```

Gemini never becomes the legal/geospatial authority.

## Geospatial rule

Official Estonian spatial datasets commonly use L-EST97 / **EPSG:3301**.

- Canonical persisted parcel/proposal/constraint geometry is EPSG:3301.
- Authoritative metric distance/area/intersection calculations run server-side/PostGIS in an appropriate metric CRS.
- Browser display/API GeoJSON may use EPSG:4326 as documented.
- Leaflet display uses normal browser map projection/rendering and never becomes the canonical CRS.
- Never calculate material legal distances with naive lat/lon degree arithmetic.
- Client-computed proposal area/perimeter are previews only; server/PostGIS values are authoritative.

## Security rule

No privileged credential may ship in the static frontend.

Browser may use only public/publishable Supabase configuration and RLS-protected APIs.

Server secrets include, as applicable:

- elevated Supabase/server credentials;
- Gemini API key;
- external provider credentials;
- payment provider/webhook secrets;
- SMTP credentials.

Owner-scoped guest persistence uses the anonymous user's own JWT/RLS path; do not use a service-role/shared identity to bypass ownership.

## Historical reproducibility

A completed Ehituspass records/references at least:

- exact parcel/proposal version;
- data release;
- source dataset versions;
- rule versions;
- source evidence;
- measurements/geometry evidence;
- analysis engine/profile version;
- analysis date.

Old reports are never silently rewritten using current data.

## Documentation map

Implementation agents must read [`AGENTS.md`](./AGENTS.md) first.

### Core product

| Document                                                                         | Purpose                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`AGENTS.md`](./AGENTS.md)                                                       | Non-negotiable coding-agent contract                      |
| [`TASKS.md`](./TASKS.md)                                                         | Ordered active engineering backlog                        |
| [`docs/PHASE_4_READINESS.md`](./docs/PHASE_4_READINESS.md)                       | Phase 0–3 -> Phase 4 cross-cutting implementation gate    |
| [`docs/PHASE_4_IMPLEMENTATION_GUIDE.md`](./docs/PHASE_4_IMPLEMENTATION_GUIDE.md) | KT-038…KT-048 task contracts, tests and task-specific DoD |
| [`docs/PRODUCT_REQUIREMENTS.md`](./docs/PRODUCT_REQUIREMENTS.md)                 | Full product requirements                                 |
| [`docs/USER_JOURNEYS_AND_PERSONAS.md`](./docs/USER_JOURNEYS_AND_PERSONAS.md)     | Real users, problems and end-to-end journeys              |
| [`docs/UX_UI_SPEC.md`](./docs/UX_UI_SPEC.md)                                     | Landing, map, report, mobile, Pro and design-system UX    |
| [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md)                                       | Minimum first trustworthy vertical slice                  |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                                           | Full product evolution                                    |
| [`docs/PRODUCT_EXPANSION_BACKLOG.md`](./docs/PRODUCT_EXPANSION_BACKLOG.md)       | Post-core initiatives before promotion to TASKS           |

### Architecture/data

| Document                                                             | Purpose                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)                     | Service/system boundaries                                  |
| [`docs/MAP_STACK_AND_BASEMAP.md`](./docs/MAP_STACK_AND_BASEMAP.md)   | Leaflet/MaRu tile proxy, attribution and map-mode contract |
| [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)               | PostgreSQL/PostGIS data model                              |
| [`docs/API_SPECIFICATION.md`](./docs/API_SPECIFICATION.md)           | Client API contract                                        |
| [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md)                     | Official source registry                                   |
| [`docs/DATA_REFRESH_AND_CACHE.md`](./docs/DATA_REFRESH_AND_CACHE.md) | Canonical source refresh/cache/release policy              |
| [`docs/GIS_AND_RULES_ENGINE.md`](./docs/GIS_AND_RULES_ENGINE.md)     | Spatial/rule semantics                                     |

### AI/auth/language/commerce

| Document                                                                                     | Purpose                                        |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`docs/AI_SAFETY_AND_EXPLANATIONS.md`](./docs/AI_SAFETY_AND_EXPLANATIONS.md)                 | Gemini boundary/safety                         |
| [`docs/AUTH_AND_ONBOARDING.md`](./docs/AUTH_AND_ONBOARDING.md)                               | Guest-first Auth/account flow                  |
| [`docs/LOCALIZATION_AND_LANGUAGE.md`](./docs/LOCALIZATION_AND_LANGUAGE.md)                   | ET/RU/EN strategy                              |
| [`docs/BUSINESS_MODEL_AND_PRICING.md`](./docs/BUSINESS_MODEL_AND_PRICING.md)                 | Monetization/pricing/unit economics hypotheses |
| [`docs/COMMERCE_AND_ENTITLEMENTS.md`](./docs/COMMERCE_AND_ENTITLEMENTS.md)                   | Provider-neutral payment/access design         |
| [`docs/MARKET_AND_COMPETITIVE_POSITIONING.md`](./docs/MARKET_AND_COMPETITIVE_POSITIONING.md) | Market position/defensibility                  |
| [`docs/PRODUCT_ANALYTICS_AND_GROWTH.md`](./docs/PRODUCT_ANALYTICS_AND_GROWTH.md)             | Metrics, experiments and growth loops          |

### Trust/operations

| Document                                                         | Purpose                                      |
| ---------------------------------------------------------------- | -------------------------------------------- |
| [`docs/SECURITY_PRIVACY.md`](./docs/SECURITY_PRIVACY.md)         | RLS, privacy and threat model                |
| [`docs/LEGAL_AND_COMPLIANCE.md`](./docs/LEGAL_AND_COMPLIANCE.md) | Legal-source/disclaimer policy               |
| [`docs/TESTING.md`](./docs/TESTING.md)                           | Test strategy                                |
| [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md)                   | Environment/config contract                  |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)                     | GitHub Pages/Supabase/Cloudflare deployment  |
| [`docs/DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md)     | Global completion gate                       |
| [`docs/OPEN_QUESTIONS.md`](./docs/OPEN_QUESTIONS.md)             | Genuine unresolved decisions only            |
| [`docs/AGENT_TASK_WORKFLOW.md`](./docs/AGENT_TASK_WORKFLOW.md)   | Agent branch/implementation/test/PR workflow |
| [`docs/adr/`](./docs/adr/)                                       | Accepted architecture/product decisions      |

Important Phase 4 ADRs:

- ADR 0001 — base technology stack, as superseded for map renderer by ADR 0010;
- ADR 0006 — guest-first authentication;
- ADR 0008 — multilingual product;
- ADR 0009 — client/server state, query and validation boundaries;
- ADR 0010 — Leaflet + Maa- ja Ruumiamet basemap/proxy decision.

## Current project status

Phase 0–3 foundations are implemented through the free parcel overview.

Current verified foundation includes:

- React 18 + TypeScript strict + Vite 6;
- React Router locale-aware routing;
- ET/RU/EN i18n foundation;
- ESLint/Prettier/Vitest/Testing Library;
- GitHub Actions format/lint/typecheck/database/test/build pipeline;
- Supabase/PostgreSQL/PostGIS migrations and RLS/database tests;
- canonical EPSG:3301 parcel/proposal geometry policy;
- cadastral validation;
- official In-AKS address search path;
- MaRu cadastral/address/point parcel resolution;
- explicit parcel ambiguity/failure semantics;
- free parcel overview and intent choices.

The next implementation boundary is **Phase 4 readiness prerequisites KT-038/KT-039, followed by Phase 4 map and proposal creation KT-040–KT-048**. Before starting, read [`docs/PHASE_4_READINESS.md`](./docs/PHASE_4_READINESS.md) and [`docs/PHASE_4_IMPLEMENTATION_GUIDE.md`](./docs/PHASE_4_IMPLEMENTATION_GUIDE.md).

## Testing

- Unit/integration: `npm test` (Vitest + Testing Library)
- E2E/browser: `npm run test:e2e` (Playwright against production-like built frontend)
  - Requires Chromium (`npx playwright install chromium`)
  - Uses deterministic fixture/mock responses; no live official providers
  - Desktop Chromium + mobile viewport projects configured

See [`docs/TESTING.md`](./docs/TESTING.md) for the full strategy.

## Development rule

Do not begin a feature from a vague idea.

1. Pick an unblocked item from `TASKS.md`.
2. Read `AGENTS.md` and linked specs.
3. For Phase 4, read `docs/PHASE_4_READINESS.md`, `docs/PHASE_4_IMPLEMENTATION_GUIDE.md` and applicable ADRs first.
4. For map/editor tasks also read `docs/MAP_STACK_AND_BASEMAP.md` and ADR 0010.
5. Verify current official/provider documentation for unstable integration details.
6. Implement the smallest complete vertical slice.
7. Add tests, including real-browser coverage when the feature depends on browser/map interaction.
8. Update documentation/contracts.
9. Satisfy `DEFINITION_OF_DONE.md` plus the task-specific Phase 4 DoD.

Future product ideas in `PRODUCT_EXPANSION_BACKLOG.md` must be promoted into `TASKS.md` before implementation.

## License

No open-source license has been selected. Do not add one without an explicit owner decision.
