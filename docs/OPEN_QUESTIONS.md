# Open Questions — Krunditark

This file prevents implementation agents from silently inventing product/infrastructure decisions that have not been made yet.

## Resolved decisions

The following are already decided and are **not** open questions:

- Product name/domain: `krunditark.ee`.
- Initial market: Estonia only.
- Core product: Ehituspass.
- Frontend: React + TypeScript + Vite.
- Initial preview hosting: GitHub Pages.
- Backend: Supabase Cloud.
- Database/GIS: PostgreSQL + PostGIS.
- Auth: Supabase Auth.
- Server execution: Supabase Edge Functions.
- AI provider: Google Gemini API.
- AI key location: server-side Supabase secrets only.
- Analysis authority: official source data + deterministic GIS + versioned rules.
- AI role: explanation/assistance only, never authoritative buildability decision.
- Domain registrar currently: Zone.
- Cloudflare is a later DNS/edge/possibly frontend-hosting target.

## OQ-001 — Production Supabase project

Need from project owner during bootstrap:

- production/non-production Supabase project identifiers;
- region choice;
- project lifecycle/access policy.

Do not commit credentials.

## OQ-002 — Gemini model selection

Gemini provider is fixed, but model ID is intentionally not permanently fixed in documentation.

Before enabling AI in an environment:

- review current Gemini models/cost/latency/structured-output capability;
- choose a model appropriate for short grounded Estonian explanations;
- configure `KRUNDITARK_GEMINI_MODEL` server-side;
- record selection in release/deployment notes.

An agent may recommend a model based on current official Google documentation, but should not silently hard-code one as a permanent architectural decision.

## OQ-003 — Map base style/tiles

MapLibre is selected, but production base-map provider/style must be chosen.

Decision criteria:

- Estonia coverage;
- cost/licensing;
- attribution;
- performance;
- GitHub Pages/Cloudflare compatibility;
- privacy.

Do not use an unlicensed public tile endpoint for production traffic.

## OQ-004 — Authentication UX

Supabase Auth is selected.

Preferred MVP direction is email magic link/OTP, but final signup/login method should be confirmed before implementing KT-110 if product-owner preference changes.

## OQ-005 — Guest usage

Decide whether an unauthenticated visitor may:

- search one parcel;
- place a proposal;
- run a limited analysis;
- only view a demo.

Security/rate/cost implications must be considered.

Saved projects require authentication.

## OQ-006 — First legally verified structure matrix

Before KT-072 implementation, choose exact supported structure types and verify current Ehitusseadustik requirements.

Candidate initial set:

- detached house;
- sauna;
- shed/small auxiliary building;
- garage/auxiliary building.

Do not treat candidate list as verified law.

## OQ-007 — Heritage machine-readable source

Exact authoritative/current machine-readable source/layers require technical verification before KT-053.

Until verified, heritage automation remains incomplete/manual-check capable.

## OQ-008 — State-road machine-readable source

Exact Transpordiamet/MaRu dataset(s) used for state-road/protection-zone checks require verification before KT-054.

## OQ-009 — EHR API scope/auth

KT-120 must identify exact public/authorized EHR endpoints and allowed fields before implementation.

Do not scrape the EHR UI as a shortcut.

## OQ-010 — Source caching periods

Each official source needs its own freshness/cache policy based on update frequency, service load and semantics.

Do not apply one arbitrary cache TTL to every dataset.

## OQ-011 — Public report pricing

No pricing is decided yet.

Do not add Stripe/payment/subscription architecture before the product owner promotes monetization into active tasks.

## OQ-012 — Analytics

No analytics provider is approved yet.

MVP may launch without analytics.

Do not install tracking until privacy/legal-basis behavior is explicitly decided.

## OQ-013 — Production frontend hosting

Current development preview is GitHub Pages.

Later decide whether production remains on GitHub Pages or moves to Cloudflare Pages.

Backend remains Supabase unless a separate ADR changes it.

## OQ-014 — Cloudflare registrar vs DNS

Current plan does not depend on moving `.ee` registration away from Zone.

At migration time re-check Cloudflare's current `.ee` registrar support. Cloudflare authoritative DNS/CDN can be used separately from registrar choice.

## OQ-015 — Cost data methodology

Before implementing market estimates, define:

- source(s);
- update cadence;
- regional segmentation;
- confidence/range methodology;
- commercial rights to use the data.

## OQ-016 — Uploaded plans and Gemini

Before sending uploaded project documents/plans to Gemini, make an explicit privacy/product decision covering:

- data sent;
- Gemini service/data handling;
- retention;
- user notice/consent where required;
- deletion;
- whether candidate extraction is sufficient or requires deterministic/user verification.

Until resolved, Gemini explanations use structured project evidence rather than arbitrary private plan uploads.

## How agents should use this file

If an active task depends on an unresolved item:

1. do not invent the missing policy;
2. implement independent work that does not require it when possible;
3. clearly record the dependency/blocker;
4. only ask the project owner when the decision is truly blocking and cannot be safely deferred.
