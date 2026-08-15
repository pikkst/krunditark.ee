# Product Expansion Backlog — Krunditark

Last product review: **2026-08-15**

This is the product-level backlog **beyond the first MVP**. `TASKS.md` remains the ordered implementation source of truth for active engineering work. Items here must be promoted into `TASKS.md` with acceptance criteria before coding.

## 1. Priority model

- **P0** — required to make the first public paid product trustworthy/usable.
- **P1** — strong near-term product-market-fit/value expansion.
- **P2** — professional/growth expansion after core reliability.
- **P3** — strategic/advanced capability.
- **Research** — technical/legal/commercial discovery required before implementation.

## 2. P0 — Public-product completeness

### PX-001 — Address-first parcel search

Goal: ordinary user does not need to know a cadastral ID.

Research basis: MaRu In-AKS, in production from 27.04.2026, exposes official address/Gazetteer APIs and map/object search.

Requirements:

- address autocomplete;
- cadastral ID exact search;
- multiple-parcel disambiguation;
- select on map;
- source attribution/failure handling;
- cache under source-specific policy.

### PX-002 — Guest-first project session

- Supabase anonymous Auth;
- limited temporary project;
- preserve parcel/proposal through account conversion;
- RLS uses `is_anonymous`;
- cleanup policy.

See `AUTH_AND_ONBOARDING.md`.

### PX-003 — Consumer account conversion

- email OTP;
- Google OAuth;
- custom SMTP production setup;
- recovery/order history;
- no required password.

### PX-004 — ET/RU/EN localization foundation

- i18n framework from first UI implementation;
- Estonian canonical;
- Russian/English full core consumer flow before those locales are marked production-ready;
- reviewed legal glossary;
- locale-specific AI explanation cache.

See `LOCALIZATION_AND_LANGUAGE.md`.

### PX-005 — Beginner building templates

- visual structure cards;
- predefined rectangle sizes;
- numeric dimensions;
- drag/rotate instead of requiring polygon drawing;
- advanced mode remains available.

### PX-006 — Variant comparison

- duplicate proposal;
- compare A/B/C exact findings;
- show differences;
- no opaque score.

### PX-007 — Public sample Ehituspass

- synthetic/demo data only;
- demonstrates all finding states, sources and next actions;
- no account/payment;
- localized.

### PX-008 — Payments/entitlements

Before implementing, select one initial provider through ADR.

Provider-independent domain:

- products;
- prices/version;
- orders;
- payment attempts;
- verified webhooks;
- entitlements;
- refunds;
- receipts/invoices;
- idempotency.

Initial products:

- Ostukontroll;
- Ehituspass;
- Project Pass.

### PX-009 — Paid-report recovery

- closing browser after payment does not lose order/report;
- webhook is authority for external payment state;
- retry report generation idempotently;
- customer support can resolve by safe order/analysis ID.

### PX-010 — Support/data-error feedback

- `Teata võimalikust andmeveast`;
- helpful/not helpful;
- attach safe source/rule/analysis IDs;
- internal triage status.

## 3. P1 — Purchase and project value

### PX-020 — Ostukontroll

Dedicated pre-purchase product that does not require a final building footprint.

Supported sections:

- parcel facts;
- planning;
- restrictions;
- environmental/heritage/road context;
- existing EHR buildings when supported;
- important unknowns;
- seller/KOV questions;
- source freshness;
- upgrade to `Testi siia maja`.

### PX-021 — Existing-building context

Use official EHR APIs where terms/access allow.

Current EHR API includes actual-building data endpoints and a changed-after timestamp endpoint that can support incremental synchronization.

Research:

- https://swaggerui.ehr.ee/ehitise_kehtivate_andmete_teenus

### PX-022 — Reanalysis after data/rule release

- `newer_data_available` project state;
- user-triggered rerun;
- old report immutable;
- show data/rule differences.

### PX-023 — Deterministic report diff

Compare two analyses:

- new/removed finding;
- state change;
- measurement change;
- source/data release change;
- rule version change;
- separate wording-only AI change from factual change.

### PX-024 — Project Pass

Product entitlement for one parcel/project over a limited active planning period.

Includes:

- proposal variants;
- reanalysis;
- report history;
- share/export;
- monitoring during entitlement.

### PX-025 — Shareable read-only reports

- explicit owner action;
- revocable high-entropy token;
- optional expiry;
- private notes/files excluded;
- noindex;
- share recipient sees source dates/limitations.

### PX-026 — Project notifications

- report ready;
- newer data available;
- material change later;
- project-pass expiry;
- notification preferences;
- no marketing dependency.

### PX-027 — Printable/PDF report productization

- branded print/PDF;
- version/date/source manifest;
- map snapshot with attribution;
- stable report ID;
- translated copy;
- not represented as an official permit/certificate.

## 4. P1/P2 — Utility intelligence

### PX-030 — Electricity infrastructure context

Goal: help answer “where might electricity be connected?” without claiming actual available capacity or final connection price.

Potential supported information:

- known network/protection geometry where public/authorized;
- nearest relevant network feature;
- direct provider workflow/link;
- user-entered quote later.

Required distinction:

```text
network/proximity != available capacity != connection offer
```

### PX-031 — Water and sewer service areas

Research municipal/operator data availability.

Outputs may include:

- service area;
- known infrastructure/proximity;
- operator contact;
- connection-condition request workflow.

No national blanket assumption.

### PX-032 — Well/on-site water context

Potential future:

- groundwater/protection data;
- well-related registered data/constraints;
- EHR/e-ehituse process links.

Requires exact legal/source review.

### PX-033 — On-site wastewater context

- KOV/service-area context;
- environmental constraints;
- supported regulatory path;
- direct official guidance.

No generic AI advice as project-specific approval.

### PX-034 — Telecommunications / gas

Only if data access and user demand justify complexity.

## 5. P1/P2 — Terrain, environment and site intelligence

Maa- ja Ruumiamet and environmental systems expose public spatial products that make deeper site intelligence technically realistic, but every layer needs source/licensing/semantic review.

### PX-040 — Elevation and slope

Potential:

- DTM/elevation;
- slope map;
- building-area elevation range;
- driveway slope context;
- visualization.

Research official MaRu elevation/LiDAR/WCS datasets.

### PX-041 — Flood-risk context

- official flood-risk/scenario data;
- show scenario/return-period meaning;
- do not label it as engineering flood guarantee.

### PX-042 — Geology / groundwater context

- geological layers;
- groundwater vulnerability/protection where applicable;
- soil/engineering caveat;
- `geotechnical investigation recommended` as recommendation, not model-invented requirement.

### PX-043 — Drainage / land improvement

- registered land-improvement/drainage systems;
- ditch/drain context;
- possible constraints/next authority.

### PX-044 — Solar/shadow/orientation assistance

Use geometry/terrain/building context.

This is design assistance, not legal analysis.

## 6. P2 — Blueprint/model import

### PX-050 — PDF footprint import

- upload plan;
- identify candidate footprint;
- user calibrates/confirms scale;
- user confirms extracted geometry;
- store source page/reference;
- never silently trust AI extraction.

### PX-051 — DXF/DWG import research

- supported geometry subset;
- CRS/scale;
- licensing/parser decision;
- resource limits/security.

### PX-052 — IFC/BIM import

Longer-term:

- extract building footprint/height/useful geometry;
- place against parcel;
- preserve model version;
- avoid implementing a full BIM authoring tool.

### PX-053 — Prefab model catalog

Professional/vendor workflow:

- model ID;
- footprint;
- dimensions;
- height/storeys;
- images/spec metadata;
- place exact model on parcel;
- vendor lead handoff after explicit user action.

## 7. P2/P3 — Placement intelligence

### PX-060 — Candidate buildable-area derivation

Transparent geometry pipeline:

```text
parcel
- supported mandatory exclusion areas
- supported setbacks
- existing-building/known spatial constraints
= candidate area for supported scope
```

Candidate area is not legal approval.

### PX-061 — Placement suggestions

Rank candidate placements using explicit criteria:

- fewer supported conflicts;
- access preference;
- orientation preference;
- terrain preference;
- user-set priorities.

No black-box Gemini location choice.

### PX-062 — Explain why placement improved

Example:

> Variant B no longer intersects the registered power-line protection zone; the planning-text unknown remains unchanged.

This can be deterministically generated and optionally Gemini-polished.

## 8. P2 — Professional workspace

### PX-070 — Pro mode

- advanced map controls;
- dense findings/source metadata;
- reusable templates;
- client/project labels;
- exports;
- faster navigation.

### PX-071 — Organizations and memberships

- owner/admin/member/viewer roles as justified;
- organization projects;
- invite/remove;
- seat entitlements;
- audit.

### PX-072 — Client share/review flow

Professional sends a report/project variant to client for read-only review/comment.

### PX-073 — Batch parcel screening

- CSV/input list;
- queued analyses;
- standardized profile;
- batch results;
- partial/source health states;
- usage accounting.

### PX-074 — Professional API v1

- API keys/service accounts;
- explicit versioning;
- quotas;
- asynchronous batch jobs where needed;
- source attribution;
- tenant isolation;
- usage billing.

### PX-075 — Webhook/event API

Notify B2B client about:

- analysis complete;
- material project/source change;
- batch completion.

Signed/idempotent webhooks.

## 9. P2 — Prefab / broker distribution

### PX-080 — Embeddable parcel-fit widget

For house manufacturers/brokers:

- hosted/embedded search;
- selected model;
- parcel pre-check;
- consented lead handoff;
- branded by Krunditark/white-label rules decided commercially.

### PX-081 — Property listing deep link

Partner/listing supplies cadastral/property context into Krunditark.

Never trust seller/listing description as authoritative parcel/legal fact.

### PX-082 — Land comparison

Buyer/professional compares several parcels across transparent categories.

Avoid a single opaque “best investment” score.

## 10. P2/P3 — Human professional layer

### PX-090 — Request professional review

When analysis has important unknown/complex findings:

- user chooses to share report;
- professional receives structured evidence;
- scope/price communication;
- Krunditark finding remains separate from professional opinion.

### PX-091 — Quote requests

Potential categories:

- architect/designer;
- geodesist;
- surveyor;
- planner/legal consultant;
- utility connection specialist.

Commercial listings/lead routing cannot influence the automated finding.

### PX-092 — Verified professional report

Only after legal/product model is reviewed:

- professional signs/reviews analysis;
- identify reviewer credentials/scope;
- immutable revision;
- audit.

Do not call an automated Ehituspass professionally verified by default.

## 11. P3 — Municipality/document intelligence

### PX-100 — PLANIS document ingestion

PLANIS has structured file/classifier requirements for plans, including explanatory text and spatial import files, making controlled document ingestion more feasible over time.

Research:

- https://planeerimine.ee/juhendid-ja-uuringud/planeeringute-andmekogu-planis-juhendid/andmekogusse-planis-esitamise-nouded-failidele-ja-nende-struktuurile/

### PX-101 — Local plan condition extraction

- extract candidate clauses;
- page/section citations;
- human/verified rule review;
- never auto-promote LLM extraction into authoritative rules.

### PX-102 — KOV adapter program

Prioritize by demand/coverage gaps.

Each municipality adapter has:

- official source;
- contract/terms;
- fixtures;
- update strategy;
- semantic scope.

Avoid 79 one-off brittle scrapers unless unavoidable.

## 12. P3 — Official process handoff

### PX-110 — EHR deep-link/task preparation

Generate a next-action package:

- required supported information checklist;
- official process link;
- user/project data summary.

### PX-111 — Application drafting assistance

Only after official interfaces and legal responsibilities are clear.

AI may draft user-owned text, not sign/submit without explicit authority.

### PX-112 — Official submission integration

Very late, only if public APIs/identity/delegation allow it and a separate security/legal ADR is approved.

## 13. Research — market and pricing

### PX-120 — Consumer willingness-to-pay interviews

Validate:

- €19.90 / €24.90 / €29.90 Ehituspass;
- Project Pass value;
- Ostukontroll value;
- what users currently pay professionals for early answers.

### PX-121 — Pro design-partner program

Recruit architects/prefab/brokers before implementing full Pro billing.

### PX-122 — Payment-provider ADR

Compare at implementation time:

- Stripe;
- Montonio;
- other justified Estonian/EU providers.

Consider bank payments, cards/wallets, subscriptions, webhooks, invoices/refunds, fees and accounting workflow.

## 14. Research — data refresh optimization

### PX-130 — Daily legal change watch

Riigi Teataja provides public API access and versioned legal texts. Run lightweight metadata/hash checks more frequently than the heavy monthly spatial import, with zero Gemini use.

### PX-131 — EHR incremental change ingestion

Use changed-after API where suitable rather than full refetch.

### PX-132 — Address cache strategy

In-AKS source is updated frequently; address search may remain live/short-cache while heavy national analytical layers use snapshots.

## 15. Promotion rule

Before moving any PX item into `TASKS.md`, define:

- user/problem owner;
- exact source dependencies;
- privacy/security impact;
- product entitlement/free-paid behavior;
- deterministic vs AI responsibility;
- API/database changes;
- failure/unknown semantics;
- tests;
- telemetry;
- documentation changes;
- Definition of Done.

No post-MVP feature bypasses the core trust model merely because it is commercially attractive.
