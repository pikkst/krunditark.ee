# Open Questions — Krunditark

Last reviewed: **2026-08-15**

This file lists only decisions that are genuinely still open. Coding agents must not silently invent them.

## Resolved decisions

The following are **not open questions**:

### Product/market

- Product/domain: `krunditark.ee`.
- Market: Estonia only for initial product.
- Core product: Ehituspass.
- Positioning: property/buildability decision workflow, not generic AI chatbot.
- Free discovery before payment/account friction.
- Dedicated later buyer product: Ostukontroll.
- Variant comparison is a core differentiation direction.

### Frontend/backend

- React + TypeScript + Vite.
- MapLibre GL JS.
- GitHub Pages for current preview/development deployment.
- Supabase Cloud backend.
- PostgreSQL + PostGIS.
- Supabase Auth/Storage/Edge Functions/scheduling.
- Cloudflare later for DNS/edge/possibly frontend hosting.
- Zone currently remains registrar unless a later verified migration decision changes it.

### Auth/onboarding

- Guest-first flow.
- Supabase anonymous Auth for stateful guest ownership when needed.
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
- No universal “fetch all sources per analysis”.
- Heavy analytical spatial data uses scheduled releases (monthly baseline where appropriate).
- Cheap source-specific legal/EHR/schema change watches may run daily/weekly.
- In-AKS address search may be live/short-cache.
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

## OQ-003 — Production base-map tile/style provider

MapLibre is fixed; final base map is not.

Candidates can include properly licensed Maa- ja Ruumiamet tiled services and/or a commercial/open tile provider.

Decision criteria:

- Estonia quality;
- orthophoto availability;
- attribution/terms;
- proxy/contact requirements;
- rate/availability expectations;
- cost;
- privacy;
- MapLibre compatibility;
- Cloudflare caching/proxy architecture.

Do not use an unlicensed/free public tile endpoint for production traffic.

## OQ-004 — Production SMTP provider

Custom SMTP is required; provider not selected.

Compare at least:

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

Before implementing permit rules, select exact first supported scenarios and verify current law.

Candidate new-building types:

- detached house;
- sauna;
- shed/auxiliary building;
- garage/auxiliary building.

Need explicit parameters/boundaries and current post-01.08.2026 Ehitusseadustik/annex review.

Do not treat candidate labels as verified legal categories.

## OQ-006 — Heritage machine-readable source

Exact current authoritative endpoint/layers/terms must be verified before production automation.

Until then heritage category can be `not_supported`/manual verification as designed.

## OQ-007 — State-road machine-readable source

Exact official source/layer and semantic mapping for road/protection/access checks needs verification.

## OQ-008 — EHR production API access/terms/scope

Public OpenAPI capability exists, including actual-building and changed-after endpoints, but implementation must verify:

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

Before paid launch compare current:

### Stripe

Strengths to evaluate:

- one-time + subscriptions;
- cards/wallets;
- mature checkout/webhooks;
- international expansion;
- invoicing capabilities.

### Montonio

Strengths to evaluate:

- Estonia/Baltic bank payments;
- local conversion behavior;
- current per-transaction/plan economics.

Decision criteria:

- payment methods desired by Estonian users;
- actual fees at launch date;
- subscriptions/Project Pass needs;
- refunds;
- invoices/receipts;
- webhook/idempotency quality;
- accounting/reconciliation;
- API/developer effort;
- data-processing terms.

Choose one first unless evidence justifies multiple providers.

## OQ-011 — Launch pricing test

Business model direction is resolved; exact price is not.

Initial hypotheses:

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

Product-event taxonomy is defined, provider is not.

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

Development uses GitHub Pages.

Before public production decide:

- GitHub Pages + custom domain;
- Cloudflare Pages/static assets;
- Cloudflare Workers/static assets if architecture evolves.

Backend remains Supabase unless separate ADR changes it.

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

## Agent rule

When a task depends on an open item:

1. do not invent the missing decision;
2. implement independent foundations where possible;
3. keep interfaces/provider boundaries flexible only where explicitly intended;
4. record blocker/assumption;
5. ask owner only when execution cannot safely continue.
