# Roadmap — Krunditark

The roadmap protects focus. Items move into active scope only through an explicit product decision and `TASKS.md` update.

## Stage 0 — Foundation

Goal: repo can be handed to an implementation agent safely.

Deliverables:

- product requirements;
- MVP scope;
- architecture;
- Supabase/PostGIS model;
- API contracts;
- source registry;
- GIS/rules design;
- AI safety;
- security/privacy;
- deployment/testing specifications;
- ordered backlog.

## Stage 1 — Technical skeleton

Goal: deployable empty product shell.

Deliverables:

- React/TypeScript/Vite;
- CI;
- GitHub Pages preview;
- local Supabase;
- PostGIS;
- migrations/RLS test foundation;
- basic landing/map shell.

## Stage 2 — Parcel intelligence

Goal: enter cadastral ID and see trusted parcel.

Deliverables:

- MaRu cadastral adapter;
- parcel domain model;
- source provenance;
- map boundary;
- source freshness;
- errors that distinguish not-found from provider outage.

## Stage 3 — Proposal placement

Goal: user can place a proposed structure.

Deliverables:

- supported structure types;
- footprint drawing/editing;
- server geometry validation;
- proposal version persistence;
- parcel containment facts.

## Stage 4 — Restriction intelligence

Goal: exact proposed location can be compared with supported official overlays.

Deliverables:

- cadastral restrictions;
- PLANIS;
- selected EELIS public layers;
- heritage source if verified;
- state-road context if verified;
- normalized source cache;
- GIS evidence overlays.

## Stage 5 — Deterministic Ehituspass

Goal: first genuinely useful product.

Deliverables:

- rules engine;
- verified permit-path matrix for limited structure set;
- restriction semantics;
- source completeness;
- immutable analyses;
- overall state;
- finding cards;
- next-step checklist;
- printable view.

This stage must work with AI disabled.

## Stage 6 — AI explanation

Goal: make regulation/GIS findings easy to understand.

Deliverables:

- provider-neutral AI adapter;
- guarded prompt contract;
- schema-validated explanation;
- deterministic fallback;
- source/finding grounded follow-up questions;
- prompt-injection tests.

## Stage 7 — Accounts and project history

Goal: users can manage multiple construction ideas.

Deliverables:

- Supabase Auth;
- project dashboard;
- proposal versions;
- historical analyses;
- reanalysis when rules/data change;
- deletion/privacy workflows.

## Stage 8 — Public MVP launch

Goal: reliable public Estonian service.

Deliverables:

- current-rule verification;
- source terms/attribution review;
- privacy/terms;
- security review;
- E2E/accessibility;
- rate limiting;
- operational source health;
- custom `krunditark.ee` production deployment;
- Cloudflare DNS/Pages decision.

## Stage 9 — Utility intelligence

Goal: answer “how might I connect the building?” without false guarantees.

Possible:

- electricity network context;
- water/sewer service areas;
- telecom availability;
- provider link/quote workflow;
- distinguish proximity from capacity/connection approval.

## Stage 10 — Cost intelligence

Goal: make preparation costs understandable.

Possible categories:

- official state/local fees;
- survey/geodesy market ranges;
- design/project market ranges;
- utility quote placeholders/workflow;
- permit/application costs;
- construction cost ranges later.

All estimates require source/date/methodology.

## Stage 11 — Blueprint/site-plan import

Goal: user can bring an existing house design.

Possible:

- PDF image/vector import;
- user-calibrated scale;
- footprint extraction;
- DXF support;
- IFC/BIM later;
- drag/rotate actual model footprint on parcel.

LLM/vision extraction may suggest geometry, but user/deterministic validation must confirm it.

## Stage 12 — Placement optimizer

Goal: find better candidate building locations.

Possible algorithm:

```text
parcel
- mandatory exclusions/setbacks
- supported protection zones
- existing-building constraints
- access/terrain preferences
= candidate areas
```

Rank candidates using transparent criteria.

Do not imply that an optimizer result is officially approved.

## Stage 13 — Terrain/environment intelligence

Possible:

- elevation;
- slope;
- flood-risk datasets;
- soil/geology context;
- drainage/land improvement;
- solar orientation;
- shadow estimation;
- driveway/access geometry.

Each layer needs source and semantics review.

## Stage 14 — Municipality document intelligence

Goal: improve plan/local-condition coverage.

Possible:

- PLANIS document ingestion;
- KOV structured/document adapters;
- PDF text extraction;
- OCR only when necessary;
- candidate condition extraction;
- human/rule verification workflow;
- source page/section citations.

Do not make LLM-extracted plan clauses production rules automatically.

## Stage 15 — Professional/B2B

Potential users:

- architects;
- prefab-house manufacturers;
- brokers;
- developers;
- land investors;
- survey/design companies.

Features:

- team projects;
- batch parcel screening;
- API;
- white-label lead checks;
- export;
- role-based access;
- developer portfolios.

## Stage 16 — Marketplace / transaction layer

Only after trusted intelligence product exists:

- request quote from architect;
- surveyor/geodesy quote;
- prefab-house fit check;
- utility application support;
- professional review upgrade.

Avoid compromising neutral findings through paid placement.

## Stage 17 — International expansion

Not before Estonia product/rules/source model is proven.

Potential order:

1. Finland;
2. Latvia;
3. Lithuania;
4. broader EU markets.

International architecture would require:

- country source packs;
- country rule packs;
- CRS/source adapters;
- localized legal review;
- jurisdiction-specific disclaimers.

Do not prematurely complicate Estonia MVP with a universal regulatory framework.

## Commercial hypotheses (not MVP requirements)

Potential later plans:

- free parcel preview;
- paid detailed Ehituspass;
- project subscription;
- professional subscription;
- developer/batch plan;
- B2B API;
- qualified professional referral/lead revenue.

Pricing must be validated with users rather than encoded into architecture now.

## Strategic moat

The defensible asset is not simply “an AI chatbot”.

It is the accumulated combination of:

- normalized Estonian spatial/source adapters;
- versioned regulatory rules;
- provenance/evidence model;
- historical change handling;
- verified GIS semantics;
- source health/freshness infrastructure;
- high-quality user workflow and professional trust.
