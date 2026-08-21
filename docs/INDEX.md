# Krunditark Documentation Index

Last reviewed: **2026-08-21**

This index ties the product, engineering, research and commercial specifications together.

## Start here

1. [`../AGENTS.md`](../AGENTS.md) — coding-agent contract and source-of-truth precedence.
2. [`../TASKS.md`](../TASKS.md) — ordered active engineering backlog.
3. [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md) — full product requirements.
4. [`USER_JOURNEYS_AND_PERSONAS.md`](./USER_JOURNEYS_AND_PERSONAS.md) — user problems and end-to-end journeys.
5. [`UX_UI_SPEC.md`](./UX_UI_SPEC.md) — landing, app, map, report, mobile and Pro UX.
6. [`MVP_SCOPE.md`](./MVP_SCOPE.md) — current trustworthy vertical-slice boundary.
7. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system/service architecture.
8. [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) — global task/release gates.

### Current active-phase companion

For KT-038 through KT-048, read:

- [`PHASE_4_READINESS.md`](./PHASE_4_READINESS.md) — Phase 0–3 -> Phase 4 cross-cutting state/auth/map/proposal/test gates.
- [`AUTH_AND_ONBOARDING.md`](./AUTH_AND_ONBOARDING.md)
- [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)
- ADR 0006 and ADR 0009.

OQ-003 (production map provider) and OQ-005 (first verified structure/scenario matrix) remain explicit Phase 4 gates and must not be guessed.

## Product and market

- [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md)
- [`USER_JOURNEYS_AND_PERSONAS.md`](./USER_JOURNEYS_AND_PERSONAS.md)
- [`UX_UI_SPEC.md`](./UX_UI_SPEC.md)
- [`MVP_SCOPE.md`](./MVP_SCOPE.md)
- [`PHASE_4_READINESS.md`](./PHASE_4_READINESS.md)
- [`ROADMAP.md`](./ROADMAP.md)
- [`PRODUCT_EXPANSION_BACKLOG.md`](./PRODUCT_EXPANSION_BACKLOG.md)
- [`MARKET_AND_COMPETITIVE_POSITIONING.md`](./MARKET_AND_COMPETITIVE_POSITIONING.md)
- [`PRODUCT_RESEARCH_EVIDENCE.md`](./PRODUCT_RESEARCH_EVIDENCE.md)
- [`PRODUCT_ANALYTICS_AND_GROWTH.md`](./PRODUCT_ANALYTICS_AND_GROWTH.md)

## Business and commerce

- [`BUSINESS_MODEL_AND_PRICING.md`](./BUSINESS_MODEL_AND_PRICING.md) — product/pricing hypotheses.
- [`UNIT_ECONOMICS.md`](./UNIT_ECONOMICS.md) — VAT-aware contribution/break-even planning.
- [`COMMERCE_AND_ENTITLEMENTS.md`](./COMMERCE_AND_ENTITLEMENTS.md) — provider-neutral orders/payments/entitlements.

## Identity and localization

- [`AUTH_AND_ONBOARDING.md`](./AUTH_AND_ONBOARDING.md) — guest-first Supabase Auth, Phase 4 anonymous ownership and later permanent-account conversion.
- [`LOCALIZATION_AND_LANGUAGE.md`](./LOCALIZATION_AND_LANGUAGE.md) — ET/RU/EN strategy.

## Data, GIS and rules

- [`DATA_SOURCES.md`](./DATA_SOURCES.md) — source registry/research.
- [`DATA_REFRESH_AND_CACHE.md`](./DATA_REFRESH_AND_CACHE.md) — **canonical** source refresh/cache/release policy.
- [`DATA_REFRESH_AND_VERSIONING.md`](./DATA_REFRESH_AND_VERSIONING.md) — compatibility pointer only; superseded.
- [`GIS_AND_RULES_ENGINE.md`](./GIS_AND_RULES_ENGINE.md)
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)
- [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)

## AI

- [`AI_SAFETY_AND_EXPLANATIONS.md`](./AI_SAFETY_AND_EXPLANATIONS.md) — Google Gemini boundary and grounding rules.

## Security, legal and quality

- [`SECURITY_PRIVACY.md`](./SECURITY_PRIVACY.md)
- [`LEGAL_AND_COMPLIANCE.md`](./LEGAL_AND_COMPLIANCE.md)
- [`TESTING.md`](./TESTING.md)
- [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)

## Operations

- [`ENVIRONMENT.md`](./ENVIRONMENT.md)
- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md)
- [`AGENT_TASK_WORKFLOW.md`](./AGENT_TASK_WORKFLOW.md)

## Architecture decisions

See [`adr/`](./adr/).

Accepted decisions currently include:

- ADR 0001 — technology stack;
- ADR 0002 — deterministic analysis vs AI explanation;
- ADR 0003 — GitHub Pages/Supabase boundary;
- ADR 0004 — Google Gemini as initial AI provider;
- ADR 0005 — scheduled/versioned data release architecture;
- ADR 0006 — guest-first authentication;
- ADR 0007 — hybrid commercial model and no report advertising;
- ADR 0008 — ET/RU/EN multilingual architecture;
- ADR 0009 — client/server state, query and validation boundaries for Phase 4+.

ADR 0009 clarifies ADR 0001: TanStack Query and Zod are not mandatory dependencies; runtime validation is mandatory and query/cache ownership must remain deliberate.

## Canonical conflict rules

When documents appear inconsistent:

1. current explicit project-owner instruction;
2. accepted ADR;
3. `AGENTS.md`;
4. active `TASKS.md` acceptance criteria;
5. detailed specification;
6. existing implementation.

`DATA_REFRESH_AND_CACHE.md` is the only canonical refresh/cache implementation document.

For active Phase 4 work, `PHASE_4_READINESS.md` records the cross-document sequencing/gates but does not override an accepted ADR.

Pricing values are hypotheses/configuration; they are not architectural constants.

External/provider/legal facts must be reverified when implementation depends on them. An unresolved item in `OPEN_QUESTIONS.md` remains unresolved until current evidence/owner decision closes it.
