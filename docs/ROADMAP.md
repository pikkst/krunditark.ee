# Roadmap — Krunditark

Last comprehensive product review: **2026-08-22**

The roadmap covers the full Estonia-first product, not only MVP. `TASKS.md` is the current ordered engineering backlog; `PRODUCT_EXPANSION_BACKLOG.md` holds post-core initiatives until they are promoted.

For the current transition from completed parcel discovery into map/proposal work, `PHASE_4_READINESS.md` is the cross-cutting implementation gate and `PHASE_4_IMPLEMENTATION_GUIDE.md` is the task-level execution/DoD contract.

## Guiding sequence

Krunditark should grow in this order:

```text
trusted product/security/data foundation
 -> easy parcel discovery
 -> guest-owned exact proposal scenario
 -> versioned official-data platform
 -> deterministic Ehituspass
 -> result UX + scenario comparison
 -> optional Gemini explanation
 -> permanent accounts/recovery/localization
 -> paid consumer product
 -> project iteration/monitoring
 -> pre-purchase product
 -> utilities/site intelligence
 -> professional workflows
 -> B2B/API
 -> human transaction layer
 -> deeper official-process integration
```

Do not invert this by building marketplace/ads/AI chat before trusted analysis.

---

# Stage 0 — Product and engineering foundation

Goal: repository can be implemented safely by coding agents.

Deliverables already specified in documentation:

- product requirements;
- user journeys/personas;
- architecture;
- Supabase/PostGIS model;
- source registry/data-release foundation;
- GIS/rules design;
- Gemini safety boundary;
- security/privacy;
- guest-first auth;
- localization strategy;
- commercial model;
- full UX direction;
- ordered task backlog.

Exit:

- no unresolved contradiction in source-of-truth docs for the next active implementation phase;
- active coding work can reference exact specs and explicit open questions.

Phase 4 readiness synchronization is documented in `PHASE_4_READINESS.md`, `PHASE_4_IMPLEMENTATION_GUIDE.md`, ADR 0009 and ADR 0010.

---

# Stage 1 — Deployable technical skeleton

Goal: working public preview with no fake privileged backend.

Delivered foundation includes:

- React + TypeScript + Vite;
- design-system foundation;
- i18n foundation with ET canonical;
- GitHub Actions CI;
- GitHub Pages preview;
- Supabase local/cloud environment contract;
- PostgreSQL/PostGIS;
- migrations/RLS tests;
- Edge Function/source-adapter foundations.

Still-required repository governance such as protected `main`/required CI is tracked independently and must not be assumed merely because the workflow exists.

Exit:

- clean clone -> tests/build -> deploy works;
- no secret in browser;
- initial design renders responsively;
- database/RLS foundation can be rebuilt from migrations.

---

# Stage 2 — Parcel discovery and free overview

Goal: a non-expert finds the correct parcel without knowing a cadastral identifier and receives useful free context.

Delivered/active foundation:

- In-AKS address integration;
- cadastral ID search;
- MaRu cadastral resolver/data strategy;
- parcel domain model;
- source provenance/freshness;
- explicit not-found vs source-unavailable semantics;
- parcel disambiguation;
- free parcel overview;
- server-side map point parcel-resolution capability.

The **frontend map-selection interaction** (`Vali krunt kaardilt` -> Leaflet -> explicit click -> resolver -> candidate confirmation) is completed with the Stage 3/Phase 4 map shell because the map UI did not exist in the earlier parcel-discovery implementation. It is not optional/future scope.

Product milestone:

> User can type an address or cadastral ID, select the correct cadastral unit, and see why Krunditark may be useful; Phase 4 adds the equivalent map-only entry path.

---

# Stage 3 — Guest-first proposal experience

Goal: homeowner can model a real idea before permanent registration.

This maps to `TASKS.md` Phase 4, including its readiness prerequisites KT-038/KT-039.

Deliverables:

- real-browser Playwright foundation for map/editor routing/interaction;
- Leaflet 1.9.x map shell using the ADR 0010 Maa- ja Ruumiamet `Kaart`/`Ortofoto` + Krunditark fixed-proxy architecture;
- map parcel selection end to end;
- Supabase anonymous Auth **when stateful project ownership becomes necessary**;
- owner-scoped guest project through normal RLS;
- `Mida soovid selle krundiga teha?` intent step using canonical codes;
- supported structure cards backed by an explicitly verified support matrix;
- beginner dimension templates;
- drag/rotate/numeric-resize building footprint;
- advanced polygon mode as secondary;
- explicit browser-draft vs canonical-proposal boundary;
- server geometry validation/canonicalization to EPSG:3301;
- authoritative area/perimeter computation;
- proposal version persistence;
- mobile map/bottom-sheet workflow;
- state preservation across locale/navigation.

### Stage 3 gates

- **Map architecture is resolved by ADR 0010 / completed issue #50** — implementation must use Leaflet + owned fixed tile proxy, keep MaRu attribution/data-age visible, and must not silently switch to Google/MapLibre/direct public tile origins.
- **OQ-005 / issue #51** — a valid structure enum is not a verified legal product scenario; resolve the first scenario matrix before cards are marked fully supported.
- anonymous technical identity is not a permanent-account signup wall;
- owner-RLS proposal persistence must not precede safe guest owner identity;
- Playwright begins here rather than waiting until final beta.

Exit:

- ordinary user can find/confirm a parcel by search or map, select `build`, place a supported template without GIS expertise and persist a canonical owner-scoped proposal version without creating a permanent account;
- browser preview state is never treated as authoritative metric/legal geometry;
- the integrated Phase 4 exit scenario in `PHASE_4_IMPLEMENTATION_GUIDE.md` passes before Stage 4/Phase 5 source-adapter work begins.

---

# Stage 4 — Versioned official-data platform

Goal: analysis reads Krunditark's verified data releases instead of live-fanning out to Estonia on every request.

Deliverables:

- source registry;
- staging/normalization;
- heavy spatial reconciliation according to source policy (monthly baseline where appropriate, not universal);
- lightweight source-specific change watches;
- dataset versions;
- composite data releases;
- source health/freshness;
- rollback/last-known-good behavior;
- MaRu restrictions;
- PLANIS;
- selected EELIS;
- heritage/road sources when verified;
- daily/appropriate Riigi Teataja legal change detection;
- no Gemini in normal ingestion.

Exit:

- a data release can be reproduced/audited;
- failed update cannot silently replace good data.

---

# Stage 5 — Deterministic Ehituspass engine

Goal: first truly differentiated product works with AI disabled.

Deliverables:

- PostGIS spatial checks;
- evidence geometry;
- rule engine;
- rule verification lifecycle;
- current supported permit/process matrix;
- overall state semantics;
- completeness/unknown handling;
- immutable analysis snapshots;
- data/rule/engine manifest;
- next-action engine;
- deterministic text fallback.

The Phase 4 verified scenario-support matrix defines which product scenarios may enter this stage; Stage 5/KT-072 re-verifies and deepens that matrix into exact deterministic legal/process rule semantics.

Exit:

- same frozen inputs produce same findings;
- every material finding has evidence/provenance.

---

# Stage 6 — Ehituspass UX + scenario comparison

Goal: non-expert can understand and act on deterministic analysis.

Deliverables:

- result hierarchy;
- finding cards;
- map/evidence synchronization;
- source/freshness UI;
- unknown/stale UI;
- ordered next-step plan;
- printable view;
- duplicate/move persisted proposal into a new scenario/version;
- A/B variant comparison.

Strategic milestone:

> Krunditark is now more than a chatbot: user can see exactly why one placement differs from another.

Phase 4 may create reusable version/draft primitives, but it does not claim full variant comparison before this stage.

---

# Stage 7 — Gemini explanation layer

Goal: make hard source/rule/GIS output conversational without delegating truth.

Deliverables:

- Google GenAI adapter;
- configurable model;
- schema-validated ET explanation;
- prompt injection tests;
- source/finding grounding;
- explanation cache;
- AI-disabled fallback;
- follow-up `Ask Krunditark` scoped to selected analysis.

Exit:

- Gemini failure cannot alter/block factual Ehituspass.

---

# Stage 8 — Permanent accounts, localization and recovery

Goal: turn already-safe guest-owned work into durable account use.

The minimum anonymous Auth/project ownership required for proposal persistence is **already part of Stage 3**. This stage adds permanent identity and lifecycle hardening; it must not move anonymous ownership back behind a permanent-signup wall.

Deliverables:

- anonymous lifecycle/retention hardening;
- anonymous -> permanent account conversion;
- email OTP;
- Google sign-in;
- custom SMTP before public email Auth;
- account/project/history pages;
- ET/RU/EN critical-flow localization;
- reviewed glossary;
- project/account deletion/privacy;
- analysis history;
- share-ready architecture.

Exit:

- user can start without permanent identity and later recover the exact project from another device after conversion.

---

# Stage 9 — Paid public launch

Goal: charge for clear value without compromising trust.

Recommended launch products:

- free `Krundi ülevaade`;
- `Ehituspass` one-off purchase;
- `Projektipass` for active multi-variant project.

Deliverables:

- payment-provider ADR (Stripe/Montonio/other based on current evaluation);
- provider-neutral order/payment/entitlement model;
- secure verified webhooks;
- idempotency;
- report/payment recovery;
- receipts/invoices/refund workflow;
- pricing page;
- sample report;
- commercial terms/privacy;
- source/rule/legal launch review;
- production hosting/custom-domain decision;
- accessibility/E2E/security gate.

Pricing hypotheses live in `BUSINESS_MODEL_AND_PRICING.md`, not in domain constants.

Exit:

- payment success reliably produces a recoverable entitlement/report;
- technical failure cannot charge user twice.

---

# Stage 10 — Product quality and change monitoring

Goal: Krunditark remains useful during a months-long building decision.

Deliverables:

- `newer_data_available`;
- user-triggered reanalysis;
- deterministic analysis diff;
- report history;
- safe project notifications;
- source/rule change impact;
- optional Project Pass monitoring.

Future monetization:

- `Krundivalvur` annual monitoring only after material-diff quality is proven.

---

# Stage 11 — Ostukontroll / land-buyer product

Goal: solve pre-purchase decision before exact house design exists.

Deliverables:

- dedicated `pre_purchase` intent/flow;
- parcel-level supported risk/context report;
- planning/restrictions/environment/heritage/road;
- EHR existing-building context where supported;
- questions for seller/KOV;
- source dates;
- upgrade to exact house scenario;
- later compare multiple parcels.

Commercial milestone:

- separate episodic consumer product.

---

# Stage 12 — EHR and existing-building intelligence

Goal: expand beyond greenfield/new-building scenarios.

Deliverables:

- EHR actual-building integration;
- incremental changed-after synchronization where suitable;
- building selection;
- existing vs proposed geometry;
- separate verified rule profiles for extension/reconstruction/demolition/use change as developed.

Do not reuse new-building rules blindly.

---

# Stage 13 — Utility intelligence

Goal: answer “how might this site be serviced?” without false promises.

Capabilities:

- electricity infrastructure/protection/proximity;
- water/sewer service area/provider;
- well/on-site wastewater context;
- telecom/gas where valuable;
- direct provider inquiry/quote links/workflow.

Strict semantic separation:

```text
visible infrastructure/proximity
!= available capacity
!= provider connection approval
!= final price
```

---

# Stage 14 — Cost intelligence

Goal: help user budget the preparation journey.

Categories:

- official fees;
- geodesy/surveys;
- design/project work;
- specialist studies;
- utility quote placeholders;
- later construction-range datasets.

Every number has:

- source/method;
- date;
- region/scope;
- range;
- assumptions.

AI cannot invent current market prices from memory.

---

# Stage 15 — Terrain/site intelligence

Goal: deepen early site feasibility.

Potential official-data-backed capabilities:

- elevation;
- slope;
- flood risk;
- geology/groundwater;
- drainage/land improvement;
- solar/shadow/orientation.

Each is a separate supported analysis category with provenance/limitations.

---

# Stage 16 — Blueprint/model import

Goal: test the user's actual design.

Deliverables progressively:

- PDF footprint import + scale confirmation;
- vector PDF where practical;
- DXF research/support;
- IFC/BIM footprint extraction;
- user-confirmed geometry;
- prefab model catalog.

Gemini/vision may suggest extraction but does not silently define authoritative geometry.

---

# Stage 17 — Placement intelligence

Goal: move from “this placement has a problem” to “here are better transparent alternatives”.

Deliverables:

- candidate-area geometry;
- explicit exclusion rules;
- user-priority ranking;
- placement suggestions;
- deterministic before/after explanation;
- optional AI wording only.

Never call a suggested candidate location “approved”.

---

# Stage 18 — Professional product

Goal: recurring workflow for architects, designers, brokers, prefab sellers and small developers.

Deliverables:

- Pro mode;
- professional subscription/usage entitlements;
- reusable building/client templates;
- many projects;
- export;
- organizations/memberships;
- share/review;
- change alerts;
- professional support.

Pricing hypothesis: Pro/Team described in `BUSINESS_MODEL_AND_PRICING.md` and validated before hard implementation.

---

# Stage 19 — Batch and B2B API

Goal: make normalized decision engine available as infrastructure.

Deliverables:

- batch parcel screening;
- API `/v1`;
- org/API credentials;
- usage metering;
- asynchronous jobs;
- signed webhooks;
- version contracts;
- attribution/terms;
- B2B billing.

Potential customers:

- prefab manufacturers;
- brokers/portals;
- developers;
- land investors;
- design companies.

---

# Stage 20 — Partner distribution

Possible:

- prefab parcel-fit widget;
- property-listing deep links;
- partner attribution;
- consumer consented lead handoff;
- white-label rules where commercially appropriate.

Automated finding neutrality remains non-negotiable.

---

# Stage 21 — Professional review / marketplace

Goal: make important `unknown`/complex cases actionable.

Deliverables:

- request professional review;
- share structured evidence with consent;
- scoped quote/request;
- professional opinion stored separately from automated finding;
- clearly labeled commercial relationship;
- no programmatic ads inside Ehituspass.

Possible later revenue:

- qualified lead fee;
- referral commission;
- professional subscription;
- request/transaction fee.

---

# Stage 22 — PLANIS/KOV document intelligence

Goal: improve textual local planning-condition coverage.

Deliverables:

- PLANIS document ingestion;
- file classification;
- page/section extraction;
- candidate condition extraction;
- human verification;
- selected KOV adapters based on evidence of gaps/demand.

No LLM-extracted clause becomes a production rule automatically.

---

# Stage 23 — Official-process handoff

Goal: help user transition from decision to formal procedure.

Possible:

- EHR/PLANIS deep links;
- application data checklist;
- prefilled user-controlled draft information;
- professional delegation workflows;
- official submission integration only if APIs/identity/authority/legal review support it.

Krunditark should complement, not recreate, the official system.

---

# Stage 24 — Advanced portfolio intelligence

Professional/developer possibilities:

- parcel comparison;
- portfolio map;
- change-impact dashboard;
- development pipeline;
- organization permissions;
- data export;
- enterprise integration.

No opaque “investment score” without explainable components and appropriate financial/legal scope review.

---

# Stage 25 — International expansion

Not before Estonia product-market fit, source quality and business model are proven.

Potential sequence:

1. Finland;
2. Latvia;
3. Lithuania;
4. broader EU.

Each country needs its own:

- source pack;
- rule pack;
- legal review;
- coordinate/GIS policy;
- terminology/localization;
- commercial/regulatory review.

Do not contaminate the Estonia domain model with premature universal abstractions.

---

## Cross-stage product requirements

Every new stage must preserve:

- official-source provenance;
- versioned deterministic rules;
- explicit unknowns;
- immutable historical reports;
- source freshness;
- server-side secrets;
- safe guest/permanent ownership and later payment idempotency;
- ET/RU/EN architecture;
- accessible non-map result;
- neutral findings independent from advertising/partners;
- AI as explanation rather than authority.

## Roadmap prioritization test

Before promoting a stage, ask:

1. Does it solve a frequent/high-cost real user uncertainty?
2. Does existing data/source capability make it reliable enough?
3. Can the result be explained/provenanced?
4. Does it reduce user time/money/risk?
5. Does it deepen Krunditark's workflow moat vs a generic/state chatbot?
6. Is there evidence users will use/pay for it?
7. Can it be supported operationally when sources/law change?

If the answer is mostly “it looks impressive”, it is not a roadmap priority.
