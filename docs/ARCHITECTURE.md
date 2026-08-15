# Architecture — Krunditark

Last architecture review: **2026-08-15**

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
| MapLibre/i18n |                 | Auth                                 |
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

## 3. Product architecture layers

```text
Presentation
  React / routes / i18n / map / accessibility

Application
  parcel discovery / project / proposals / analysis / variants
  auth onboarding / commerce entitlements / reports

Domain
  parcel / proposal / facts / findings / rules / source provenance
  no provider SDK types, no hidden network

Infrastructure
  Supabase / PostGIS / source adapters / Gemini adapter
  payment adapter / SMTP / hosting
```

Dependencies point inward. Domain code must not import Google/Stripe/Montonio/source SDK types.

## 4. Frontend responsibilities

Frontend handles:

- ET/RU/EN UI state and routing;
- address/cadastral/map search presentation;
- map display;
- simple template drag/rotate/resize;
- advanced proposal editing later;
- anonymous/permanent Supabase Auth session client flow;
- typed calls to Krunditark APIs;
- deterministic result presentation;
- source/freshness display;
- payment checkout initiation/return UX later;
- account/projects/orders UI;
- accessibility/non-map result representation.

Frontend does **not**:

- calculate authoritative legal distances/intersections;
- use elevated Supabase credentials;
- use Gemini/payment secret keys;
- decide legal permission;
- promote source/rule changes;
- grant paid entitlements;
- mark an order paid from a redirect;
- perform national ingestion;
- rely on provider-specific WFS payloads as public UI contracts.

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
    i18n/
  locales/
    et/
    ru/
    en/
  types/
  styles/
```

Do not build a monolithic app component.

## 6. Supabase/server structure

Suggested:

```text
supabase/
  migrations/
  functions/
    parcel/
    address-search/           # if proxied server-side
    analysis/
    explain-analysis/
    sync-sources/
    sync-source/
    promote-data-release/
    commerce-checkout/        # later
    commerce-webhook-*/       # selected provider later
    _shared/
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

See ADR 0006.

### Guest phase

```text
public visitor
 -> meaningful state needed
 -> Supabase signInAnonymously()
 -> anonymous Auth user ID
 -> guest project owned by that ID
```

Anonymous users use the `authenticated` role. RLS must inspect JWT `is_anonymous` for actions reserved for permanent users.

### Permanent conversion

```text
anonymous project
 -> user wants save/pay/monitor
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
finding code/state
measurements
source/rule IDs
geometry
```

Presentation is localized:

```text
et translation catalog (canonical)
ru translation catalog
en translation catalog
+ locale-specific Gemini explanation cache
```

Changing locale does not rerun deterministic GIS/rules.

Critical fixed legal/status/payment/privacy terms are reviewed translations, not runtime model translation.

## 10. Parcel discovery architecture

Consumer entry methods:

1. official address search;
2. cadastral ID;
3. map selection.

### In-AKS

Official MaRu In-AKS is treated as interactive source with live/short-cache behavior under source policy.

It should produce a normalized internal search result rather than leaking raw provider responses throughout UI.

### Parcel resolution

Address object and cadastral parcel are not always one-to-one.

Resolution flow:

```text
address/search result
 -> candidate spatial/object references
 -> identify candidate cadastral units
 -> user selects exact parcel if ambiguous
 -> persist selected parcel snapshot/reference
```

Never silently choose a parcel when multiple are plausible.

## 11. Geospatial architecture

### Canonical analysis CRS

For Estonia metric operations prefer **EPSG:3301 (L-EST97)** unless a source/rule justifies another metric CRS.

### Browser interchange

Use GeoJSON EPSG:4326 for client APIs unless explicitly documented otherwise.

### Core PostGIS operations

Expected:

- `ST_IsValid`;
- `ST_MakeValid` under explicit policy;
- `ST_Transform`;
- `ST_Intersects`;
- `ST_Within` / `ST_CoveredBy`;
- `ST_Touches`;
- `ST_DWithin`;
- `ST_Distance`;
- `ST_Intersection`;
- `ST_Area`;
- `ST_Envelope`;
- `ST_SimplifyPreserveTopology` for evidence rendering.

A spatial intersection is a fact, not automatically a legal violation.

## 12. Proposal architecture

Beginner UI creates structured proposal geometry through templates/dimensions; server canonicalizes/validates.

Proposal properties:

- exact version;
- structure/scenario type;
- geometry;
- dimensions/area;
- height/storeys/use where relevant;
- created/superseded metadata.

Completed analysis always references exact proposal version.

Variant B is a new proposal version/scenario, not a mutation of variant A's historical evidence.

## 13. Canonical data refresh architecture

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

### Rule changes

Automated detection -> human/admin verification -> new rule version -> tests -> promotion.

Routine ingestion uses zero Gemini tokens.

## 14. Source release/promotion

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

Every source definition records refresh/freshness/replication/failure semantics.

## 15. Analysis orchestration

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

## 16. Analysis cache

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

## 17. Immutable analysis model

Completed analysis represents what Krunditark knew under exact versions.

Suggested state:

```text
queued -> preparing -> evaluating -> completed
                         \-> partial
          \--------------> failed
```

`partial` means useful output exists but supported categories are incomplete/stale/unavailable.

Rerun creates a new analysis.

## 18. Rule architecture

A practical initial evaluator:

```ts
type RuleEvaluator = (context: RuleContext) => RuleResult;
```

Code owns deterministic semantics; database owns rule/source/version/activation metadata.

No arbitrary runtime JavaScript eval rules.

No LLM-generated production rule promotion.

## 19. Gemini architecture

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

## 20. Commerce architecture

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

## 21. Commerce transaction boundaries

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

## 22. Project/change-monitoring architecture

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

## 23. File/import architecture — future

Private uploads live in Supabase Storage with ownership policies.

Pipeline must include:

- MIME/size validation;
- safe filename/object keys;
- parser isolation/resource limits;
- candidate extraction;
- user confirmation;
- no private upload sent to Gemini until privacy product decision approves it.

PDF/DXF/IFC import does not bypass server geometry validation.

## 24. Professional/B2B architecture — future

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

## 25. Static frontend hosting

GitHub Pages phase:

- static assets only;
- no server secrets;
- route/deep-link strategy compatible with Pages;
- backend remains Supabase.

Cloudflare later may provide:

- DNS;
- CDN/static hosting;
- WAF;
- Turnstile;
- redirects/security edge.

Core domain remains Cloudflare-independent unless a later ADR changes it.

## 26. Basemap architecture

MapLibre is selected, final production base tile/style provider remains open.

Potential MaRu tiles/orthophoto require current terms/proxy/attribution behavior review.

Visual basemap is not the authoritative structured constraint dataset.

## 27. Observability

Minimum structured server context:

- request/trace ID;
- user type anonymous/permanent (not raw PII);
- project/proposal/analysis IDs;
- data release/rule manifest;
- source/sync IDs;
- durations/status/errors;
- source freshness;
- records changed;
- Gemini cache/latency/status/token metadata where safe;
- commerce order/payment event/fulfillment status later;
- no credentials/full private payloads.

Operational monitors:

- source stale/failed;
- missed sync;
- abnormal source diff;
- rule candidate pending;
- paid-but-unfulfilled order;
- repeated analysis failure;
- auth email failure rate.

## 28. Failure model

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

### Proposal/analysis

- `PROPOSAL_GEOMETRY_INVALID`
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

## 29. Security boundaries

### Browser trust

Untrusted:

- user geometry/parameters;
- role/price/product IDs;
- payment success query params;
- uploaded content;
- arbitrary URLs.

### Source trust

Official source is authoritative only for its documented scope; payload shape still requires validation and source text is untrusted instruction content for LLMs.

### Server trust

Privileged Edge Function/server code:

- validates auth;
- enforces entitlements;
- validates provider webhook;
- controls source URL allow-list;
- uses elevated DB credentials only in narrow contexts.

## 30. Architecture constraints requiring ADR to change

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
