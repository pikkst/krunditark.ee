# Open Questions — Krunditark

Last reviewed: **2026-08-21**

This file lists only decisions that are genuinely still open. Coding agents must not silently invent them.

For Phase 4 cross-cutting gates, also read `PHASE_4_READINESS.md` and `PHASE_4_IMPLEMENTATION_GUIDE.md`.

## Resolved decisions

The following are **not open questions**.

### Product/market

- Product/domain: `krunditark.ee`.
- Market: Estonia only for initial product.
- Core product: Ehituspass.
- Positioning: property/buildability decision workflow, not generic AI chatbot.
- Free discovery before permanent-account/payment friction.
- Dedicated later buyer product: Ostukontroll.
- Variant comparison is a core differentiation direction.

### Parcel discovery

- Consumer discovery supports address, cadastral identifier and map selection.
- Address lookup uses the approved In-AKS path and is submit-driven, not per-keystroke upstream traffic.
- Address/map ambiguity requires explicit parcel confirmation.
- Parcel resolution/source failure is not `not_found`.
- Map point selection uses the canonical server-side parcel resolver; pointer movement does not continuously resolve parcels.

### Frontend/backend

- React + TypeScript + Vite.
- **Leaflet 1.9.x stable** for the Phase 4 browser map.
- `@geoman-io/leaflet-geoman-free` may be used where required Phase 4 editing behavior exists in the free package.
- React Router.
- GitHub Pages for current preview/development deployment.
- Supabase Cloud backend.
- PostgreSQL + PostGIS.
- Supabase Auth/Storage/Edge Functions/scheduling.
- Zone currently remains registrar unless a later verified migration decision changes it.

ADR 0009 clarifies the early stack list:

- TanStack Query is optional until shared server-state/cache complexity justifies it;
- Zod is optional; explicit tested runtime parsers/validators are acceptable;
- runtime trust-boundary validation itself is mandatory;
- domain models remain provider/library independent.

ADR 0010 resolves the Phase 4 map architecture:

- Leaflet is the Phase 4 renderer;
- Maa- ja Ruumiamet `Kaart` is the default basemap;
- Maa- ja Ruumiamet `Ortofoto` is the optional aerial mode;
- browser tile traffic uses a Krunditark-owned fixed/allow-listed proxy;
- source/data-age attribution remains visible;
- Google Maps and MapLibre are not Phase 4 runtime dependencies without a superseding ADR;
- public OSM/demo tile endpoints are not production providers by convenience.

The former OQ-003 / issue #50 research decision is resolved. KT-040 still owns implementation/verification of this architecture.

### Phase 4 workflow state

- Public parcel discovery/free overview does not require permanent identity.
- When stateful proposal work begins, create/reuse Supabase anonymous Auth and an owner-scoped guest project.
- This anonymous technical identity is not a permanent-account/signup wall.
- Persisted project state owns selected parcel/intent and persisted proposal versions.
- Mutable editor draft is separate from canonical persisted proposal state.
- Permanent email OTP/Google conversion remains later.

See ADR 0006, ADR 0009 and `AUTH_AND_ONBOARDING.md`.

### Proposal boundary

- Browser/editor draft and canonical persisted proposal are distinct contracts.
- Browser interchange may use EPSG:4326.
- Canonical persisted proposal geometry is EPSG:3301.
- Server/PostGIS computes authoritative material geometry metrics.
- An unpersisted draft may be edited freely.
- Saving creates a proposal version; a terminal-analysis proposal is not mutated in place.
- Beginner template ID is non-authoritative UI provenance in Phase 4 and is not required in canonical proposal persistence.
- Full A/B variant workflow remains later.
- Proposal-save API semantics are idempotent/retry-safe/concurrency-safe; the concrete KT-048 transaction/version-allocation primitive remains implementation work under issue #53.

### Auth/onboarding

- Guest-first flow.
- Supabase anonymous Auth for stateful guest ownership when needed.
- Minimum anonymous ownership is promoted into the Phase 4 dependency chain before owner-RLS proposal persistence.
- Permanent consumer auth: email OTP + Google as primary methods.
- No password required in default consumer flow.
- Preserve anonymous project through identity conversion.
- Production email Auth requires custom SMTP.

See `AUTH_AND_ONBOARDING.md`.

### Languages

- Estonian is canonical/default.
- Architecture supports ET/RU/EN from first frontend build.
- Russian and English are full product-localization targets, not only runtime AI translation.
- Critical legal/status/payment/privacy terminology requires reviewed translations.
- Official Estonian legal source remains traceable in all locales.

See `LOCALIZATION_AND_LANGUAGE.md`.

### AI

- Production AI provider: Google Gemini API.
- Gemini credentials server-side only.
- Model ID server configuration, not permanent hard-coded architecture.
- AI explains; deterministic GIS/rules decide supported findings.
- No Gemini in normal source synchronization.
- AI explanations are cached.

### Data refresh

- `DATA_REFRESH_AND_CACHE.md` is canonical.
- `DATA_REFRESH_AND_VERSIONING.md` is compatibility-only.
- No universal “fetch all sources per analysis”.
- Heavy analytical spatial data uses source-specific scheduled snapshot/incremental releases, with monthly baseline only where source policy says so.
- Cheap source-specific legal/EHR/schema change watches may run daily/weekly.
- In-AKS address search is live/short-cache.
- Last-known-good data survives failed refresh.
- Rules require verified promotion after legal changes.

### Commercial model direction

- Do **not** make a consumer monthly subscription the only/main model.
- Free parcel overview.
- One-time paid consumer reports.
- Limited-duration Project Pass for active project work.
- Recurring plans aimed primarily at professional repeat users.
- B2B/API later.
- No programmatic/banner advertising inside trust-critical analysis/report UI.
- Future referral/sponsored professional offers are separate/labeled and cannot influence findings.

Exact price points remain hypotheses, not resolved permanent values.

See `BUSINESS_MODEL_AND_PRICING.md`.

---

# Remaining open questions

## OQ-001 — Production/non-production Supabase projects

Need owner/environment decision:

- project refs;
- region;
- preview/staging vs production separation;
- backup/PITR level at launch;
- access/owner policy.

Never commit credentials.

## OQ-002 — Gemini model selection at implementation/release time

Provider is fixed; model is intentionally flexible.

Before enabling AI in an environment:

- review current stable/recommended Gemini models;
- structured output support;
- Estonian/Russian/English quality;
- latency;
- deprecation date;
- token/cost profile;
- configure `KRUNDITARK_GEMINI_MODEL`;
- run Krunditark adversarial/quality evaluation.

Google changes model lifecycle, so an implementation agent must check current official documentation rather than trusting an old doc recommendation.

## OQ-004 — Production SMTP provider

Custom SMTP is required; provider not selected.

Compare at implementation time:

- Resend;
- Postmark;
- AWS SES;
- Brevo/other justified provider.

Criteria:

- EU/GDPR/data handling;
- deliverability;
- price;
- DKIM/SPF/DMARC;
- logs/retention;
- API/SMTP reliability;
- separation of auth vs marketing mail.

## OQ-005 — First verified building/scenario matrix

**Phase 4 support gate: resolve before KT-043 marks any structure/scenario as fully supported. Tracked by issue #51.**

Candidate new-building domain types include:

- detached house;
- sauna;
- shed/auxiliary building;
- garage/auxiliary building.

Need explicit supported scenario combinations, required parameters/boundaries and current official-law verification including the post-01.08.2026 state relevant at implementation time.

Required distinction:

```text
valid domain structure code
!= verified-supported product scenario
```

The decision must also define the `Muu`/custom limited-check behavior. Do not silently map custom input to a verified legal/process profile.

## OQ-006 — Heritage machine-readable source

Exact current authoritative endpoint/layers/terms must be verified before production automation.

Until then heritage category can be `not_supported`/manual verification as designed.

## OQ-007 — State-road machine-readable source

Exact official source/layer and semantic mapping for road/protection/access checks needs verification.

## OQ-008 — EHR production API access/terms/scope

Public OpenAPI capability exists, including actual-building and changed-after concepts, but implementation must verify current:

- access/auth;
- rate limits;
- permitted fields/use;
- cache/replication terms;
- document privacy/access restrictions;
- production endpoint behavior.

Do not scrape EHR UI.

## OQ-009 — Exact source-specific freshness thresholds

Refresh architecture is decided, but actual warning/critical durations remain source-specific.

For every source define:

- expected update cadence;
- check cadence;
- refresh strategy;
- stale warning;
- maximum safe age;
- release-blocking policy;
- emergency/manual refresh.

Do not copy one arbitrary `30/60 days` rule everywhere.

## OQ-010 — First payment provider

Commerce architecture is provider-neutral.

Before paid launch compare current Stripe/Montonio/other justified options.

Decision criteria:

- payment methods desired by Estonian users;
- actual fees at launch date;
- one-time purchases/subscriptions/Project Pass needs;
- refunds;
- invoices/receipts;
- webhook/idempotency quality;
- accounting/reconciliation;
- API/developer effort;
- data-processing terms.

Choose one first unless evidence justifies multiple providers.

## OQ-011 — Launch pricing test

Business model direction is resolved; exact price is not.

Initial hypotheses remain research inputs only, for example:

- Ostukontroll: €14.90–19.90;
- Ehituspass: test €19.90 / €24.90 / €29.90;
- Project Pass: around €49.90/90 days;
- Pro: around €69–89/month;
- Team: around €179–249/month.

Before hard launch pricing:

- interviews/usability tests;
- actual variable/fixed cost model;
- VAT/accounting treatment;
- payment fee;
- support/refund assumptions;
- conversion tests.

Prices belong to versioned product catalog/configuration, not scattered constants.

## OQ-012 — Analytics provider and legal basis

Product-event taxonomy direction exists, provider/legal basis is not selected.

Evaluate:

- first-party/server-side event table;
- privacy-oriented analytics provider;
- consent/cookie requirements;
- EU processing;
- retention/deletion;
- IP/pseudonymization;
- performance.

Do not install Google Analytics or another tracker by default.

## OQ-013 — Production frontend hosting

Development/preview uses GitHub Pages.

Before public production decide the exact deployment between justified static/edge options such as:

- GitHub Pages + custom domain;
- Cloudflare Pages/static assets;
- Cloudflare Workers/static assets if architecture evolves.

Backend remains Supabase unless separate ADR changes it.

Documentation may describe Cloudflare as the production **direction**, but must not claim the final hosting decision is closed while this OQ remains open.

## OQ-014 — Cloudflare registrar/DNS final setup

Current product does not require registrar transfer.

At migration time:

- re-check `.ee` support;
- DNSSEC;
- current Zone records;
- Cloudflare DNS/Pages/Workers plan;
- auth/CORS/custom-domain implications.

## OQ-015 — Cost-data methodology

Before market price estimates:

- identify source/license;
- date/region segmentation;
- update cadence;
- range methodology;
- sample size/confidence;
- whether commercial reuse is permitted.

No Gemini-memory pricing.

## OQ-016 — Utility data sources

For electricity/water/sewer/telecom:

- public vs authenticated data;
- infrastructure vs service area;
- connection capacity availability;
- quote workflow;
- terms/replication;
- operators/KOV fragmentation.

Do not build a guaranteed connection result until evidence supports it.

## OQ-017 — Uploaded plans + Gemini privacy

Before sending private PDF/blueprint content to Gemini:

- exact data sent;
- selected Google service/data handling;
- retention;
- user disclosure/consent as needed;
- deletion;
- whether local/deterministic extraction can reduce data sharing;
- confirmation workflow for extracted geometry.

## OQ-018 — Professional verification marketplace

Before partner/lead revenue:

- partner qualification;
- consumer disclosure;
- commercial model;
- liability/scope;
- ranking neutrality;
- consented report sharing;
- complaints/refunds;
- conflict-of-interest handling.

## OQ-019 — Public beta locale sequencing

Architecture/targets ET/RU/EN are decided.

Operational launch sequence remains flexible:

- ET-only first public beta followed quickly by RU/EN;
- or ET/RU/EN simultaneously if translation QA/resources permit.

Never expose a locale selector for a half-translated critical journey.

## OQ-020 — Company/legal seller identity

Before paid public launch document:

- exact legal entity operating Krunditark;
- seller/contact details;
- VAT status;
- invoice/receipt behavior;
- consumer terms/withdrawal/digital-content handling;
- support/refund channels.

This is required before commerce copy/terms are final.

---

## Phase 4 blocker rule

Phase 4 architecture is sufficiently specified to begin prerequisite implementation once the readiness documentation is merged, but support/implementation gates still apply:

1. **OQ-005 / issue #51** must be resolved before KT-043 marks a scenario fully supported.
2. KT-048 must not invent proposal save/version semantics; follow the API contract and resolve the concrete transaction/idempotency primitive under issue #53.
3. Implementation prerequisites/issues #47, #48, #49 and #55 remain real code/integration work even though the documentation contract is defined.
4. Development behavior may be implemented independently where a later open question does not affect correctness, but unsupported/production claims must remain explicit.

Do not re-create former OQ-003: map renderer/basemap architecture is resolved by ADR 0010. If new evidence requires a different architecture, create a superseding ADR rather than silently changing KT-040.

## General agent rule

When a task depends on an open item:

1. do not invent the missing decision;
2. implement independent foundations where possible;
3. keep interfaces/provider boundaries flexible only where explicitly intended;
4. record blocker/assumption;
5. ask owner only when execution cannot safely continue.
