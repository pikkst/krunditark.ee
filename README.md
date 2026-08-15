# Krunditark

**Tea enne, kui ehitad.**

Krunditark is an Estonia-first property intelligence and buildability platform. A user selects a cadastral parcel, describes or places a planned building on the map, and receives a source-backed analysis of what may affect the project: planning conditions, cadastral restrictions, environmental constraints, heritage constraints, road/access considerations, likely permit path, required next steps, and links to official sources.

The core user-facing product is the **Ehituspass** (Buildability Passport).

> Krunditark is an information and decision-support service. It does not issue permits and must never present an AI-generated interpretation as an official authority decision or legal advice.

## Project status

The repository is in the **foundation / pre-MVP** phase. The documentation in this repository is the source of truth for implementation.

Current deployment direction:

- Frontend: static React + TypeScript application.
- Development/public preview hosting: GitHub Pages.
- Backend: Supabase Cloud.
- Database: PostgreSQL + PostGIS.
- Authentication: Supabase Auth.
- Server-side API/orchestration: Supabase Edge Functions.
- Scheduled official-data refresh: Supabase Cron / `pg_cron` + Edge Functions.
- File storage: Supabase Storage.
- AI provider: **Google Gemini API** through the current Google GenAI SDK/API, called server-side only.
- Current domain registrar: Zone (`krunditark.ee`).
- Later edge/DNS/hosting target: Cloudflare, without assuming that `.ee` registration itself can be transferred to Cloudflare Registrar.
- Estonia only for MVP and initial production scope.

## Core principle

Krunditark must separate official-data acquisition, deterministic facts and AI explanation:

```text
Official data + legal sources
          |
          | scheduled ingestion / monthly baseline
          v
Versioned normalized data releases
PostgreSQL + PostGIS
          |
          v
GIS checks + versioned rules engine
          |
          v
Structured analysis result
          |
          v
Google Gemini explanation layer
          |
          v
Human-readable Ehituspass
```

Gemini is **not** the legal or geospatial decision engine. It may explain structured findings, summarize approved source material and help users understand next steps, but it may not invent rules, restrictions, permit requirements, distances, costs or authority decisions.

The Gemini API key is a server-side secret stored for Supabase Edge Functions. It must never be placed in frontend code or a `VITE_*` variable.

Official data is not rediscovered through Gemini or re-downloaded from every government source for every user request. Replicated sources are synchronized server-side into versioned Krunditark datasets, with a monthly full reconciliation as the baseline policy. Normal analyses read the latest eligible promoted data release.

## Primary user journey

1. User enters a cadastral identifier or searches for a parcel.
2. Krunditark resolves the parcel from the latest eligible promoted official-data release or an explicitly approved live source where required.
3. User opens the parcel on a map.
4. User selects a building type and provides dimensions/height/storeys.
5. User places, rotates or draws the proposed building footprint.
6. Backend selects the exact promoted data release and verified rule versions for the analysis.
7. PostGIS computes spatial intersections, distances and containment checks from normalized versioned data.
8. The rules engine evaluates versioned rules against the structured facts.
9. Krunditark returns findings classified as clear, conditional, conflicting or unknown.
10. Every material finding includes provenance: data release, source, retrieval time, legal/data version where available, and official link.
11. Google Gemini may convert the already-structured findings into understandable Estonian explanations without changing their meaning.
12. User receives an Ehituspass with required actions and official next-step links.

A user request does **not** normally trigger a national data refresh. Scheduled synchronization is an independent server-side process.

## Documentation map

Implementation agents must read [`AGENTS.md`](./AGENTS.md) first.

| Document | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Non-negotiable rules for coding agents |
| [`TASKS.md`](./TASKS.md) | Ordered implementation backlog |
| [`docs/PRODUCT_REQUIREMENTS.md`](./docs/PRODUCT_REQUIREMENTS.md) | Product requirements and acceptance criteria |
| [`docs/MVP_SCOPE.md`](./docs/MVP_SCOPE.md) | Exact MVP boundary |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System architecture and service boundaries |
| [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) | PostgreSQL/PostGIS data model |
| [`docs/API_SPECIFICATION.md`](./docs/API_SPECIFICATION.md) | Public/client API contract |
| [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) | Official source registry and adapter rules |
| [`docs/DATA_REFRESH_AND_VERSIONING.md`](./docs/DATA_REFRESH_AND_VERSIONING.md) | Monthly synchronization, data releases, freshness, change detection and promotion |
| [`docs/GIS_AND_RULES_ENGINE.md`](./docs/GIS_AND_RULES_ENGINE.md) | Spatial analysis and deterministic rule design |
| [`docs/AI_SAFETY_AND_EXPLANATIONS.md`](./docs/AI_SAFETY_AND_EXPLANATIONS.md) | Gemini integration plus allowed/forbidden AI behavior |
| [`docs/SECURITY_PRIVACY.md`](./docs/SECURITY_PRIVACY.md) | RLS, secrets, privacy and threat model |
| [`docs/LEGAL_AND_COMPLIANCE.md`](./docs/LEGAL_AND_COMPLIANCE.md) | Legal-source and disclaimer requirements |
| [`docs/UX_UI_SPEC.md`](./docs/UX_UI_SPEC.md) | Main screens and interaction rules |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | GitHub Pages, Supabase and later Cloudflare deployment |
| [`docs/TESTING.md`](./docs/TESTING.md) | Test strategy and deterministic fixtures |
| [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) | Environment variables and local setup contract |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Post-MVP expansion plan |
| [`docs/DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md) | Global completion gate |
| [`docs/adr/`](./docs/adr/) | Architecture decision records |

## Official-source baseline

The first implementation must be designed around official or authoritative sources, including:

- Maa- ja Ruumiamet / Geoportaal cadastral and restriction data.
- PLANIS planning data and WMS/WFS services.
- E-ehitus / Ehitisregister APIs and public data where available.
- Keskkonnaportaal / EELIS environmental spatial data.
- Riigi Teataja for legislation and versioned legal basis.
- Muinsuskaitse official data for monuments and protection zones.
- Transpordiamet for state-road/access-related data and requirements.
- Local-government sources where national structured data is incomplete.

See `docs/DATA_SOURCES.md` for source status, limitations and ingestion rules.

## Data refresh model

Replicated official data is maintained independently from user traffic.

Baseline:

- monthly full reconciliation for approved replicated datasets;
- manual/emergency refresh when an important change is known before the next scheduled run;
- source-specific freshness thresholds;
- candidate dataset validation before promotion;
- previous verified version remains active when a refresh fails;
- historical source versions remain available for reproducible analyses;
- legal text changes create review candidates and do not automatically rewrite production rules;
- normal scheduled synchronization uses zero Gemini tokens.

Each Ehituspass stores the exact `data_release_id` and rule/source version provenance used to produce it.

## Technology direction

### Frontend

- React
- TypeScript with strict mode
- Vite
- MapLibre GL JS
- React Router
- TanStack Query
- Zod at external data/API boundaries
- Accessible component primitives; avoid locking the project to a proprietary UI system

### Backend

- Supabase Cloud
- PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions (TypeScript/Deno)
- Supabase Cron / `pg_cron` for scheduled source synchronization
- SQL migrations committed under `supabase/migrations/`

### AI

- Google Gemini API
- Google GenAI SDK/API through a small Krunditark-owned adapter
- API key available only to Supabase Edge Functions
- selected Gemini model configured server-side rather than hard-coded across domain code
- structured/schema-validated explanation outputs
- deterministic non-AI fallback for every material finding
- no Gemini dependency in normal official-data synchronization

### Quality

- ESLint
- Prettier
- Vitest
- Playwright
- database/RLS tests
- deterministic rule-engine and GIS boundary tests
- source sync/change-detection/idempotency tests
- GitHub Actions for format, lint, typecheck, tests and production build

Exact package/model versions belong in the lockfile/server configuration and must be upgraded intentionally; documentation should not be treated as a permanent model-version pin.

## Data and coordinate-system rule

Official Estonian spatial datasets commonly use **L-EST97 / EPSG:3301**. Krunditark should preserve authoritative geometries in the source/native reference system where practical and use PostGIS transformations for web display and external interfaces. The browser map normally consumes WGS84/Web Mercator compatible GeoJSON/tiles. Distance and area rules must be evaluated in an appropriate metric CRS, not by naive latitude/longitude arithmetic.

## Security rule

No privileged credential may be shipped in the GitHub Pages bundle.

Browser code may use only the Supabase publishable key and APIs protected by RLS. Any operation needing elevated database access, Google Gemini API keys, third-party secrets, ingestion credentials or protected source access must execute inside Supabase Edge Functions or another server-side environment.

Scheduled sync/promotion operations are privileged and may not be exposed to ordinary user sessions.

## Source provenance rule

Every material analysis finding must be reproducible. At minimum persist:

- data release identifier;
- exact source dataset version;
- source identifier;
- source URL or service endpoint;
- source record/object identifiers where available;
- retrieval timestamp;
- source publication/effective date where available;
- normalized input facts;
- rule version evaluated;
- geometry/evidence identifiers;
- analysis engine version.

A finding without provenance must not be presented as an authoritative Krunditark result.

## MVP success definition

Given a supported Estonian cadastral identifier and a user-placed building footprint, the MVP can:

- resolve the parcel;
- display it accurately on a map;
- detect supported spatial restrictions and planning overlays from a versioned promoted data release;
- classify basic building/permit implications through deterministic versioned rules;
- explain findings in Estonian, optionally enhanced by Gemini;
- show official evidence and links;
- explicitly label missing, stale or inconclusive data as unknown/condition as appropriate;
- save and reproduce an analysis with its data/rule versions;
- run securely from a static GitHub Pages frontend backed by Supabase.

See `docs/MVP_SCOPE.md` for exclusions.

## Development rule

Do not begin a feature from a vague prompt. Pick the next unblocked item in `TASKS.md`, read the linked specifications, implement only the defined scope, add/update tests and documentation, then satisfy `docs/DEFINITION_OF_DONE.md`.

For any source/cache task, `docs/DATA_REFRESH_AND_VERSIONING.md` is part of the implementation contract even if an older task description uses the word “cache”.

## License

No open-source license has been selected yet. Do not add one without an explicit project-owner decision.
