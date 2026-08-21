# Testing Strategy — Krunditark

Last test-strategy review: **2026-08-21**

For Phase 4, `PHASE_4_IMPLEMENTATION_GUIDE.md` contains mandatory task-specific tests/DoD in addition to this strategy.

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
- proposal version allocation/idempotency when Phase 4 persistence lands;
- source/rule/data release relations;
- commerce uniqueness/idempotency when enabled;
- clean-start regression: drop all schemas, re-run migrations, verify tables/RLS/policies/grants from scratch;
- live database regression using an isolated test database where `DATABASE_URL` is required.

### Edge Function/API integration

- Auth/authorization;
- source adapters using mocks/fixtures;
- map-tile proxy allow-list/coordinates/timeouts/response limits;
- analysis orchestration;
- Gemini fake provider;
- payment fake/provider webhook sandbox where applicable;
- CORS/rate/resource limits;
- transaction/idempotency;
- correlation/request IDs and privacy-safe diagnostics for public APIs.

### Component/UI

Behavior-heavy components using deterministic mocks/fixtures.

### E2E

Playwright against the **production-like built frontend** + controlled backend/test fixtures.

### Playwright E2E

Playwright tests run against the **production-built frontend** served by `vite preview`, not the Vite dev server. API calls are intercepted and served deterministic fixture data so normal CI makes no public provider calls.

Playwright becomes an active Phase 4 gate because Leaflet lifecycle, real routing, map container sizing, pointer/touch events, browser focus, plugin behavior and responsive bottom-sheet interactions cannot be proven completely by jsdom.

Scripts:

- `npm run test:e2e` — run Playwright headless
- `npm run test:e2e:ui` — run Playwright with UI mode
- `npm run test:e2e:report` — open HTML report

Projects:

- `chromium` — desktop Chrome
- `mobile-chrome` — Pixel 5 viewport

Failure diagnostics: Playwright retains screenshot, trace and video artifacts on first retry. CI uploads the `playwright-report/` directory as an artifact.

### Scheduled/controlled contract checks

Optional controlled internet workflow for official provider capabilities/schema/health and target-environment map-provider integration; not normal unit/PR tests.

## 3. No live external dependencies in normal CI

Normal unit/integration/E2E tests must not call live:

- In-AKS/MaRu analytical endpoints;
- MaRu production tile origin;
- PLANIS;
- EELIS;
- EHR;
- heritage/road sources;
- Riigi Teataja;
- Gemini;
- Stripe/Montonio/another payment provider;
- SMTP provider.

Use sanitized deterministic fixtures/fakes/interception.

Live contract/sandbox tests are separate and cannot turn a provider outage into an apparent code regression without clear classification.

## 4. Phase 4 browser E2E foundation

KT-038 creates the real-browser safety net before the map/proposal editor becomes complex.

Minimum configuration:

- Playwright dependency pinned through the lockfile;
- explicit `test:e2e` or equivalent script;
- production build served for tests rather than only Vite dev mode;
- deterministic API/backend/tile interception or local test backend;
- desktop Chromium;
- mobile viewport/project;
- traces/screenshots on failure where useful;
- CI execution for the critical journey.

Minimum early Phase 4 scenario:

1. built app loads a locale route;
2. deterministic parcel discovery succeeds;
3. free parcel overview renders;
4. build intent is selected;
5. map/proposal route opens;
6. selected parcel/intent are preserved;
7. Leaflet map mounts with non-zero usable dimensions;
8. beginner proposal draft appears when implemented;
9. locale switch/navigation does not silently discard active work;
10. mobile layout remains usable.

Extend this scenario as click selection, drag/rotate/resize, server validation and proposal persistence land.

Do not postpone the first browser test until the final public-beta phase; KT-136 extends this foundation.

## 5. Address search tests

Required:

- normal address result;
- partial query submitted explicitly;
- Estonian diacritics;
- multiple candidate results;
- no match;
- source unavailable;
- upstream timeout;
- malformed source response;
- oversized/unreasonable provider response handling;
- result with building/address but multiple candidate parcels;
- bounded result count;
- query length/resource limits;
- short-cache hit/miss semantics;
- rate/burst-limit semantics when implemented;
- request/correlation ID on success/failure.

UI:

- submit by button and Enter;
- no upstream request merely from typing;
- accessible candidate list after submitted multi-result search;
- screen-reader labels;
- no-match != unavailable/rate-limited copy;
- selecting candidate preserves exact normalized ID.

## 6. Parcel resolution tests

- exact cadastral ID;
- address -> one parcel;
- address -> several parcels;
- map point -> one parcel;
- boundary/map point ambiguity;
- parcel not found;
- provider/data release unavailable;
- correct official geometry/CRS conversion;
- no ownership claim in response/domain;
- point selection sends WGS84 latitude/longitude in the documented order;
- map pointer movement does not continuously trigger parcel resolution;
- explicit click/selection triggers at most the intended bounded request flow.

## 7. Leaflet map and parcel-selection tests

### Renderer/lifecycle

- Leaflet module is lazy-loaded where required by KT-040;
- map container has usable dimensions in desktop/mobile routes;
- mount/unmount/remount does not duplicate map/plugin listeners;
- Leaflet object instances are not stored as persisted project/domain state.

### Basemap

- `Kaart` default through the owned proxy;
- `Ortofoto` mode switch;
- switching base layer preserves parcel/proposal overlays and project/editor state;
- source/data-age attribution remains visible;
- tile-proxy/provider failure shows degraded basemap state;
- tile failure does not become parcel `not_found`, analysis `clear` or project loss;
- normal CI intercepts/fixtures tile requests rather than calling MaRu production tiles.

### Map parcel selection

Component/integration:

- `Vali krunt kaardilt` opens/navigates to the map workflow;
- one deliberate click/tap triggers the canonical point selector;
- pointer movement triggers zero parcel-resolution requests;
- rapid/repeated clicks while pending are bounded/cancelled/serialized according to implementation contract;
- resolved point selection shows candidate summary;
- ambiguous point selection requires explicit confirmation;
- not-found/unavailable/invalid-source/loading are distinct;
- confirming a parcel reaches the same free overview/intent flow as text search;
- locale is preserved.

Playwright:

- map entry -> explicit point selection -> candidate -> confirm -> free overview;
- desktop and mobile viewport;
- back/forward does not lose confirmed project state unexpectedly.

## 8. Map-tile proxy tests

When KT-040 implements the proxy, cover at minimum:

- only `kaart`/`ortofoto` approved modes accepted;
- numeric tile coordinate/zoom validation;
- unsupported mode/zoom rejected without upstream fetch;
- no arbitrary `url=`/host injection path;
- fixed upstream allow-list;
- timeout mapping;
- non-image/oversized upstream response rejection;
- safe cache/content-type propagation;
- provider 4xx/5xx classification;
- CORS for intended environments;
- logs/request IDs contain no project/address/proposal payload;
- no secret required in browser bundle.

A controlled preview/manual integration verifies real MaRu behavior separately from normal CI and records attribution/proxy operational evidence.

## 9. Source adapter fixture requirements

Each analytical source adapter should include:

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

## 10. Data refresh/change-watch tests

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
- no national refresh triggered by address search.

Gemini call count in routine source sync must be **zero**.

The visual MaRu basemap is not an analytical data-release source and is tested under the map/proxy sections above.

## 11. GIS fixture suite

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

## 12. Rule tests

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

## 13. Analysis tests

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

AI output is excluded from the factual reproducibility hash.

## 14. Analysis cache tests

- exact compatible inputs => safe hit;
- proposal geometry differs => miss;
- data release differs => miss;
- rule set differs => miss;
- engine/profile differs => miss;
- cached factual result cannot leak another user's private project metadata;
- idempotent concurrent request doesn't create conflicting duplicate analyses.

## 15. Proposal/editor tests

### Beginner templates

- known dimensions produce expected deterministic **draft** geometry;
- template is convenience metadata, not authoritative analysis provenance;
- invalid/zero/negative/non-finite dimensions rejected;
- previewing/changing a template does not silently create persisted history.

### Placement editor

- drag updates the typed draft;
- rotate updates draft orientation/geometry;
- numeric resize updates geometry and preview values;
- reset/delete semantics are explicit for unpersisted draft;
- map pan/base-layer switch does not mutate proposal;
- map/form controls remain synchronized after a sequence of edits;
- route/locale change preserves active draft according to KT-039;
- plugin/listener cleanup works after unmount/remount;
- mobile pointer/touch flow passes Playwright;
- essential precision has a numeric/keyboard alternative.

Use `@geoman-io/leaflet-geoman-free` only for features available in the free package; no test may hide a Phase 4 dependency on a Pro-only feature.

### Advanced polygon mode

- opt-in rather than beginner default;
- draw/edit vertex;
- deterministic GeoJSON serialization;
- vertex/resource limits;
- invalid/self-intersection feedback;
- unsupported hole/MultiPolygon semantics fail safely;
- leaving/switching modes handles potential data loss explicitly.

### Browser draft vs canonical server proposal

- browser draft interchange uses the documented CRS/contract;
- server transforms to EPSG:3301;
- malicious/client-forged area ignored;
- client perimeter/area preview never overrides server/PostGIS calculation;
- canonical area matches expected metric result;
- canonical perimeter matches expected metric result;
- out-of-Estonia/unreasonable extent rejected;
- too many vertices rejected;
- invalid topology handled per explicit repair/reject policy;
- same valid input produces the same canonical output;
- server result cannot be mistaken for raw browser geometry.

### Versioning/idempotency

- unpersisted draft can be edited/reset/deleted without creating historical versions;
- saving creates the intended new proposal version;
- same semantic save retry returns/reuses the same outcome according to the selected idempotency contract;
- same idempotency key with different payload fails safely;
- concurrent saves do not collide/overwrite version numbers;
- database rollback leaves no partial version;
- editing a persisted scenario creates a new version under the canonical lifecycle;
- analyzed/terminal proposal cannot be silently mutated;
- server save failure preserves the client draft/retry path;
- later A/B comparison uses exact analysis IDs.

Full variant duplication/comparison remains the later Phase 9 workflow; Phase 4 tests must not falsely claim it is complete.

## 16. Structure-support tests

Before KT-043 can call a structure fully supported:

- every verified-supported card maps to the explicit verified scenario matrix;
- a valid domain enum that is not verified-supported cannot render as fully supported;
- planned/unsupported structure stays unsupported;
- custom/`Muu` follows the documented limited-check flow;
- custom/unsupported input cannot fall back to a supported analysis profile;
- stale/missing support matrix fails safe rather than defaulting all types to supported;
- labels/locales do not change stable structure/support identity.

OQ-005 must be resolved from current official law before these become production support tests.

## 17. Anonymous/permanent Auth and RLS tests

Supabase anonymous users use `authenticated`; tests must reflect that.

### Phase 4 minimum guest ownership

Required before owner-RLS proposal persistence:

- public unauthenticated visitor can perform allowed parcel discovery/free overview;
- anonymous session is created/reused only when stateful project work becomes necessary;
- anonymous user creates/reads own bounded guest project;
- anonymous A cannot access anonymous B project/proposal;
- selected parcel + canonical intent survive route/locale changes once project state exists;
- owner-RLS proposal create/read works through the anonymous user's own JWT;
- anonymous bootstrap failure does not fall back to a shared/service-role browser path;
- repeated route/retry flow does not create uncontrolled duplicate guest projects;
- user cannot self-promote role;
- internal source/rules/audit schemas remain unavailable.

### Permanent user/later conversion

- permanent user own project allowed;
- user A cannot access user B project;
- anonymous user cannot access permanent-only commerce/monitoring action;
- `is_anonymous` restrictive policy works even with other permissive policies;
- expired/deleted session denied.

## 18. Guest -> permanent conversion E2E — later account phase

Must test the actual product journey when permanent Auth is implemented:

1. visitor searches/selects parcel;
2. creates anonymous project/proposal;
3. chooses durable save/pay/recovery;
4. email OTP or Google conversion/link flow;
5. exact project/proposal remains;
6. new permanent session can recover it;
7. old anonymous isolation does not create duplicate ownership/leak.

Failure cases:

- OTP incorrect/expired;
- OAuth cancelled;
- existing identity conflict;
- browser refresh during flow;
- double-click/retry.

## 19. Auth email tests

Local development uses Mailpit/fake SMTP where supported.

Test later:

- OTP request/resend cooldown UI;
- locale template selection;
- link tracking not relied on;
- secrets absent from logs;
- production config validation rejects/flags missing custom SMTP before launch gate.

Do not send real Auth email in normal CI.

## 20. Localization tests

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

- keeps parcel/project/proposal draft and persisted proposal identity;
- does not recreate Leaflet/editor state in a way that loses draft/project facts;
- does not rerun GIS/rules;
- explanation cache changes locale only.

## 21. AI tests

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

## 22. Explanation cache tests

- same result+locale+prompt+model+schema => hit;
- locale change => separate explanation;
- model/prompt schema change => miss;
- factual data release change => miss;
- invalid cached object not returned.

## 23. Commerce tests — when enabled

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

## 24. Entitlement/usage tests

- one-time report scoped correctly;
- entitlement cannot be forged client-side;
- Project Pass only its project;
- start/expiry boundaries;
- usage limit exact boundary;
- concurrent usage cannot overconsume;
- technical retry not double-consume;
- expired entitlement still allows historical report read where product policy says so.

## 25. Sharing tests — when enabled

- high-entropy token;
- only chosen report/scope visible;
- private notes/files excluded by default;
- revocation immediate;
- expiry;
- no predictable ID-only access;
- shared route noindex header/meta behavior;
- recipient cannot mutate project.

## 26. Component tests

Prioritize:

- combined address/cadastral search;
- candidate parcel selector;
- Leaflet map parcel selector;
- intent cards;
- structure support cards;
- template/dimension/placement synchronization;
- advanced polygon invalid states;
- proposal validation errors;
- freshness/unknown states;
- finding cards later;
- variant comparison later;
- Auth sheet/OTP later;
- paywall/order status later;
- project newer-data banner later.

Avoid snapshot-testing static markup heavily.

## 27. Playwright public-beta journey

<<<<<<< HEAD
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
    \=======
    The beta suite extends the Phase 4 browser foundation.

At minimum as features become available:

1. landing;
2. address search;
3. ambiguous parcel choice;
4. map parcel selection;
5. free parcel overview;
6. choose build intent;
7. select supported/limited structure scenario;
8. select template;
9. drag/rotate/resize proposal;
10. advanced polygon smoke where supported;
11. server validate/persist proposal;
12. refresh/reopen persisted guest proposal in same session;
13. run deterministic analysis;
14. inspect conflict;
15. inspect condition;
16. inspect unknown;
17. map evidence;
18. official source link;
19. duplicate/move proposal;
20. compare variant;
21. guest -> permanent Auth;
22. reopen saved project;
23. mobile path;
24. RU and EN critical-flow smoke when enabled.

> > > > > > > origin/main

Paid launch adds checkout/recovery using provider sandbox/fake-controlled test environment.

## 28. Accessibility tests

Automated + manual:

- keyboard full core flow;
- focus/skip links;
- labels/errors;
- submitted result-list accessibility;
- dialogs/bottom sheets;
- status not color-only;
- contrast;
- touch targets;
- Leaflet controls have accessible labels;
- map selection/results have textual equivalents;
- essential proposal dimensions can be changed without precision pointer-only input;
- comparison table/text equivalent;
- reduced motion;
- ET/RU/EN screen-reader labeling.

Target WCAG 2.2 AA.

## 29. Performance tests

Track:

- landing bundle before map;
- lazy Leaflet/map-editor load;
- map/plugin bundle impact;
- address search latency/caching;
- parcel lookup/map point resolution;
- tile-proxy latency/error/cache behavior separately from analytical source calls;
- avoid unnecessary map recreation/tile reload on locale/state changes;
- PostGIS p50/p95 representative analysis;
- national dataset index/query plans;
- evidence geometry payload size;
- Gemini explanation latency/cache hit ratio;
- paid fulfillment latency later.

Normal local data-release analysis should not expose serial upstream-provider waits.

## 30. Product/trust quality tests

Automated tests cannot replace human domain validation.

Before supported rule/source launch:

- representative real parcels reviewed manually against official source;
- false-positive/negative samples recorded;
- unknown behavior checked;
- current legal effective date reverified;
- source attribution links work.

Before marking a Phase 4 structure card fully supported, the verified scenario matrix must be reviewed from current official law.

Before public map traffic, manually verify target-environment MaRu `Kaart`/`Ortofoto`, attribution/data age, proxy behavior and provider operational requirements.

Do not use user conversion as the only definition of correctness.

## 31. Security tests

- RLS bypass attempts;
- IDOR on project/analysis/order/share;
- admin role spoof;
- anonymous rate abuse;
- SSRF URL manipulation;
- tile-proxy arbitrary-host/mode/path manipulation;
- upstream timeout/oversized response handling;
- geometry DoS;
- stored/reflected source/user text XSS;
- prompt injection;
- secret scan/frontend bundle scan;
- payment webhook replay/signature;
- upload parser/resource abuse later.

## 32. CI gates

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

Existing database setup/clean-start tests remain mandatory.

### Phase 4 additions

As map/editor work lands, add:

- Playwright installation/browser setup;
- critical production-build E2E;
- deterministic Leaflet/tile/API fixtures/interception;
- guest ownership/RLS integration tests;
- map-tile proxy security/error tests;
- proposal canonicalization/PostGIS regression tests;
- proposal persistence idempotency/concurrency tests;
- public Edge Function timeout/resource/rate/correlation tests as implemented.

Do not wait until KT-136 to add the first Playwright job.

### Later additions

- expanded Edge Function suites;
- GIS regression;
- i18n completeness;
- commerce fake-provider tests;
- security checks.

Optional scheduled workflows:

- official API/WFS capability smoke;
- controlled MaRu map proxy/provider smoke;
- source schema drift;
- legal change-watch integration;
- EHR cursor integration;
- payment-provider sandbox smoke.

A scheduled live-provider failure must be classified separately from deterministic PR CI.

## 33. Test data/privacy

Prefer synthetic data.

Never commit:

- private project/user data;
- Auth/payment/API secrets;
- real private uploads;
- non-public protected-location data;
- production webhook payloads containing unnecessary identifiers.

Public-source fixtures are minimized, attributed and used according to source terms.

Routine diagnostic/test logs must not contain full private/user-entered address text when a hash/redacted value is sufficient. Map tile URLs/fixtures should not encode parcel/project identity.

## 34. Phase 4 exit evidence

Before Phase 5 starts, execute the integrated Phase 4 exit scenario in `PHASE_4_IMPLEMENTATION_GUIDE.md` and record at minimum:

- exact commit/PR;
- desktop/mobile Playwright result;
- anonymous owner/RLS evidence;
- map selection evidence;
- Kaart/Ortofoto + attribution/degraded-state verification;
- template/editor operations tested;
- server canonical EPSG:3301 area/perimeter tests;
- persistence idempotency/concurrency tests;
- locale/refresh recovery behavior;
- no live-provider dependency in normal CI;
- known limitations/OQ-005 support scope.

Individual green component tests are not sufficient to declare Phase 4 complete.

## 35. Release test evidence

PR/release notes for material changes should list:

- tests run;
- fixture/source version;
- migrations;
- rule versions;
- UI locales tested;
- E2E scenarios;
- known limitations;
- controlled live integration verification where applicable.

For Phase 4 UI, include screenshots/manual evidence where meaningful, but screenshots do not replace browser assertions.
