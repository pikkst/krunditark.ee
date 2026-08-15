# AGENTS.md — Krunditark implementation contract

This file is the primary instruction set for AI coding agents working in this repository.

## 1. Mission

Build **Krunditark**, an Estonia-first property intelligence and buildability platform whose core product is the **Ehituspass**.

The product helps a user answer:

> “I have selected this cadastral parcel and I want to place this kind of building here. What official constraints, planning conditions, likely permit steps and unknowns should I consider, and where can I verify them?”

The system must reduce bureaucracy and information fragmentation without pretending to replace an authority, architect, designer, surveyor, utility provider or lawyer.

## 2. Read order before coding

Before implementing a task, read:

1. `AGENTS.md`
2. `TASKS.md`
3. `docs/PRODUCT_REQUIREMENTS.md`
4. `docs/MVP_SCOPE.md`
5. `docs/ARCHITECTURE.md`
6. the task-specific specification documents
7. relevant ADRs in `docs/adr/`
8. `docs/DEFINITION_OF_DONE.md`

If code and documentation disagree, do not silently choose one. Treat the documentation as the intended design, identify the conflict in the PR/task notes, and update the documentation as part of the same change if the design is intentionally changed.

## 3. Non-negotiable product rules

### 3.1 AI is not the source of truth

The LLM must never decide whether construction is legally permitted.

Authoritative output is produced by:

- official/authoritative source data;
- deterministic spatial analysis;
- versioned deterministic rules;
- explicit completeness/freshness checks.

The LLM may:

- explain structured findings in Estonian;
- summarize source text already retrieved and stored;
- answer follow-up questions using cited evidence;
- translate technical/legal wording into plain language;
- describe next actions already represented by structured output.

The LLM must not:

- invent a setback, protection zone, permit, fee or legal requirement;
- infer a missing official decision as fact;
- convert an `unknown` result into `clear`;
- hide uncertainty;
- output an uncited legal conclusion as authoritative;
- modify the deterministic result status.

### 3.2 Every material finding requires provenance

Every finding shown in an Ehituspass must be traceable to the inputs that produced it.

Persist or reference:

- source;
- source record/object ID when available;
- official URL/service endpoint;
- retrieval timestamp;
- source version/effective date when available;
- normalized facts;
- rule version;
- geometry/evidence identifiers;
- analysis engine version.

No provenance means no authoritative finding.

### 3.3 Unknown is a valid result

Use explicit states:

- `clear` — supported checks found no conflict for the tested rule;
- `condition` — a condition, consent, manual review or additional step is indicated;
- `conflict` — the tested proposal intersects/violates a deterministic supported condition;
- `unknown` — source is unavailable, incomplete, not public, ambiguous or outside supported rules.

Never manufacture confidence percentages such as “92% buildable”. Data completeness and freshness may be scored, but legal/buildability certainty must not be represented as a fake probability.

### 3.4 Estonia only until roadmap says otherwise

MVP and initial production are Estonia-only. Do not introduce multi-country abstractions that significantly slow MVP delivery. Keep source adapters modular enough to permit later expansion, but optimize current rules, coordinate systems, UI language and source registry for Estonia.

### 3.5 Do not claim parcel ownership

A cadastral identifier and public parcel information do not prove that the current user owns the parcel. Use terms such as “selected parcel” or “your project parcel” unless ownership has actually been verified by an approved future mechanism.

## 4. Architecture boundaries

### Frontend

Current target:

- React
- TypeScript strict mode
- Vite
- MapLibre GL JS
- React Router
- TanStack Query
- Zod at boundaries

GitHub Pages is a static host. Frontend code must not depend on a private server runtime bundled with the site.

### Backend

Use Supabase Cloud for:

- PostgreSQL;
- PostGIS;
- Auth;
- Storage;
- Edge Functions;
- scheduled/background database tasks when appropriate.

All schema changes must be committed as ordered migrations in `supabase/migrations/`.

Never edit an already-applied migration to fix production state. Add a new forward migration.

### Privileged operations

Never expose any secret/elevated Supabase key, LLM/provider secret or third-party credential in browser code.

Browser code may use only a Supabase **publishable** key and RLS-protected resources.

Operations requiring elevated access must run in Supabase Edge Functions or another explicitly approved server-side component.

### Public-source access

Do not make important WFS/API analysis dependent on uncontrolled browser CORS behavior. Source adapters should run server-side through Edge Functions and/or ingestion jobs, normalize responses, cache where permitted, and expose a stable Krunditark contract to the frontend.

A WMS basemap/visual overlay may be consumed client-side when the provider permits it, but visual tiles are not a substitute for structured analysis data.

## 5. GIS rules

- Prefer authoritative geometry from the source.
- Preserve source SRID metadata.
- Estonia metric analysis should normally use L-EST97 / EPSG:3301 or another explicitly justified metric CRS.
- Browser-display data may be transformed to EPSG:4326/3857 as required.
- Never compute legal distances with naive degree arithmetic.
- Use PostGIS spatial predicates and GiST indexes.
- Boundary behavior must be tested: touching, crossing, contained, near-boundary, zero-distance and invalid geometry cases.
- Normalize invalid geometries explicitly; do not silently discard them.
- Record source and transformation metadata for persisted normalized geometry.

## 6. Source adapter rules

Every adapter must expose a typed internal contract and include:

- source ID;
- endpoint/base URL configuration;
- request timeout;
- retry policy for transient failures;
- maximum response size;
- response validation;
- fixture-based parser tests;
- source retrieval timestamp;
- source object identifier where available;
- raw-response hash or equivalent provenance field;
- normalization version;
- explicit failure classification.

Unit tests must not require the public internet. Store sanitized deterministic fixtures.

Do not scrape a web page when an official API/WFS/WMS/download endpoint is available and suitable.

## 7. Rules engine rules

A legal/spatial rule is data/code with a version, not prompt text.

Each rule must have at least:

- stable rule code;
- title;
- domain/category;
- version;
- status (`draft`, `verified`, `retired`);
- effective-from/effective-to where applicable;
- official legal/source reference;
- deterministic evaluator;
- expected input facts;
- output severity/state;
- test cases;
- reviewer/verification metadata before production use.

Legal rules must be verified against the currently applicable official source before being marked `verified`.

An agent must not copy a random secondary website’s interpretation into production rules.

## 8. Database and RLS rules

- Enable RLS on all client-accessible tables.
- Default deny; add least-privilege policies deliberately.
- Internal ingestion/legal/audit/source-cache tables must not be exposed through the public Data API unless explicitly required.
- Users may access only their own saved projects/analyses unless a resource is explicitly public.
- Admin roles must be verified server-side; never trust a client-provided `isAdmin` flag.
- Elevated server-side clients must be scoped to the smallest operation possible.
- Add indexes for foreign keys, frequent filters and spatial queries.
- Store timestamps as `timestamptz` in UTC.
- Prefer UUID identifiers for application entities.
- Do not use mutable human-readable fields as foreign keys.
- Critical analysis records should be immutable snapshots or versioned records, not silently overwritten.

See `docs/DATABASE_SCHEMA.md`.

## 9. Security and privacy rules

- No secrets in git, generated frontend JS, screenshots, fixtures or logs.
- Keep `.env*` ignored except an explicit `.env.example` when created.
- Validate all Edge Function input.
- Apply rate limits to costly/public analysis endpoints.
- Restrict CORS to known origins in production.
- Sanitize file uploads and enforce MIME/size limits.
- Do not store landowner identity merely because a public parcel is analyzed.
- Minimize personal data.
- Never log auth tokens, cookies, API keys or full sensitive payloads.
- Record security-relevant administrative actions in an audit log.

See `docs/SECURITY_PRIVACY.md`.

## 10. UX rules

Primary UI language for MVP is Estonian.

Every user-facing finding must show:

- clear title;
- state (`clear`, `condition`, `conflict`, `unknown`);
- plain-language explanation;
- what geometry/condition triggered it when relevant;
- official source;
- source date/retrieval date;
- direct verification link when available;
- recommended next step.

Use color only as a secondary signal; states must remain understandable with text/icons for accessibility.

Never use legalese as the only explanation.

## 11. Cost estimation rules

If/when costs are implemented:

- return ranges, not false precision;
- identify whether the number is an official fee, market estimate or user-provided quote;
- store source/date/geographic applicability;
- show assumptions;
- never estimate an individual utility connection offer as if it were guaranteed;
- mark unavailable pricing as unknown and link to the responsible provider.

Cost estimation is not required for the first deterministic buildability slice unless a task explicitly adds it.

## 12. Coding standards

- TypeScript strict mode.
- No `any` without a documented boundary reason.
- Prefer small pure functions for rules and normalization.
- Use descriptive names.
- Code comments must be in English and explain **why**, not restate syntax.
- User-facing copy is Estonian in MVP.
- Validate external data with schemas; do not trust provider payload shape.
- Keep provider SDK/domain types out of core domain models.
- Avoid large god services and cross-layer imports.
- No hidden network calls in domain logic.
- No hard-coded production URLs or credentials when configuration is appropriate.
- Keep deterministic domain logic runnable without Supabase or network access.

## 13. Testing contract

Every implementation task must add tests appropriate to the change.

Minimum test categories:

- unit tests for domain/rules/parsers;
- fixture tests for source adapters;
- database migration/RLS tests;
- PostGIS geometry tests;
- Edge Function contract/auth tests;
- component tests for complex UI states where valuable;
- Playwright E2E for critical user journeys.

Critical GIS/rule tests must include boundary and negative cases.

No unit test should depend on a live government endpoint.

## 14. Git and task workflow

For each task:

1. Select an unblocked task from `TASKS.md`.
2. Read its linked documentation.
3. Confirm dependencies are complete.
4. Implement the smallest complete vertical slice.
5. Add/update tests.
6. Run required checks.
7. Update documentation if behavior/contracts changed.
8. Update task status only when its acceptance criteria pass.
9. Do not mark a task complete because UI exists while backend/rules/tests are missing.

Prefer one coherent task or tightly coupled task group per PR/change set.

Do not perform unrelated refactors inside feature tasks.

## 15. Documentation maintenance

Documentation is part of the product.

Update it when changing:

- API contracts;
- data models;
- external sources;
- rule semantics;
- security model;
- deployment flow;
- environment variables;
- user-visible terminology;
- task dependencies;
- architectural decisions.

When a significant architectural decision changes, add or supersede an ADR instead of rewriting history without explanation.

## 16. Definition of done

A task is not done until it satisfies `docs/DEFINITION_OF_DONE.md` and its task-specific acceptance criteria.

For analysis-related tasks specifically, completion requires reproducibility, provenance and deterministic test coverage.

## 17. Explicitly forbidden shortcuts

Do not:

- ask an LLM “can this building be built here?” and use that response as the decision;
- expose a service/secret role key to GitHub Pages;
- disable RLS to make development easier;
- trust client-calculated geometry as authoritative without server validation;
- hardcode a legal interpretation without source/version metadata;
- silently fall back from failed official data to model knowledge;
- label missing data as “no restrictions”;
- use browser-only geometry calculations for authoritative distance/intersection findings;
- store critical provenance only in free-form JSON when a structured relationship is required;
- claim an official permit or approval has been granted;
- scrape or republish data contrary to source terms;
- remove source attribution from maps/reports;
- add analytics/tracking without the privacy/legal decision being documented.

## 18. When uncertain

Choose the safer output state: `unknown` or `condition` with an explanation of what must be verified.

For implementation uncertainty, consult the official source or project documentation. Do not resolve regulatory ambiguity by guessing.
