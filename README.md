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
- File storage: Supabase Storage.
- Current domain registrar: Zone (`krunditark.ee`).
- Later edge/DNS/hosting target: Cloudflare, without assuming that `.ee` registration itself can be transferred to Cloudflare Registrar.
- Estonia only for MVP and initial production scope.

## Core principle

Krunditark must separate deterministic facts from AI explanation:

```text
Official data + legal sources
          |
          v
Data adapters / normalization
          |
          v
PostgreSQL + PostGIS
          |
          v
GIS checks + versioned rules engine
          |
          v
Structured analysis result
          |
          v
AI explanation layer
          |
          v
Human-readable Ehituspass
```

The LLM is **not** the legal or geospatial decision engine. It may explain structured findings, summarize source material and help users understand next steps, but it may not invent rules, restrictions, permit requirements, distances, costs or authority decisions.

## Primary user journey

1. User enters a cadastral identifier or searches for a parcel.
2. Krunditark resolves the official parcel geometry and basic facts.
3. User opens the parcel on a map.
4. User selects a building type and provides dimensions/height/storeys.
5. User places, rotates or draws the proposed building footprint.
6. Backend retrieves and/or refreshes relevant official source data.
7. PostGIS computes spatial intersections, distances and containment checks.
8. The rules engine evaluates versioned rules against the structured facts.
9. Krunditark returns findings classified as clear, conditional, conflicting or unknown.
10. Every material finding includes provenance: source, retrieval time, legal/data version where available, and official link.
11. AI converts the structured findings into understandable Estonian explanations without changing their meaning.
12. User receives an Ehituspass with required actions and official next-step links.

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
| [`docs/GIS_AND_RULES_ENGINE.md`](./docs/GIS_AND_RULES_ENGINE.md) | Spatial analysis and deterministic rule design |
| [`docs/AI_SAFETY_AND_EXPLANATIONS.md`](./docs/AI_SAFETY_AND_EXPLANATIONS.md) | Allowed and forbidden LLM behavior |
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
- SQL migrations committed under `supabase/migrations/`

### Quality

- ESLint
- Prettier
- Vitest
- Playwright
- database/RLS tests
- deterministic rule-engine and GIS boundary tests
- GitHub Actions for format, lint, typecheck, tests and production build

Exact package versions belong in the lockfile and must be upgraded intentionally; documentation should not be treated as a version pin.

## Data and coordinate-system rule

Official Estonian spatial datasets commonly use **L-EST97 / EPSG:3301**. Krunditark should preserve authoritative geometries in the source/native reference system where practical and use PostGIS transformations for web display and external interfaces. The browser map normally consumes WGS84/Web Mercator compatible GeoJSON/tiles. Distance and area rules must be evaluated in an appropriate metric CRS, not by naive latitude/longitude arithmetic.

## Security rule

No privileged credential may be shipped in the GitHub Pages bundle.

Browser code may use only the Supabase publishable key and APIs protected by RLS. Any operation needing elevated database access, third-party secrets, provider API keys, ingestion credentials or protected source access must execute inside Supabase Edge Functions or another server-side environment.

## Source provenance rule

Every material analysis finding must be reproducible. At minimum persist:

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
- detect supported spatial restrictions and planning overlays;
- classify basic building/permit implications through deterministic versioned rules;
- explain findings in Estonian;
- show official evidence and links;
- explicitly label missing or inconclusive data as unknown;
- save and reproduce an analysis;
- run securely from a static GitHub Pages frontend backed by Supabase.

See `docs/MVP_SCOPE.md` for exclusions.

## Development rule

Do not begin a feature from a vague prompt. Pick the next unblocked item in `TASKS.md`, read the linked specifications, implement only the defined scope, add/update tests and documentation, then satisfy `docs/DEFINITION_OF_DONE.md`.

## License

No open-source license has been selected yet. Do not add one without an explicit project-owner decision.
