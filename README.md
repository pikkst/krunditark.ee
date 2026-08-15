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

Krunditark should support different decisions on the same parcel:

### I want to build

1. Search by **address, cadastral ID or map**.
2. Select the exact parcel.
3. Choose what you want to build.
4. Start from a simple footprint template or enter dimensions.
5. Drag/rotate the structure on the parcel.
6. Run Ehituspass.
7. See conflicts, conditions, unknowns, sources and next steps.
8. Duplicate/move the proposal and compare variants.

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
- No forced account before the user sees meaningful parcel/proposal value.
- Beginner mode uses building templates + drag/rotate rather than requiring GIS polygon drawing.
- Every material result shows source/freshness.
- Every report ends with next actions.
- `unknown` is a first-class safe result.
- No fake “92% buildable” score.
- Map findings always have textual equivalents.
- Parcel selection is not proof of ownership.

See [`docs/UX_UI_SPEC.md`](./docs/UX_UI_SPEC.md).

## Authentication

Krunditark uses a **guest-first** onboarding model.

- Supabase anonymous Auth may own temporary guest projects.
- Consumer can later link/convert to permanent identity.
- Primary permanent methods: email OTP and Google.
- No password required by default.
- Production email Auth requires custom SMTP.
- Account conversion must preserve the exact parcel/proposal.

See [`docs/AUTH_AND_ONBOARDING.md`](./docs/AUTH_AND_ONBOARDING.md) and ADR 0006.

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
- MapLibre GL JS
- React Router
- TanStack Query
- Zod at external boundaries
- i18n architecture from first UI

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

- development/public preview: GitHub Pages (repository path)
  - deploy workflow: `.github/workflows/deploy-pages.yml`
  - `VITE_BASE_PATH` configures repository-path asset loading
- domain registration: Zone
- primary production domain reserved: `krunditark.ee` (not yet attached)
- later Cloudflare DNS/edge/possibly static frontend hosting
- backend remains Supabase unless an ADR changes it

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

- Authoritative metric distance/area/intersection calculations run server-side/PostGIS in an appropriate metric CRS.
- Browser display/API GeoJSON may use EPSG:4326/3857 as documented.
- Never calculate material legal distances with naive lat/lon degree arithmetic.

## Security rule

No privileged credential may ship in the static frontend.

Browser may use only public/publishable Supabase configuration and RLS-protected APIs.

Server secrets include, as applicable:

- elevated Supabase/server credentials;
- Gemini API key;
- external provider credentials;
- payment provider/webhook secrets;
- SMTP credentials.

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

| Document                                                                     | Purpose                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`AGENTS.md`](./AGENTS.md)                                                   | Non-negotiable coding-agent contract                   |
| [`TASKS.md`](./TASKS.md)                                                     | Ordered active engineering backlog                     |
| [`docs/PRODUCT_REQUIREMENTS.md`](./docs/PRODUCT_REQUIREMENTS.md)             | Full product requirements                              |
| [`docs/USER_JOURNEYS_AND_PERSONAS.md`](./docs/USER_JOURNEYS_AND_PERSONAS.md) | Real users, problems and end-to-end journeys           |
| [`docs/UX_UI_SPEC.md`](./docs/UX_UI_SPEC.md)                                 | Landing, map, report, mobile, Pro and design-system UX |
| [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md)                                   | Minimum first trustworthy vertical slice               |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                                       | Full product evolution                                 |
| [`docs/PRODUCT_EXPANSION_BACKLOG.md`](./docs/PRODUCT_EXPANSION_BACKLOG.md)   | Post-core initiatives before promotion to TASKS        |

### Architecture/data

| Document                                                             | Purpose                                       |
| -------------------------------------------------------------------- | --------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)                     | Service/system boundaries                     |
| [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)               | PostgreSQL/PostGIS data model                 |
| [`docs/API_SPECIFICATION.md`](./docs/API_SPECIFICATION.md)           | Client API contract                           |
| [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md)                     | Official source registry                      |
| [`docs/DATA_REFRESH_AND_CACHE.md`](./docs/DATA_REFRESH_AND_CACHE.md) | Canonical source refresh/cache/release policy |
| [`docs/GIS_AND_RULES_ENGINE.md`](./docs/GIS_AND_RULES_ENGINE.md)     | Spatial/rule semantics                        |

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

| Document                                                         | Purpose                                     |
| ---------------------------------------------------------------- | ------------------------------------------- |
| [`docs/SECURITY_PRIVACY.md`](./docs/SECURITY_PRIVACY.md)         | RLS, privacy and threat model               |
| [`docs/LEGAL_AND_COMPLIANCE.md`](./docs/LEGAL_AND_COMPLIANCE.md) | Legal-source/disclaimer policy              |
| [`docs/TESTING.md`](./docs/TESTING.md)                           | Test strategy                               |
| [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md)                   | Environment/config contract                 |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)                     | GitHub Pages/Supabase/Cloudflare deployment |
| [`docs/DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md)     | Global completion gate                      |
| [`docs/OPEN_QUESTIONS.md`](./docs/OPEN_QUESTIONS.md)             | Genuine unresolved decisions only           |
| [`docs/adr/`](./docs/adr/)                                       | Accepted architecture/product decisions     |

## Current project status

The repository has initialized the **React/TypeScript/Vite frontend foundation** (KT-001) and added the **formatting/lint/test foundation** (KT-002).

Implemented:

- React 18 + TypeScript strict + Vite 6 at repository root.
- `src/` directory structure aligned with `ARCHITECTURE.md`.
- Minimal Estonian application shell with `HashRouter` for GitHub Pages compatibility.
- ESLint 9 (flat config), Prettier, Vitest 4, and Testing Library configured.
- `npm run format:check`, `lint`, `typecheck`, `test`, and `build` scripts verified.
- Minimal deterministic smoke tests for App and LandingPage.

Next steps follow `TASKS.md` (GitHub Actions CI, GitHub Pages preview, environment contract, i18n, Supabase, etc.).

## Development rule

Do not begin a feature from a vague idea.

1. Pick an unblocked item from `TASKS.md`.
2. Read `AGENTS.md` and linked specs.
3. Verify current official/provider documentation for unstable integration details.
4. Implement the smallest complete vertical slice.
5. Add tests.
6. Update documentation/contracts.
7. Satisfy `DEFINITION_OF_DONE.md`.

Future product ideas in `PRODUCT_EXPANSION_BACKLOG.md` must be promoted into `TASKS.md` before implementation.

## License

No open-source license has been selected. Do not add one without an explicit owner decision.
