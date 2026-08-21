# Architecture — Krunditark

Last architecture review: **2026-08-21**

For Phase 4 implementation details also read `PHASE_4_READINESS.md`, `PHASE_4_IMPLEMENTATION_GUIDE.md`, `MAP_STACK_AND_BASEMAP.md`, ADR 0009 and ADR 0010.

## 1. Architecture goals

Krunditark must be:

- trustworthy for regulation-adjacent decision support;
- deterministic for material findings;
- source-traceable and historically reproducible;
- geospatially correct;
- guest-friendly without weakening RLS;
- multilingual without duplicating domain logic;
- resilient to official-source failures;
- cost-efficient by avoiding per-user national refetching;
- provider-neutral at payment/AI infrastructure boundaries;
- scalable from consumer reports to professional/B2B workflows;
- deployable from a static frontend with no browser secrets.

## 2. System context

```text
                         +---------------------------+
                         | Official Estonian sources |
                         | MaRu / In-AKS / PLANIS    |
                         | EELIS / EHR / RT / etc.   |
                         +-------------+-------------+
                                       |
                scheduled/incremental | live/short-cache where approved
                                       v
+---------------+      HTTPS      +--------------------------------------+
| User browser  | <-------------> | Supabase backend                     |
| React/Vite    |                 |                                      |
| Leaflet/i18n  |                 | Auth                                 |
+-------+-------+                 | PostgreSQL + PostGIS                 |
        |                         | Storage                              |
        |                         | Edge Functions                       |
        |                         | Cron / ingestion orchestration       |
        |                         | versioned data/rule releases         |
        |                         +------+--------------------+----------+
        |                                |                    |
        |                                |                    +--> Google Gemini API
        |                                |                         explanation only
        |                                |
        |                                +--> payment provider (later)
        |                                     server/webhooks only
        |
        +--> GitHub Pages preview
             later Cloudflare-compatible static/edge delivery
```

Normal analysis reads internal promoted source data. It does **not** synchronously call every national provider.

Phase 4 map basemap traffic uses a Krunditark-owned fixed proxy in front of the approved Maa- ja Ruumiamet tiled basemap services. The browser must not treat a visual basemap as authoritative analytical data.

## 3. Product architecture layers

```text
Presentation
  React / routes / i18n / Leaflet map / accessibility

Application
  parcel discovery / project / proposals / analysis / variants
  auth onboarding / commerce entitlements / reports

Domain
  parcel / proposal / facts / findings / rules / source provenance
  no provider or Leaflet SDK types, no hidden network

Infrastructure
  Supabase / PostGIS / source adapters / map-tile proxy / Gemini adapter
  payment adapter / SMTP / hosting
```

Dependencies point inward. Domain code must not import Google/Stripe/Montonio/source/Leaflet/Geoman SDK types.

## 4. Frontend responsibilities

Frontend handles:

- ET/RU/EN UI state and routing;
- address/cadastral/map search presentation;
- Leaflet map display and interaction through Krunditark-owned map components;
- simple template drag/rotate/resize;
- advanced proposal polygon editing as an opt-in Phase 4 path;
- anonymous/permanent Supabase Auth session client flow;
- typed calls to Krunditark APIs;
- deterministic result presentation;
- source/freshness display;
- payment checkout initiation/return UX later;
- account/projects/orders UI;
- accessibility/non-map result representation.

Frontend does **not**:

- calculate authoritative legal distances/intersections/area/perimeter;
- use elevated Supabase credentials;
- use Gemini/payment secret keys;
- decide legal permission;
- promote source/rule changes;
- grant paid entitlements;
- mark an order paid from a redirect;
- perform national ingestion;
- rely on provider-specific WFS payloads as public UI contracts;
- treat Leaflet/Geoman layers as persistent project/domain state.

## 5. Recommended frontend structure

```text
src/
  app/
    router/
    providers/
    layout/
  components/
    ui/
    map/
      MapShell
      basemap/
      parcel/
      proposal/
  features/
    landing/
    parcel-search/
    parcel-overview/
    proposal-editor/
    analysis/
    ehituspass/
    variants/
    auth/
    account/
    projects/
    commerce/          # when promoted
    pro/               # later
  domain/
    parcel/
    proposal/
    finding/
    rules/
    commerce/          # provider-independent types only
  lib/
    supabase/
    api/
    geo/
    validation/
    map/               # renderer adapters/config; no domain ownership
    i18n/
  locales/
    et/
    ru/
    en/
  types/
  styles/
```

Do not build a monolithic app component. Do not expose Leaflet classes as application/domain contracts.

## 6. Supabase/server structure

Suggested:

```text
supabase/
  migrations/
  functions/
    parcel/
    address-search/
    parcel-resolve/
    map-tiles/                 # narrow allow-listed Phase 4 basemap proxy
    analysis/
    explain-analysis/
    sync-sources/
    sync-source/
    promote-data-release/
    commerce-checkout/        # later
    commerce-webhook-*/       # selected provider later
    _shared/
      inaks.ts
      auth/
      cors/
      errors/
      providers/
        gemini/
        official-sources/
        payments/
      schemas/
      source-provenance/
      ingestion/
      source-registry/
      rules/
      entitlements/
```

Avoid one giant Edge Function.

The map-tile proxy is not an arbitrary URL proxy. It exposes only approved basemap modes/upstreams and validates tile coordinates, timeout/response limits and safe cache behavior. If the proxy later moves to Cloudflare for operational reasons, that is an infrastructure change, not a domain contract change.

## 7. Database logical schemas

Recommended logical boundaries:

### `public`

RLS-protected user-facing data:

- profiles;
- projects;
- project proposals;
- intentionally exposed analysis read models if needed.

### `geo`

Normalized/versioned official spatial data:

- parcels;
- constraints;
- planning;
- environmental/heritage/road features;
- future site/utility layers.

### `rules`

- legal source metadata;
- rule definitions/versions;
- legal-change candidates;
- verification history.

### `analysis`

- immutable analyses;
- findings;
- evidence;
- explanations;
- report metadata.

### `commerce` — when payments launch

- products/prices;
- orders;
- payment attempts/events;
- entitlements;
- usage;
- refunds.

### `private`

- source definitions/sync runs/dataset releases;
- composite data releases;
- internal audit/operations;
- provider diagnostics;
- admin state.

Public origin data does not imply these tables should be publicly exposed.

## 8. Authentication architecture

See ADR 0006 and ADR 0009.

### Public discovery

A visitor may search/select a parcel and see the free parcel overview without permanent identity.

### Phase 4 guest project phase

When stateful proposal work begins:

```text
public visitor
 -> chooses stateful proposal/build path
 -> Supabase signInAnonymously()
 -> anonymous Auth user ID
 -> owner-scoped guest project
 -> selected parcel + canonical intent persisted/referenced
 -> mutable browser proposal draft
```

Anonymous users use the `authenticated` role. RLS must inspect JWT `is_anonymous` for actions reserved for permanent users.

This technical anonymous identity is not a signup wall and does not justify showing a permanent-account form before the user receives proposal value.

### Permanent conversion

```text
anonymous project
 -> user wants durable cross-device save/pay/monitor
 -> email OTP or Google
 -> link/convert identity
 -> same project remains owned/recoverable
```

No password required in default consumer flow.

Production email OTP requires custom SMTP.

## 9. Localization architecture

See ADR 0008.

Domain facts are locale-independent:

```text
intent/structure/finding code
measurements
source/rule IDs
geometry
project/proposal IDs
```

Presentation is localized:

```text
et translation catalog (canonical)
ru translation catalog
en translation catalog
+ locale-specific Gemini explanation cache
```

Changing locale does not recreate project/proposal state or rerun deterministic GIS/rules.

Critical fixed legal/status/payment/privacy terms are reviewed translations, not runtime model translation.

## 10. Parcel discovery architecture

Consumer entry methods:

1. official address search;
2. cadastral ID;
3. map selection.

### In-AKS

Official MaRu In-AKS is treated as interactive source with live/short-cache behavior under source policy.

It produces normalized internal search results rather than leaking raw provider responses throughout UI.

Address lookup is **submit-driven**: the frontend does not fire upstream requests while the user is typing. An explicit submit action (Enter or Otsi button) triggers a bounded `searchAddress()` call. The canonical In-AKS Gazetteer endpoint is centralized in `supabase/functions/_shared/inaks.ts` and used by the relevant Edge Functions.

### Parcel resolution

Address object and cadastral parcel are not always one-to-one.

Resolution flow:

```text
address/search result OR explicit map point
 -> candidate spatial/object references
 -> identify candidate cadastral units
 -> user selects exact parcel if ambiguous
 -> canonical selected parcel
 -> free overview/intent
```

Never silently choose a parcel when multiple are plausible.

Map pointer movement does not continuously call parcel resolution. Only a deliberate selection action calls the canonical point selector.

### Runtime parsing boundary

External provider payloads must never be cast directly to canonical domain types. Every adapter entry point accepts `unknown` and runs an explicit runtime parser/normalizer that:

- validates required object structure, primitive types, timestamps, identifiers, geometry shape and numeric values;
- rejects non-finite numeric input (`NaN`, `Infinity`, `-Infinity`);
- rejects invalid timestamps deterministically;
- keeps provider-specific property names/types inside the adapter layer;
- returns typed parse/validation errors instead of uncaught property-access/type errors;
- produces a canonical provider-independent `Parcel` value on success.

Parser errors distinguish malformed provider payloads from domain-level unsupported/unknown conditions where relevant. Unknown provider fields are safely ignored or retained only through the approved noncritical extras policy.

Future external adapters must follow the same boundary pattern. Provider DTOs must not leak into UI or rules code.

## 11. Phase 4 map architecture

ADR 0010 and `MAP_STACK_AND_BASEMAP.md` are authoritative.

### Browser renderer

- Leaflet 1.9.x stable.
- Optional `@geoman-io/leaflet-geoman-free` for supported Phase 4 editing interactions.
- No Phase 4 dependency on Geoman Pro.
- Leaflet/Geoman instances remain behind Krunditark-owned map/editor adapters.

### Basemap modes

- default `Kaart` from Maa- ja Ruumiamet pre-tiled services;
- optional `Ortofoto`;
- no Google Maps production basemap/SDK;
- `Hübriidkaart` is not the default because it adds visual density that competes with parcel/proposal overlays.

### Tile proxy

Production browser requests tiles through a fixed Krunditark-owned proxy.

The proxy:

- maps a small allow-listed mode set to verified MaRu upstreams;
- validates tile coordinate/zoom bounds;
- enforces timeout/response-size/content-type rules;
- does not accept arbitrary upstream URLs;
- avoids project/address/proposal data in tile URLs/logs;
- follows MaRu attribution/proxy/cache conditions;
- returns a degraded basemap failure independently from parcel resolver semantics.

MaRu's public-service contact/fixed-proxy operational requirement is a KT-040/public-environment gate.

### Failure behavior

If basemap tiles fail, already-known parcel/proposal vector state and textual project controls remain available where technically possible. Tile failure is never parcel `not_found` and never evidence that analytical data is absent.

## 12. Geospatial architecture

### Canonical analysis CRS

The canonical normalized **Parcel**, **Proposal**, and **Constraint** domain models are authoritative Estonia metric data and exist **only in EPSG:3301 (L-EST97)**.

The deterministic forward/inverse transform lives in `src/lib/crs` and never merely relabels coordinates. External geometry must be transformed into EPSG:3301 before a canonical Parcel/Proposal/Constraint is constructed.

### Provider / browser interchange CRS

**EPSG:4326 (WGS84 lon/lat degrees)** is permitted only at explicitly named provider/browser/API boundaries. It is never canonical persisted parcel/proposal geometry.

The Leaflet browser map normally renders in Web Mercator/EPSG:3857. Canonical geometry is converted to browser-safe EPSG:4326 GeoJSON before Leaflet rendering; Leaflet's display projection is not the analytical CRS.

Metric area/distance logic always operates server/PostGIS-side in the canonical metric CRS. Unknown, missing or unsupported CRS is rejected and never assumed.

### Display / API conversion

Conversion of canonical EPSG:3301 geometry back to browser-safe EPSG:4326 GeoJSON (`toBrowserGeometry`) is explicit and never mutates canonical geometry.

### Core PostGIS operations

Expected:

- `ST_IsValid`;
- `ST_MakeValid` only under explicit policy;
- `ST_Transform`;
- `ST_Intersects`;
- `ST_Within` / `ST_CoveredBy`;
- `ST_Touches`;
- `ST_DWithin`;
- `ST_Distance`;
- `ST_Intersection`;
- `ST_Area`;
- `ST_Perimeter` where authoritative proposal perimeter is required;
- `ST_Envelope`;
- `ST_SimplifyPreserveTopology` for evidence rendering.

A spatial intersection is a fact, not automatically a legal violation.

## 13. Proposal architecture

See ADR 0009 and `PHASE_4_IMPLEMENTATION_GUIDE.md`.

### Mutable editor draft

Beginner templates/dimensions and the Leaflet editor create one typed browser draft. The draft may be moved/rotated/resized without creating a database version for every pointer movement.

Leaflet layer state is derived/editing state around the typed draft; it is not durable product state.

Template ID and client-computed area/perimeter are convenience/preview values only.

### Server canonicalization

Before persistence the server:

1. runtime-validates the draft request;
2. validates finite coordinates/CRS/resource limits;
3. transforms to EPSG:3301;
4. validates topology/bounds under explicit repair policy;
5. computes authoritative area/perimeter;
6. returns canonical data or typed validation failure.

Client-forged metrics are ignored/recomputed.

### Version lifecycle

- unpersisted draft: mutable;
- successful save: versioned persisted proposal;
- editing a persisted scenario and saving creates a new version rather than silently rewriting history;
- proposal referenced by a terminal/completed analysis is immutable;
- retries/concurrent saves require explicit idempotency/transaction-safe version allocation in KT-048;
- full A/B duplicate/compare workflow remains Phase 9.

Completed analysis always references an exact persisted proposal version.

## 14. Canonical data refresh architecture

`docs/DATA_REFRESH_AND_CACHE.md` is authoritative.

Do not use the old universal monthly-only simplification.

### Heavy analytical sources

- scheduled monthly baseline/incremental as appropriate;
- normalized PostGIS dataset versions;
- quality gates;
- composite release.

### Lightweight change watches

- legal metadata/hash/version daily where appropriate;
- EHR changed-after cursor daily where approved;
- schema/capabilities/source health weekly/daily depending source.

### Interactive lookup

- In-AKS live/short cache.

### Visual basemap

The MaRu `Kaart`/`Ortofoto` tile service is presentation infrastructure, not an analytical data release. It has its own provider attribution/cache/proxy policy in `MAP_STACK_AND_BASEMAP.md` and must not be confused with Phase 5 normalized analytical datasets.

### Rule changes

Automated detection -> human/admin verification -> new rule version -> tests -> promotion.

Routine ingestion uses zero Gemini tokens.

## 15. Source release/promotion

```text
fetch/check
 -> staging
 -> schema/CRS/required-field validation
 -> stable-ID/hash diff
 -> abnormal-change checks
 -> candidate dataset version
 -> source promotion
 -> composite data release
```

Promotion is transactional. Failed candidate leaves prior good release active.

Every analytical source definition records refresh/freshness/replication/failure semantics.

## 16. Analysis orchestration

```text
Analysis request
   |
   +--> authorize project/entitlement if applicable
   +--> validate exact proposal
   +--> choose eligible promoted data release
   +--> resolve parcel/source versions
   +--> calculate freshness/completeness
   +--> compute PostGIS facts
   +--> load effective verified rules
   +--> evaluate deterministic findings
   +--> derive deterministic summary/next actions
   +--> persist immutable analysis + evidence manifest
   +--> optional cached/generated Gemini explanation
   v
Ehituspass
```

Normal analysis does not trigger a national refresh.

## 17. Analysis cache

A deterministic result may be reused only when compatible inputs are identical, conceptually:

```text
proposal canonical input
+ parcel snapshot
+ data release
+ rule-set manifest
+ analysis profile
+ engine version
```

Cache reuse must not leak another user's private notes/project metadata.

## 18. Immutable analysis model

Completed analysis represents what Krunditark knew under exact versions.

Suggested state:

```text
queued -> preparing -> evaluating -> completed
                         \-> partial
          \--------------> failed
```

`partial` means useful output exists but supported categories are incomplete/stale/unavailable.

Rerun creates a new analysis.

## 19. Rule architecture

A practical initial evaluator:

```ts
type RuleEvaluator = (context: RuleContext) => RuleResult;
```

Code owns deterministic semantics; database owns rule/source/version/activation metadata.

No arbitrary runtime JavaScript eval rules.

No LLM-generated production rule promotion.

## 20. Gemini architecture

Initial provider: Google Gemini API.

```text
structured completed analysis
+ approved source references/excerpts
+ user question/locale
 -> prompt builder
 -> Gemini adapter
 -> schema validation
 -> valid explanation OR deterministic fallback
```

Provider SDK types stop at adapter boundary.

Cache key includes:

- structured result hash;
- locale;
- prompt template;
- model/config;
- schema version.

Gemini downtime is not analysis downtime.

## 21. Commerce architecture

See ADR 0007 and `COMMERCE_AND_ENTITLEMENTS.md`.

```text
Product/Price
 -> Order
 -> PaymentAttempt
 -> verified server webhook
 -> Entitlement
 -> analysis/report/project permission
```

Client redirect does not grant entitlement.

Selected payment provider remains replaceable behind an adapter.

Consumer one-off/project products and professional subscriptions share entitlement infrastructure but have different scope/limits.

## 22. Commerce transaction boundaries

Payment success processing should atomically align where practical:

- provider event dedupe/processed;
- payment attempt succeeded;
- order paid;
- entitlement granted.

Report generation may happen afterward.

If fulfillment fails:

- paid state/entitlement is not lost;
- retry is idempotent;
- user is not charged twice.

## 23. Project/change-monitoring architecture

Project stores immutable proposal/analysis history.

On newer data/rules:

```text
new composite data/rule release
 -> identify project has older basis
 -> mark newer_data_available
 -> user/relevant entitlement may rerun
 -> new immutable analysis
 -> deterministic diff later
```

Only after computing impact should product send a strong “material change” notification.

## 24. File/import architecture — future

Private uploads live in Supabase Storage with ownership policies.

Pipeline must include:

- MIME/size validation;
- safe filename/object keys;
- parser isolation/resource limits;
- candidate extraction;
- user confirmation;
- no private upload sent to Gemini until privacy product decision approves it.

PDF/DXF/IFC import does not bypass server geometry validation.

## 25. Professional/B2B architecture — future

Add organization/workspace layer rather than overloading consumer profile role.

Concepts:

- organization;
- membership;
- project ownership scope;
- plan/entitlement;
- API credential/service account;
- usage ledger;
- batch jobs;
- signed webhooks.

Same analysis engine; no separate unsafe “Pro truth”.

## 26. Static frontend hosting

GitHub Pages phase:

- static assets only;
- no server secrets;
- route/deep-link strategy compatible with Pages;
- backend remains Supabase;
- browser-visible map proxy base URL is publishable configuration, not a secret.

Cloudflare later may provide:

- DNS;
- CDN/static hosting;
- WAF;
- Turnstile;
- redirects/security edge;
- potentially a future tile-proxy/caching implementation after terms/infrastructure review.

Core domain remains Cloudflare-independent unless a later ADR changes it.

## 27. Basemap architecture

ADR 0010 resolves the Phase 4 basemap architecture:

- Leaflet 1.9.x renderer;
- MaRu `Kaart` default;
- MaRu `Ortofoto` optional;
- Krunditark-owned fixed tile proxy;
- visible source/data-age attribution;
- no Google Maps production dependency;
- provider failure degrades safely;
- no bulk/offline prefetch;
- public-environment provider-contact/proxy operational step follows current MaRu guidance.

Visual basemap is not the authoritative structured constraint dataset. Phase 5 analytical source adapters remain separate.

## 28. Observability

Minimum structured server context:

- request/trace ID;
- user type anonymous/permanent (not raw PII);
- project/proposal/analysis IDs;
- data release/rule manifest;
- source/sync IDs;
- durations/status/errors;
- source freshness;
- records changed;
- map-tile proxy mode/status/latency without project/address payload;
- Gemini cache/latency/status/token metadata where safe;
- commerce order/payment event/fulfillment status later;
- no credentials/full private payloads.

Operational monitors:

- source stale/failed;
- missed sync;
- abnormal source diff;
- map tile proxy/upstream failure rate;
- rule candidate pending;
- paid-but-unfulfilled order;
- repeated analysis failure;
- auth email failure rate.

## 29. Failure model

Typed examples:

### Search/source

- `INVALID_CADASTRAL_ID`
- `ADDRESS_SEARCH_UNAVAILABLE`
- `PARCEL_NOT_FOUND`
- `SOURCE_TIMEOUT`
- `SOURCE_UNAVAILABLE`
- `SOURCE_RESPONSE_INVALID`
- `SOURCE_STALE`
- `SOURCE_SYNC_FAILED`
- `DATA_RELEASE_UNAVAILABLE`
- `DATA_RELEASE_INCOMPLETE`

### Map presentation

A basemap/tile proxy failure is a presentation/provider state, not parcel `not_found`. It may use a dedicated internal/UI code such as `BASEMAP_UNAVAILABLE` if an API error contract is needed.

### Proposal/analysis

- `PROPOSAL_GEOMETRY_INVALID`
- `PROPOSAL_OUTSIDE_SUPPORTED_AREA`
- `ANALYSIS_SCOPE_UNSUPPORTED`
- `RULESET_UNAVAILABLE`
- `ANALYSIS_FAILED`

### Auth

- `UNAUTHORIZED`
- `PERMANENT_ACCOUNT_REQUIRED`
- `AUTH_IDENTITY_LINK_FAILED`

### AI

- `AI_UNAVAILABLE`
- `AI_OUTPUT_INVALID`

### Commerce later

- `ORDER_NOT_PAYABLE`
- `PAYMENT_PENDING`
- `PAYMENT_FAILED`
- `PAYMENT_EVENT_INVALID`
- `ENTITLEMENT_REQUIRED`
- `ENTITLEMENT_EXPIRED`
- `USAGE_LIMIT_REACHED`
- `FULFILLMENT_FAILED`

Do not collapse an upstream outage into not-found or payment-pending into failed.

## 30. Security boundaries

### Browser trust

Untrusted:

- user geometry/parameters;
- role/price/product IDs;
- payment success query params;
- uploaded content;
- arbitrary URLs;
- client-computed geometry metrics.

### Map provider boundary

- browser calls only the Krunditark-owned tile proxy in production;
- tile proxy never accepts arbitrary upstream URLs;
- tile request URL contains no full address/project note/proposal geometry;
- map/provider outage does not change analytical truth.

### Source trust

Official source is authoritative only for its documented scope; payload shape still requires validation and source text is untrusted instruction content for LLMs.

### Server trust

Privileged Edge Function/server code:

- validates auth;
- enforces entitlements;
- validates provider webhook;
- controls source/tile URL allow-lists;
- uses elevated DB credentials only in narrow contexts.

## 31. Phase 4 dependency order

Implementation order is intentionally constrained:

```text
KT-038 E2E foundation
KT-039 guest ownership/state
       |
KT-040 Leaflet/map-entry
 -> KT-041 parcel render/confirm
 -> KT-042 intent
 -> KT-043 supported structure choice (OQ-005 gate)
 -> KT-044 beginner templates
 -> KT-045 placement editor
 -> KT-046 advanced polygon mode
 -> KT-047 server validation/canonicalization
 -> KT-048 owner-scoped version persistence
```

Parallelization is allowed only where interfaces are already fixed and does not bypass these ownership/validation gates.

Phase 5 starts only after the integrated Phase 4 exit scenario and task-specific DoD in `PHASE_4_IMPLEMENTATION_GUIDE.md` pass.

## 32. Architecture constraints requiring ADR to change

- Estonia initial geography.
- Supabase MVP/backend foundation.
- PostGIS authoritative spatial engine.
- versioned official data releases.
- AI explanation-only for material findings.
- Google Gemini initial AI provider.
- guest-first Auth architecture.
- ET/RU/EN i18n architecture.
- historical analysis immutability.
- provider-neutral commerce/entitlements.
- no programmatic/banner ads in trust-critical analysis/report workspace.
- official-source provenance mandatory.
- static frontend contains no elevated secrets.
- Phase 4 browser map engine/basemap architecture in ADR 0010; changing renderer/provider requires a superseding ADR and terms/migration review.
