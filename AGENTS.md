# AGENTS.md — Krunditark implementation contract

This file is the primary instruction set for AI coding agents working in this repository.

## 1. Mission

Build **Krunditark**, an Estonia-first property/buildability decision platform whose flagship product is **Ehituspass**.

Krunditark helps a user:

- find/select the correct parcel;
- understand supported official facts/constraints;
- place an exact proposed building/scenario;
- compare alternatives;
- understand supported process implications;
- see unknowns/freshness;
- know what to do next;
- preserve a reproducible project/report over time.

The product must reduce bureaucracy/information fragmentation without pretending to replace an authority, architect, designer, surveyor, utility provider, appraiser or lawyer.

## 2. Mandatory read order before coding

Before implementing a task, read:

1. `AGENTS.md`
2. `TASKS.md`
3. `docs/PRODUCT_REQUIREMENTS.md`
4. `docs/USER_JOURNEYS_AND_PERSONAS.md`
5. `docs/UX_UI_SPEC.md`
6. `docs/MVP_SCOPE.md` for current minimum launch boundary
7. `docs/ARCHITECTURE.md`
8. task-specific documents below
9. relevant ADRs in `docs/adr/`
10. `docs/DEFINITION_OF_DONE.md`

### Phase 4 mandatory reading

For KT-038 through KT-048, also read **before coding**:

- `docs/PHASE_4_READINESS.md`
- `docs/AUTH_AND_ONBOARDING.md`
- `docs/API_SPECIFICATION.md`
- ADR 0006
- ADR 0009
- `docs/OPEN_QUESTIONS.md` OQ-003 and OQ-005 when the task touches map provider or supported structure/scenario claims.

Do not mark KT-040 production-ready while OQ-003 is unresolved. Do not mark a KT-043 structure/scenario fully supported while OQ-005 is unresolved.

### Task-specific reading

For source/data work:

- `docs/DATA_SOURCES.md`
- `docs/DATA_REFRESH_AND_CACHE.md` (**canonical refresh policy**)
- `docs/GIS_AND_RULES_ENGINE.md`

`docs/DATA_REFRESH_AND_VERSIONING.md` is compatibility-only and must not be used as current implementation authority.

For AI:

- `docs/AI_SAFETY_AND_EXPLANATIONS.md`
- ADR 0004

For auth/account:

- `docs/AUTH_AND_ONBOARDING.md`
- ADR 0006
- ADR 0009 for Phase 4 state ownership/boundaries

For localization:

- `docs/LOCALIZATION_AND_LANGUAGE.md`
- ADR 0008

For payment/monetization:

- `docs/BUSINESS_MODEL_AND_PRICING.md`
- `docs/COMMERCE_AND_ENTITLEMENTS.md`
- ADR 0007

For future scope:

- `docs/ROADMAP.md`
- `docs/PRODUCT_EXPANSION_BACKLOG.md`

For analytics/growth:

- `docs/PRODUCT_ANALYTICS_AND_GROWTH.md`

If code and documentation disagree, do not silently choose one. Identify the conflict, preserve the safer behavior, and update docs in the same change when the intended design changes.

## 3. Source-of-truth precedence

For active implementation:

1. explicit current project-owner instruction;
2. accepted ADRs;
3. `AGENTS.md` safety/architecture rules;
4. `TASKS.md` active task acceptance criteria;
5. detailed specification docs;
6. existing code behavior only when not contradicted by above.

Do not use an old implementation shortcut as authority over current docs.

A newer ADR may explicitly clarify an earlier ADR without invalidating its unaffected decisions. ADR 0009 currently clarifies the TanStack Query/Zod and Phase 4 client-state interpretation of ADR 0001.

## 4. Product boundary — not a generic chatbot

Krunditark's strategic value is the persistent spatial decision workflow:

```text
parcel + intent + proposal geometry + verified data/rules
 -> reproducible findings
 -> map evidence
 -> variant comparison
 -> next actions
 -> project history/change monitoring
```

Do not turn the product into:

```text
cadastral ID -> Gemini -> free-form “yes/no” answer
```

Krunditark must differentiate through exact scenario modeling, workflow, evidence, history, comparison and professional/B2B capabilities.

## 5. Non-negotiable truth model

### 5.1 AI is not source of truth

Authoritative supported findings come from:

- approved official/authoritative source data;
- deterministic PostGIS/spatial analysis;
- versioned verified rules;
- explicit completeness/freshness state.

Gemini may:

- explain structured findings;
- summarize approved source evidence;
- answer scoped questions;
- localize plain-language explanations;
- help parse candidate document content only in explicitly approved future workflows.

Gemini must not:

- decide legal permission independently;
- invent setback/protection zone/permit/fee/capacity;
- convert `unknown` to `clear`;
- invent official URLs;
- modify deterministic state;
- use model memory as current law/source data.

### 5.2 Finding states

Use:

- `clear`
- `condition`
- `conflict`
- `unknown`

Severity/priority is separate.

Never create a fake legal/buildability probability.

### 5.3 Every material finding requires provenance

Persist/reference:

- source definition;
- exact dataset/source version;
- source object ID where available;
- source URL/authority;
- retrieval/sync/effective metadata;
- normalized facts;
- exact rule version;
- geometry/evidence/measurements;
- data release;
- engine/profile version;
- proposal/parcel snapshot.

No provenance => no authoritative finding.

### 5.4 Unknown is valid

Use `unknown` when data is:

- unavailable;
- stale beyond policy;
- intentionally non-public;
- ambiguous;
- unsupported;
- semantically incomplete;
- awaiting legal/rule verification.

Do not treat missing source rows after a failed request as “no restriction”.

## 6. User experience rules

### 6.1 Address-first, not cadastral-ID-only

Consumer UX must support:

- address search (official In-AKS path);
- cadastral identifier;
- map selection.

Do not require ordinary users to visit another service to find a cadastral ID first.

The map path is real functionality: `Vali krunt kaardilt` must lead to an explicit map selection/resolution/confirmation flow, not an inert button.

### 6.2 Intent before legal terminology

Ask what user wants to do using canonical intent codes underneath localized labels:

- `build`;
- `pre_purchase`;
- `understand_parcel`;
- `existing_building_modification` later;
- `professional` context later.

Do not persist translated labels. Do not use legacy aliases as canonical identifiers.

Do not force a buyer through a building wizard.

### 6.3 Beginner templates

Default consumer placement should offer structure templates/dimensions and drag/rotate.

Do not require polygon drawing as the first interaction.

A valid `structure_type` enum/code is **not automatically a verified-supported legal product scenario**. OQ-005 must be resolved before supported-card claims.

### 6.4 Every report ends with next actions

Information without a next step is incomplete UX.

Actions distinguish:

- required/necessary check;
- likely process step;
- recommendation;
- optional preparation.

### 6.5 Variant comparison

Scenario A/B comparison is a core product capability. Preserve exact differences; no black-box score.

Do not prematurely claim full variant comparison during Phase 4 just because reusable proposal-version primitives exist.

### 6.6 Map is not the only output

Every spatial finding has a text equivalent for accessibility and comprehension.

### 6.7 Never claim ownership

Searching a parcel does not prove ownership. Use `selected parcel/project parcel`; do not say `your property` unless verified by an approved future mechanism.

## 7. Guest-first authentication rules

See ADR 0006 and ADR 0009.

- No **permanent account** before meaningful parcel/proposal value.
- Public parcel search/selection/free overview may remain unauthenticated/bounded.
- When stateful proposal/project ownership becomes necessary, create/reuse Supabase anonymous Auth and an owner-scoped guest project.
- Anonymous Auth is a technical owner identity, not a signup wall.
- Phase 4 owner-RLS proposal persistence must not precede this guest owner identity.
- Anonymous users use `authenticated`; RLS must explicitly inspect `is_anonymous` when permanent identity is required.
- Anonymous A must never access anonymous B project/proposal state.
- Preserve selected parcel, intent and proposal state across route/locale changes.
- Preserve anonymous project through later identity conversion.
- Primary permanent methods later: email OTP + Google.
- No password required by default.
- Public email Auth requires custom SMTP.
- Anonymous projects/drafts need abuse limits and later retention cleanup.
- Auth/payment dialogs never discard current project state.
- Never use browser service-role credentials/shared ownership to avoid RLS.

## 8. Localization rules

See ADR 0008.

- Estonian (`et`) canonical/default.
- Code architecture supports `et`, `ru`, `en` from first frontend implementation.
- Do not scatter user-facing strings in components.
- Critical legal/status/payment/privacy terminology uses controlled translation catalogs.
- Domain codes/facts remain locale-independent.
- Official Estonian legal source remains traceable.
- Gemini localized explanation cannot change the finding.
- Locale change preserves selected project/parcel/proposal draft and does not rerun deterministic analysis.
- Test Cyrillic/long-text/mobile layout.

## 9. Commercial/product-neutrality rules

See ADR 0007.

Recommended commercial architecture:

- free parcel overview;
- one-time consumer reports;
- limited-duration Project Pass;
- professional recurring subscription/usage later;
- B2B/API later;
- professional referral marketplace later.

Do not:

- force a recurring subscription on an episodic consumer by default;
- put banner/programmatic ads inside Ehituspass/analysis workspace;
- let a paid partner change/suppress/rank findings;
- hard-code current price values into domain semantics.

Specific prices are hypotheses/configuration.

## 10. Payment/entitlement rules

When commerce is promoted into active tasks:

- provider-neutral `Order`, `PaymentAttempt`, `PaymentEvent`, `Entitlement`, `Refund`, usage concepts;
- provider checkout client redirect is not payment authority;
- verify signed provider webhooks server-side;
- dedupe/idempotency mandatory;
- entitlement granted server-side;
- paid report recovery if browser closes;
- report generation retry must not charge/consume twice;
- provider SDK types stop at adapter boundary;
- client cannot set amount/product/entitlement;
- audit admin refunds/manual entitlement changes.

Do not select Stripe/Montonio silently; follow `OPEN_QUESTIONS.md` and add provider ADR when chosen.

## 11. Data refresh/cache rules

`docs/DATA_REFRESH_AND_CACHE.md` is canonical.

Do not implement a universal “fetch everything monthly” or “fetch everything on every user analysis” strategy.

Source classes:

- heavy replicated spatial datasets: scheduled release, monthly baseline where appropriate;
- cheap legal/EHR/source metadata changes: daily/weekly change watch where supported;
- In-AKS address search: live/short-cache integration;
- legal interpretation: manual/verified rule promotion;
- restricted/non-replicable: source-specific live/manual handling.

Normal source sync uses zero Gemini tokens.

Failed sync:

- never overwrites active good release;
- freshness ages;
- alert/health state;
- category may become partial/unknown if beyond safe age.

## 12. Source adapter rules

Every source adapter has:

- stable source ID;
- approved endpoint/base URL;
- semantic scope;
- refresh strategy;
- timeout/retry/size limits;
- response schema validation;
- normalizer version;
- deterministic fixtures;
- source object/version metadata;
- typed failure classes;
- attribution/terms review.

Public interactive source functions additionally need bounded caller/request behavior appropriate to their traffic. Frontend submit/debounce behavior is not the only abuse control.

Unit tests do not depend on public internet.

Prefer official machine-readable API/WFS/download over scraping.

## 13. GIS rules

- PostGIS authoritative for material spatial calculations.
- Canonical Parcel/Proposal/Constraint geometry is EPSG:3301.
- Browser/API map interchange may use EPSG:4326 as documented.
- Never calculate legal distance using naive degrees.
- Use correct spatial predicate for domain semantics.
- `ST_Intersects` is not synonymous with `legal violation`.
- Test touching/crossing/contained/near-threshold/invalid/multipolygon/holes.
- Index spatial query columns (GiST etc.).
- Preserve evidence/measurement.

### Phase 4 proposal geometry

- browser/editor draft is mutable preview/input state;
- canonical persisted proposal is server-validated EPSG:3301 state;
- server/PostGIS computes authoritative area/perimeter;
- client area/perimeter are preview values only;
- geometry repair, if any, follows an explicit policy;
- a proposal referenced by terminal analysis is never mutated in place.

## 14. Rules-engine rules

A production rule is versioned code/data, not prompt text.

Each has:

- stable code;
- version;
- status `draft|verified|retired`;
- effective dates;
- official source/reference;
- deterministic evaluator;
- expected facts;
- outputs;
- tests;
- verification metadata.

Legal text change:

```text
detected -> candidate -> review -> draft rule -> tests -> verified promotion
```

Never automatically turn LLM/document diff into production legal interpretation.

A Phase 4 structure-support matrix is a product-scope gate; Phase 7/KT-072 re-verifies and deepens it into exact deterministic legal/process semantics.

## 15. Frontend architecture

Target foundation:

- React;
- TypeScript strict;
- Vite;
- MapLibre GL JS;
- React Router;
- typed Krunditark-owned API clients;
- runtime validation at external trust boundaries;
- ET/RU/EN i18n;
- accessible reusable component system.

ADR 0009 clarifies ADR 0001:

- **TanStack Query is optional**, not a dependency to install merely to match an old stack list; introduce it only when shared remote-state orchestration/invalidation justifies it.
- **Zod is optional**; explicit deterministic parsers/validators are valid when they accept `unknown`, return typed errors and are well-tested.
- runtime validation itself is mandatory.
- if TanStack Query is introduced, do not duplicate source/HTTP cache ownership with inconsistent freshness semantics.
- domain models must not depend on provider SDK/schema-library types.

Suggested feature structure:

```text
src/
  app/
  components/
  features/
    parcel-search/
    parcel-overview/
    proposal-editor/
    analysis/
    ehituspass/
    variants/
    auth/
    account/
    projects/
    commerce/          when promoted
  domain/
  lib/
  types/
  styles/
  locales/
```

Do not create a monolithic `App.tsx` with provider/domain/business logic.

GitHub Pages is static. No secret/server runtime in frontend bundle.

### Map-specific frontend rule

MapLibre is fixed; the **production map/style/orthophoto provider is not**. OQ-003 / issue #50 must be resolved from current provider terms before production-ready status. A development tile/style source must be explicitly temporary.

Map point parcel resolution happens on explicit user click/selection, not continuous pointer movement.

## 16. Backend architecture

Supabase Cloud:

- PostgreSQL/PostGIS;
- Auth;
- Storage;
- Edge Functions;
- scheduled Cron/background orchestration.

All database changes:

- ordered migrations;
- clean-db compatible;
- never edit applied production migrations;
- forward fixes only.

Privileged operations happen server-side.

Normal owner project/proposal operations use the user's authenticated/anonymous RLS path rather than service-role bypass.

## 17. Database/RLS rules

- RLS on all client-accessible user tables.
- Default deny, least privilege.
- Internal `geo`, `rules`, ingestion, audit, commerce event tables not exposed broadly merely because source data is public.
- Users access own projects/reports/orders.
- Anonymous users own their own guest projects through `auth.uid()`.
- Admin role server-verified; never trust client `isAdmin`.
- Anonymous/permanent distinction enforced where needed.
- Completed analyses immutable.
- Persisted proposal versions used by terminal analyses immutable.
- Price/order/source/rule history versioned.
- Critical relationships not hidden only in arbitrary JSON.
- indexes reviewed for FK/filter/spatial usage.

## 18. AI provider rules

Initial provider: Google Gemini API.

- current supported Google GenAI SDK at implementation time;
- `GEMINI_API_KEY` server secret only;
- model server-configured;
- adapter interface owned by Krunditark;
- structured output + Krunditark validation;
- timeout/token/output limits;
- no autonomous web search for authoritative project facts unless future ADR explicitly defines a safe non-authoritative role;
- fake provider in normal CI;
- provider outage has deterministic fallback;
- cache explanation by result/locale/model/prompt/schema.

Model lifecycle changes; always verify current official Google docs before upgrading/pinning.

## 19. Privacy/security rules

- no secret in Git/fixtures/logs/browser;
- minimize account/project PII;
- do not collect parcel-owner identity for ordinary analysis;
- validate Edge Function input;
- resource limits for geometry/uploads/source calls;
- SSRF-safe source allow-lists;
- bounded public discovery request behavior;
- request/correlation IDs for supportable server/provider failures;
- logs exclude tokens/credentials/full sensitive payloads and should not store full user-entered addresses by default;
- production CORS origins explicit;
- secure high-entropy revocable share links;
- payment webhook verification;
- account/project deletion/retention implemented before public production;
- analytics data minimized.

## 20. Analytics rules

Do not add analytics provider before privacy decision.

Typed event taxonomy, but avoid third-party payloads containing:

- full address;
- cadastral ID;
- proposal geometry;
- notes/files;
- email/name;
- AI prompts;
- auth/payment IDs.

Server payment/report events are authoritative.

A/B testing may change onboarding/pricing layout but never factual finding/source/warning visibility.

## 21. Cost/utility rules

If costs are implemented:

- structured source/date/region/method;
- range, not fake precision;
- distinguish official fee vs market estimate vs provider quote;
- no Gemini-memory current pricing.

Utilities distinguish:

```text
network/proximity
!= service area
!= available capacity
!= approval
!= final quote
```

## 22. Professional/B2B rules

Future Pro mode uses the **same truth engine**.

Professional capabilities can add:

- information density;
- templates;
- teams;
- export;
- batch/API;
- client workflows.

Do not fork a less-safe “professional truth mode”.

B2B APIs need explicit `/v1` versioning/contracts before external consumers depend on them.

## 23. Coding standards

- TypeScript strict.
- No unjustified `any`.
- English code comments; explain why, not syntax.
- Estonian canonical user copy through i18n keys.
- small pure functions for normalization/rules.
- provider types stay at adapter boundaries.
- external inputs runtime-validated.
- no hidden network calls in domain logic.
- no hard-coded secret/production credentials.
- no giant god services.
- domain logic runnable/testable without network where feasible.

## 24. Testing contract

Relevant changes require appropriate:

- unit tests;
- source fixture/parser tests;
- DB migration/RLS tests;
- PostGIS boundary/regression tests;
- Edge Function auth/contract/resource-limit tests;
- UI/component tests;
- Playwright critical journeys;
- i18n missing-key/layout tests;
- payment fake-provider/webhook/idempotency tests when commerce exists;
- prompt-injection/AI fallback tests.

### Phase 4 browser rule

Do not wait until final beta to add the first Playwright test.

Map/editor work needs production-like browser coverage because jsdom cannot prove:

- WebGL/MapLibre initialization;
- actual routing/history;
- pointer/touch interaction;
- browser focus sequencing;
- viewport/map sizing;
- responsive bottom-sheet behavior.

Normal CI E2E uses deterministic backend fixtures and must not depend on live government/map/provider availability.

No normal unit test uses live government service, live Gemini or real payment API.

## 25. Accessibility

Target WCAG 2.2 AA.

- keyboard;
- visible focus;
- semantic labels;
- status not color-only;
- adequate contrast;
- touch targets;
- reduced motion;
- map findings duplicated textually;
- dialogs/bottom sheets manage focus;
- ET/RU/EN layouts tested.

## 26. Task workflow

For each task:

1. pick unblocked item from `TASKS.md`;
2. read mandatory/task docs;
3. for Phase 4 read `PHASE_4_READINESS.md` and ADR 0009;
4. verify dependencies/open questions;
5. verify current external provider/law docs if implementation depends on unstable details;
6. implement smallest complete vertical slice;
7. add tests, including real-browser tests for map/editor behavior;
8. run checks;
9. update docs/contracts;
10. update task status only when acceptance passes;
11. summarize known limitations.

Future `PRODUCT_EXPANSION_BACKLOG.md` items must first be promoted to `TASKS.md` with concrete acceptance criteria.

## 27. Documentation maintenance

Documentation is product code.

Update when changing:

- user journey;
- UI semantics;
- API/data model;
- source/cadence;
- rule semantics;
- auth/RLS;
- client/server state ownership;
- language/terminology;
- payment/entitlement;
- pricing product definition;
- AI provider behavior;
- deployment/security;
- analytics;
- roadmap/active scope.

Significant decisions require ADR; supersede/clarify history rather than silently relying on a contradictory old decision.

Do not edit an applied database migration merely to make documentation match new intent; add a forward migration if persistence must change.

## 28. Definition of done

A task is not done until it meets:

- task acceptance criteria;
- `docs/DEFINITION_OF_DONE.md`;
- applicable source/security/i18n/payment/accessibility requirements;
- documentation consistency.

Phase 4 tasks additionally require applicable `PHASE_4_READINESS.md` gates.

Analysis tasks additionally require reproducibility/provenance/deterministic tests.

## 29. Explicitly forbidden shortcuts

Do not:

- ask Gemini “can this be built?” and make it the authority;
- expose Supabase elevated keys, Gemini keys or payment secrets in frontend;
- disable/bypass RLS for convenience;
- use a browser service-role/shared identity to persist guest projects;
- trust client geometry/area/perimeter for authoritative results;
- treat a valid structure enum as verified legal support;
- silently map `Muu`/unsupported scenario to a supported rule profile;
- choose a production basemap merely because an unverified public tile endpoint works;
- fire map parcel-resolution requests continuously on pointer movement;
- hard-code a legal interpretation without version/source;
- label missing/stale/provider-failed data “no restrictions” or `not_found`;
- fetch every official source per user analysis;
- call Gemini during routine data sync;
- require permanent signup on landing/proposal entry solely because account features exist;
- lose guest project during route/locale/auth/payment transitions;
- hard-code user strings so RU/EN require a rewrite;
- use banner ads in finding/report UI;
- let partner revenue affect findings;
- grant entitlement based only on client payment redirect;
- use current provider/model/pricing details from old docs without re-verification;
- scrape official UI when approved structured API/data exists;
- claim utility capacity/price from line proximity;
- claim parcel ownership from cadastral selection;
- use AI-generated price/legal source as fact;
- silently mutate old reports/proposal history to current state;
- generate thin parcel SEO pages exposing/projecting user intent.

## 30. When uncertain

For regulatory/data uncertainty, choose `unknown` or `condition` with an explicit next verification step.

For architecture/product uncertainty, check accepted ADR/spec first. If still unresolved and task is blocked, record it in `OPEN_QUESTIONS.md`/task notes and request the project-owner decision rather than inventing one.

For current Phase 4 work specifically:

- OQ-003 remains open until the production map provider is verified;
- OQ-005 remains open until the first legal/product scenario matrix is verified;
- independent work may continue, but production/supported claims must remain blocked at those gates.
