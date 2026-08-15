# Architecture — Krunditark

## 1. Architecture goals

Krunditark must be:

- trustworthy enough for regulation-adjacent decision support;
- secure on a static frontend host;
- deterministic for material findings;
- source-traceable;
- geospatially correct;
- resilient to individual upstream-source failures;
- inexpensive to operate during MVP;
- modular enough to replace hosting/providers later.

## 2. Context

```text
User browser
    |
    | HTTPS
    v
Static web app
GitHub Pages (preview) / later Cloudflare-compatible hosting
    |
    | Supabase client + Edge Function HTTP
    v
Supabase
  |- Auth
  |- PostgreSQL + PostGIS
  |- Storage
  |- Edge Functions
  |- scheduled jobs where needed
    |
    +--> Maa- ja Ruumiamet WFS/WMS
    +--> PLANIS WFS/WMS
    +--> EELIS/Keskkonnaportaal WFS
    +--> E-ehitus/EHR APIs when approved
    +--> heritage official source
    +--> Transpordiamet/road official source
    +--> Riigi Teataja / maintained legal-source workflow
    +--> optional LLM provider
```

## 3. Core separation of responsibilities

### Frontend responsibility

The browser handles:

- UI state;
- cadastral input;
- map display;
- user proposal drawing/editing;
- calling typed Krunditark APIs;
- displaying deterministic findings;
- displaying provenance/source links;
- auth session through Supabase-supported browser flows.

The browser does **not**:

- own authoritative GIS calculations;
- use elevated database credentials;
- call paid/private AI APIs directly;
- make legal decisions;
- persist verified rule changes;
- rely on arbitrary government-provider CORS for critical analysis.

### Edge Function responsibility

Edge Functions handle:

- external provider adapters;
- request validation;
- auth/authorization for server APIs;
- orchestration;
- rate limiting coordination;
- LLM provider calls;
- privileged database operations where explicitly required;
- source timeout/retry/size controls;
- response normalization;
- secure CORS policy.

### PostgreSQL/PostGIS responsibility

Database handles:

- application state;
- project/proposal persistence;
- normalized geospatial data/cache;
- source provenance;
- immutable analysis snapshots;
- rule versions;
- spatial predicates/measurements;
- relational integrity;
- RLS;
- audit history.

### Domain/rules responsibility

Pure TypeScript/SQL domain code handles:

- normalized facts;
- rule evaluation;
- finding derivation;
- deterministic summary;
- no network calls;
- no LLM calls.

## 4. Recommended frontend structure

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
    parcel-search/
    parcel-map/
    proposal-editor/
    analysis/
    ehituspass/
    auth/
    projects/
  domain/
    parcel/
    proposal/
    finding/
    rules/
  lib/
    supabase/
    api/
    geo/
    validation/
  types/
  styles/
```

Rules that are shared with server code should not be duplicated blindly into frontend bundles. Consider a workspace/shared package only when actual reuse exists.

## 5. Recommended Supabase structure

```text
supabase/
  migrations/
  functions/
    parcel/
    analysis/
    explain-analysis/
    _shared/
      auth/
      cors/
      errors/
      providers/
      schemas/
      source-provenance/
      rules/
```

Avoid a single giant Edge Function.

Initial grouping may use fewer deployed functions, but internal modules must preserve these boundaries.

## 6. Database schema boundaries

Recommended logical schemas:

### `public`

Only data intentionally reachable through Supabase Data API with RLS, such as:

- `profiles`;
- `projects`;
- `project_proposals`;
- limited analysis metadata/read models if useful.

### `geo`

Normalized geospatial/cache data, usually accessed server-side or through controlled RPCs:

- parcels;
- restrictions;
- planning areas;
- environmental features;
- heritage features;
- road features.

Do not expose broadly merely because data originates publicly.

### `rules`

Versioned deterministic rule definitions and legal references.

### `analysis`

Immutable analysis snapshots, findings and evidence relationships.

### `private`

- source connector runs;
- raw/sanitized source snapshot metadata;
- admin/audit data;
- AI request metadata as allowed by retention policy;
- internal operational state.

Actual schema names may be adjusted in migration design, but the exposure boundary must remain explicit.

## 7. Geospatial architecture

### Canonical analysis CRS

For Estonia distance/area/intersection operations, prefer geometry in **EPSG:3301 (L-EST97)** when working with official Estonian source data and metric rules.

### Browser interchange

Use GeoJSON in EPSG:4326 for API/browser interchange unless the map integration explicitly uses another documented form.

### Required PostGIS operations

Expected operations include:

- `ST_IsValid`;
- `ST_MakeValid` when policy permits repair;
- `ST_Transform`;
- `ST_Intersects`;
- `ST_Within` / `ST_CoveredBy` depending rule semantics;
- `ST_Touches`;
- `ST_DWithin`;
- `ST_Distance`;
- `ST_Intersection`;
- `ST_Area`;
- `ST_Envelope` / bounding-box operations;
- `ST_SimplifyPreserveTopology` for safe map evidence when necessary.

Every chosen predicate must match the actual legal/domain semantics. “Intersects” and “violates” are not synonyms.

## 8. Data acquisition strategy

### MVP: on-demand + cache

Do not start by mirroring every national dataset unless the source or performance profile requires it.

For a requested parcel:

1. resolve parcel;
2. compute query envelope/buffer required for checks;
3. query relevant source layers server-side;
4. validate and normalize;
5. persist/cache normalized source objects with retrieval metadata;
6. run analysis against the snapshot.

### Later: scheduled national/regional sync

Promote layers to scheduled ingestion when:

- provider latency is too high;
- provider availability harms UX;
- bulk analysis is needed;
- source terms permit local replication;
- change detection/provenance benefits justify it.

This should be an explicit ADR/source decision per dataset.

## 9. Source adapter contract

Conceptual interface:

```ts
interface SourceAdapter<TQuery, TRaw, TNormalized> {
  sourceId: string;
  fetch(query: TQuery, context: FetchContext): Promise<SourceFetch<TRaw>>;
  validate(raw: unknown): TRaw;
  normalize(raw: TRaw, context: NormalizeContext): TNormalized[];
}
```

`SourceFetch` must carry:

- requested endpoint/source;
- started/finished timestamps;
- response status classification;
- source update/version metadata when available;
- payload hash;
- retry count;
- safe diagnostic metadata.

Provider errors become typed domain failures, not unstructured strings.

## 10. Analysis orchestration

```text
Analysis request
   |
   +--> validate user/proposal
   +--> resolve exact parcel snapshot
   +--> resolve required source set from analysis profile
   +--> fetch/cache source snapshots
   +--> calculate source completeness/freshness
   +--> compute GIS facts
   +--> load verified effective rule versions
   +--> evaluate rules deterministically
   +--> derive deterministic overall summary
   +--> persist immutable analysis snapshot/findings/evidence
   +--> optionally request AI explanation
   v
Ehituspass response
```

AI explanation must not be in the transaction path required to persist the factual result.

## 11. Transaction boundaries

### Analysis persistence

The following should become atomically consistent where practical:

- analysis snapshot header;
- selected rule-version references;
- findings;
- finding-to-evidence relationships;
- engine version/input hash.

If AI explanation fails after factual analysis commits, factual analysis remains valid.

### External fetches

Do not hold database transactions open while waiting on slow external APIs.

Fetch/normalize first, then persist snapshots and analysis with appropriate transaction boundaries.

## 12. Immutable analysis design

A completed analysis represents what Krunditark knew at a specific time.

Do not mutate its material fields after completion.

A rerun creates a new analysis linked to the same project/proposal or a proposal version.

Recommended state machine:

```text
queued -> collecting_sources -> evaluating -> completed
                              \-> partial
                \-------------> failed
```

`partial` means useful results exist but one or more required categories are incomplete. It is not equivalent to failed.

## 13. Rule architecture

Use deterministic functions or constrained declarative rules, versioned in code/database.

Do not create a generic user-editable “eval arbitrary JavaScript” rules engine.

A practical initial pattern:

```ts
type RuleEvaluator = (context: RuleContext) => RuleResult;
```

Code owns evaluator semantics; database owns activation/version/source metadata where appropriate.

If later using JSON Logic/DSL, add an ADR and sandbox/validation model first.

## 14. AI architecture

```text
Structured completed analysis
       + approved source excerpts
       + requested user question
                 |
                 v
         Prompt builder
                 |
                 v
       LLM provider adapter
                 |
                 v
        Schema validation
                 |
         +-------+-------+
         |               |
       valid           invalid/error
         |               |
         v               v
 AI explanation     deterministic template
```

Store provider/model/request metadata only to the extent allowed by privacy/retention policy.

The factual analysis does not depend on model determinism.

## 15. Authentication and authorization

- Supabase Auth identifies users.
- PostgreSQL RLS enforces user-row access.
- Admin authorization is an explicit server-side role check.
- Client claims are not trusted for privilege escalation.
- Public analysis endpoints, if enabled, have rate/abuse controls and cannot access private user data.

## 16. GitHub Pages phase

GitHub Pages serves generated static assets only.

Consequences:

- no API secrets in frontend;
- route strategy must account for static hosting/deep links;
- all server behavior goes to Supabase;
- Pages deployment should be a replaceable frontend delivery layer, not an architectural dependency.

See ADR 0003.

## 17. Cloudflare phase

Cloudflare may later provide:

- authoritative DNS;
- CDN/WAF;
- Pages hosting;
- Turnstile;
- redirects/security controls.

Do not couple core backend/domain logic to Cloudflare during MVP.

The domain may remain registered at Zone while using Cloudflare nameservers/DNS. Registrar transfer is not a requirement for Cloudflare DNS/Pages.

## 18. Observability

Minimum structured events:

- request/trace ID;
- analysis ID;
- source adapter ID;
- source duration/status;
- rule count/evaluation duration;
- source freshness age;
- typed error code;
- AI provider duration/status without logging secrets/full sensitive payloads.

Do not log entire government responses by default.

## 19. Failure model

Use typed errors such as:

- `INVALID_CADASTRAL_ID`;
- `PARCEL_NOT_FOUND`;
- `SOURCE_TIMEOUT`;
- `SOURCE_UNAVAILABLE`;
- `SOURCE_RESPONSE_INVALID`;
- `PROPOSAL_GEOMETRY_INVALID`;
- `ANALYSIS_SCOPE_UNSUPPORTED`;
- `RULESET_UNAVAILABLE`;
- `AI_UNAVAILABLE`;
- `RATE_LIMITED`;
- `UNAUTHORIZED`;
- `FORBIDDEN`.

Do not collapse source outage into not-found.

## 20. Architecture constraints that require an ADR to change

- AI is explanation-only for material findings.
- Supabase is MVP backend.
- PostGIS is authoritative spatial computation engine.
- analysis snapshots are versioned/immutable.
- official-source provenance is mandatory.
- GitHub Pages frontend contains no elevated secrets.
- Estonia is MVP geography.
