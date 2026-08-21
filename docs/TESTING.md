# Testing Strategy — Krunditark

Last test-strategy review: **2026-08-15**

## 1. Goal

Krunditark is regulation-, GIS-, identity- and eventually payment-adjacent software. Tests must protect:

- factual correctness;
- uncertainty/failure semantics;
- source parsing/versioning;
- historical reproducibility;
- RLS/guest isolation;
- localization meaning;
- payment/entitlement integrity;
- accessibility;
- real user journeys.

Do not optimize test count. Protect dangerous boundaries.

## 2. Test layers

### Unit

Network-free:

- cadastral validation;
- address/official-source parser normalization;
- domain validation;
- deterministic rules;
- summary/next actions;
- data-release selection;
- analysis cache keys;
- explanation cache keys;
- translation key helpers;
- entitlement/usage logic;
- payment event mapping;
- error classification.

### Database/PostGIS

- migrations/constraints/indexes;
- RLS;
- anonymous/permanent user distinctions;
- geometry predicates;
- immutable snapshots;
- source/rule/data release relations;
- commerce uniqueness/idempotency when enabled.
- clean-start regression: drop all schemas, re-run migrations, verify tables/RLS/policies/grants from scratch (`rls-clean-start-migration.test.ts`).
- live database regression: advisory-lock isolated clean-start + immutability/provenance checks (`rls-clean-start-db.test.ts`, requires `DATABASE_URL`).

### Edge Function/API integration

- Auth/authorization;
- source adapters using mocks/fixtures;
- analysis orchestration;
- Gemini fake provider;
- payment fake/provider webhook sandbox where applicable;
- CORS/rate/resource limits;
- transaction/idempotency.

### Component/UI

Behavior-heavy components.

### E2E

Playwright against production-like built frontend + controlled backend/test fixtures.

### Playwright E2E

Playwright tests run against the **production-built frontend** served by `vite preview`, not the Vite dev server. API calls are intercepted and served deterministic fixture data so normal CI makes no public provider calls.

Scripts:

- `npm run test:e2e` — run Playwright headless
- `npm run test:e2e:ui` — run Playwright with UI mode
- `npm run test:e2e:report` — open HTML report

Projects:

- `chromium` — desktop Chrome
- `mobile-chrome` — Pixel 5 viewport

Failure diagnostics: Playwright retains screenshot, trace and video artifacts on first retry. CI uploads the `playwright-report/` directory as an artifact.

### Scheduled contract checks

Optional controlled internet workflow for official provider capabilities/schema/health; not normal unit/PR tests.

## 3. No live external dependencies in normal CI

Normal unit/integration tests must not call live:

- In-AKS/MaRu;
- PLANIS;
- EELIS;
- EHR;
- heritage/road sources;
- Riigi Teataja;
- Gemini;
- Stripe/Montonio/another payment provider;
- SMTP provider.

Use sanitized deterministic fixtures/fakes.

Live contract/sandbox tests are separate and cannot turn a provider outage into an apparent code regression without clear classification.

## 4. Address search tests

Required:

- normal address result;
- partial query;
- Estonian diacritics;
- multiple candidate results;
- no match;
- source unavailable;
- malformed source response;
- result with building/address but multiple candidate parcels;
- bounded result count;
- query length/resource limits;
- short-cache hit/miss semantics.

UI:

- keyboard autocomplete;
- screen reader labels;
- no-match != unavailable copy;
- selecting candidate preserves exact normalized ID.

## 5. Parcel resolution tests

- exact cadastral ID;
- address -> one parcel;
- address -> several parcels;
- map point -> one parcel;
- boundary/map point ambiguity;
- parcel not found;
- provider/data release unavailable;
- correct official geometry/CRS conversion;
- no ownership claim in response/domain.

## 6. Source adapter fixture requirements

Each source adapter should include:

- successful response;
- successful empty response;
- optional field absent;
- required field malformed;
- unexpected enum/code;
- invalid geometry;
- large allowed response;
- timeout/error/rate-limit mapping;
- schema/capabilities change where applicable.

Schema drift must fail safely, not silently coerce.

## 7. Data refresh/change-watch tests

### Heavy sync

- identical rerun idempotent;
- additions/updates/removals;
- incomplete fetch cannot infer mass deletion;
- candidate validation failure;
- suspicious large diff quarantined;
- promotion atomic;
- old release remains active after failure;
- carried-forward/stale state recorded;
- concurrent sync locking;
- checkpoint/batch retry.

### Legal watch

- unchanged hash/version;
- changed act/version creates candidate;
- watch failure != unchanged;
- legal candidate cannot auto-promote a rule;
- effective-date transition.

### EHR incremental later

- changed-after cursor;
- max-result/window splitting;
- cursor overlap/deduplication;
- failed batch does not advance cursor;
- periodic reconciliation catches missed change.

### In-AKS interactive cache

- short cache semantics;
- no national refresh triggered by autocomplete.

Gemini call count in routine source sync must be **zero**.

## 8. GIS fixture suite

Use synthetic metric EPSG:3301 geometries.

### Parcel/proposal

- contained;
- edge touch;
- vertex touch;
- crossing;
- partly outside;
- completely outside;
- invalid self-intersection.

### Constraints

- polygon overlap/containment/touch;
- line crossing/near threshold;
- point threshold;
- multipolygon;
- hole/interior ring.

### Legal distance threshold D

- `D - epsilon`;
- `D`;
- `D + epsilon`.

Epsilon must reflect domain semantics rather than floating-point accident.

## 9. Rule tests

Each verified rule version:

- positive trigger;
- non-trigger;
- exact boundary;
- missing fact => unknown;
- unsupported scenario => unknown;
- effective-date selection;
- no ambiguous overlapping active version;
- exact official source/version relation.

When law changes:

- retain historical rule tests;
- add new version tests;
- historical analysis selects old version;
- current analysis selects new version.

Do not delete old rule fixtures because law changed.

## 10. Analysis tests

- same frozen inputs/data/rules/engine => same canonical structured output;
- conflict precedence;
- critical unknown visibility;
- source empty vs source unavailable;
- stale source behavior;
- independent successful category survives other failure;
- exact evidence/source/rule references;
- immutable completed analysis;
- user cannot control national refresh policy;
- data release/rule manifest selection deterministic.

AI output excluded from factual reproducibility hash.

## 11. Analysis cache tests

- exact compatible inputs => safe hit;
- proposal geometry differs => miss;
- data release differs => miss;
- rule set differs => miss;
- engine/profile differs => miss;
- cached factual result cannot leak another user's private project metadata;
- idempotent concurrent request doesn't create conflicting duplicate analyses.

## 12. Proposal/variant tests

### Beginner templates

- known dimensions produce expected geometry/area;
- rotate/move preserves dimensions;
- numerical edits synchronize with map;
- invalid values rejected.

### Server validation

- malicious/client-forged area ignored;
- out-of-Estonia/unreasonable extent rejected;
- too many vertices rejected;
- invalid topology handled per policy.

### Versioning

- duplicate creates new proposal version;
- analyzed proposal cannot be silently mutated;
- A/B comparison uses exact analysis IDs;
- differences factual/deterministic;
- AI wording changes do not appear as factual scenario differences.

## 13. Anonymous/permanent Auth and RLS tests

Supabase anonymous users use `authenticated`; tests must reflect that.

Required:

- public unauthenticated cannot read private project;
- anonymous user creates/reads own bounded guest project;
- anonymous A cannot access anonymous B project;
- permanent user own project allowed;
- user A cannot access user B project;
- anonymous user cannot access permanent-only commerce/monitoring action;
- `is_anonymous` restrictive policy works even with other permissive policies;
- user cannot self-promote role;
- internal source/rules/audit/commerce event schemas not directly exposed;
- expired/deleted session denied.

## 14. Guest -> permanent conversion E2E

Must test the actual product journey:

1. visitor searches address;
2. selects parcel;
3. creates anonymous project/proposal;
4. chooses save/pay;
5. email OTP or Google conversion/link flow;
6. exact project/proposal remains;
7. new permanent session can recover it;
8. old anonymous isolation does not create duplicate ownership/leak.

Failure cases:

- OTP incorrect/expired;
- OAuth cancelled;
- existing identity conflict;
- browser refresh during flow;
- double-click/retry.

## 15. Auth email tests

Local development uses Mailpit/fake SMTP where supported.

Test:

- OTP request/resend cooldown UI;
- locale template selection;
- link tracking not relied on;
- secrets absent from logs;
- production config validation rejects/flags missing custom SMTP before launch gate.

Do not send real Auth email in normal CI.

## 16. Localization tests

### Static/catalog

- all ET critical keys present;
- enabled RU/EN critical keys present;
- no raw translation key rendered;
- invalid locale fallback controlled;
- domain state does not store localized label as fact.

### Semantic

For critical finding/action states, verify all locales preserve:

- state;
- required vs recommended distinction;
- unknown/stale limitation;
- official source identity.

### Layout

- Cyrillic;
- long Russian/English text;
- mobile buttons/dialogs;
- map popups/bottom sheets;
- print/PDF.

### Locale state

Switching ET/RU/EN:

- keeps parcel/project/proposal;
- does not rerun GIS/rules;
- explanation cache changes locale only.

## 17. AI tests

Use deterministic fake providers.

Cases:

- valid structured explanation;
- timeout;
- rate limit;
- malformed JSON;
- unknown finding/source reference;
- fabricated official URL;
- attempt to change finding state;
- prompt injection from user/source;
- refusal/safety response;
- current price/capacity request without evidence;
- language output mismatch.

Fallback must remain understandable in ET and enabled locales.

## 18. Explanation cache tests

- same result+locale+prompt+model+schema => hit;
- locale change => separate explanation;
- model/prompt schema change => miss;
- factual data release change => miss;
- invalid cached object not returned.

## 19. Commerce tests — when enabled

Normal CI uses `FakePaymentProvider`.

### Product/price

- server resolves current active price;
- client-supplied amount ignored/rejected;
- historical order references exact price version;
- inactive product cannot be purchased.

### Checkout/order idempotency

- same idempotency key/payload => same checkout/order behavior;
- same key/different payload => conflict;
- double click does not duplicate charge-intent state.

### Webhook

- valid signature;
- invalid signature;
- unknown event;
- duplicate event;
- out-of-order event where relevant;
- amount/currency/order mismatch;
- event replay;
- atomic payment/order/entitlement state.

### Fulfillment

- payment succeeds + report succeeds;
- payment succeeds + browser never returns;
- payment succeeds + report generation fails;
- retry fulfills without second payment/usage consumption;
- unauthorized user cannot open another order/report.

### Refund/subscription later

- full/partial where provider/product supports it;
- admin audit;
- active/cancelled/past-due/renewal;
- subscription expiration does not delete project history.

Live payment sandbox tests belong to isolated integration workflow.

## 20. Entitlement/usage tests

- one-time report scoped correctly;
- entitlement cannot be forged client-side;
- Project Pass only its project;
- start/expiry boundaries;
- usage limit exact boundary;
- concurrent usage cannot overconsume;
- technical retry not double-consume;
- expired entitlement still allows historical report read where product policy says so.

## 21. Sharing tests — when enabled

- high-entropy token;
- only chosen report/scope visible;
- private notes/files excluded by default;
- revocation immediate;
- expiry;
- no predictable ID-only access;
- shared route noindex header/meta behavior;
- recipient cannot mutate project.

## 22. Component tests

Prioritize:

- combined address/cadastral search;
- candidate parcel selector;
- intent cards;
- template/dimension/placement synchronization;
- finding cards;
- freshness/unknown states;
- variant comparison;
- Auth sheet/OTP;
- paywall/order status later;
- project newer-data banner.

Avoid snapshot-testing static markup heavily.

## 23. Playwright public-beta journey

Foundation implemented with desktop Chromium and mobile viewport. Current coverage:

1. landing;
2. address search (deterministic fixture);
3. cadastral parcel resolution;
4. free parcel overview;
5. supported intent selection.

As Phase 4 lands, extend to cover:

6. select sauna/house template;
7. drag/edit proposal;
8. run deterministic analysis;
9. inspect conflict/condition/unknown;
10. map evidence;
11. official source link;
12. duplicate/move proposal;
13. compare variant;
14. guest -> permanent Auth;
15. reopen saved project;
16. mobile path;
17. RU and EN critical flow smoke when enabled.

Paid launch adds checkout/recovery using provider sandbox/fake-controlled test environment.

## 24. Accessibility tests

Automated + manual:

- keyboard full core flow;
- focus/skip links;
- labels/errors;
- autocomplete accessibility;
- dialogs/bottom sheets;
- status not color-only;
- contrast;
- touch targets;
- map result text equivalent;
- comparison table/text equivalent;
- reduced motion;
- ET/RU/EN screen-reader labeling.

Target WCAG 2.2 AA.

## 25. Performance tests

Track:

- landing bundle before map;
- lazy MapLibre load;
- address search latency/caching;
- parcel lookup;
- PostGIS p50/p95 representative analysis;
- national dataset index/query plans;
- evidence geometry payload size;
- Gemini explanation latency/cache hit ratio;
- paid fulfillment latency later.

Normal local data-release analysis should not expose serial upstream-provider waits.

## 26. Product/trust quality tests

Automated tests cannot replace human domain validation.

Before supported rule/source launch:

- representative real parcels reviewed manually against official source;
- false-positive/negative samples recorded;
- unknown behavior checked;
- current legal effective date reverified;
- source attribution links work.

Do not use user conversion as the only definition of correctness.

## 27. Security tests

- RLS bypass attempts;
- IDOR on project/analysis/order/share;
- admin role spoof;
- anonymous rate abuse;
- SSRF URL manipulation;
- oversized WFS/source payload handling;
- geometry DoS;
- stored/reflected source/user text XSS;
- prompt injection;
- secret scan/frontend bundle scan;
- payment webhook replay/signature;
- upload parser/resource abuse later.

## 28. CI gates

Base PR:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

As implemented add:

- clean Supabase migration/RLS;
- Edge Function tests;
- GIS regression;
- i18n completeness;
- critical Playwright;
- commerce fake-provider tests;
- security checks.

Optional scheduled workflows:

- official API/WFS capability smoke;
- source schema drift;
- legal change-watch integration;
- EHR cursor integration;
- payment-provider sandbox smoke.

## 29. Test data/privacy

Prefer synthetic data.

Never commit:

- private project/user data;
- Auth/payment/API secrets;
- real private uploads;
- non-public protected-location data;
- production webhook payloads containing unnecessary identifiers.

Public-source fixtures are minimized, attributed and used according to source terms.

## 30. Release test evidence

PR/release notes for material changes should list:

- tests run;
- fixture/source version;
- migrations;
- rule versions;
- UI locales tested;
- E2E scenarios;
- known limitations;
- live integration verification where applicable.
