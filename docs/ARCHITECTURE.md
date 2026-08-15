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
  |- Cron / scheduled ingestion
  |- versioned official-data releases
    |
    +--> Maa- ja Ruumiamet WFS/WMS/downloads
    +--> PLANIS WFS/WMS
    +--> EELIS/Keskkonnaportaal WFS
    +--> E-ehitus/EHR APIs when approved
    +--> heritage official source
    +--> Transpordiamet/road official source
    +--> Riigi Teataja / maintained legal-source workflow
    +--> Google Gemini API for explanation only
```

The normal user-analysis path reads promoted internal source snapshots from Postgres/PostGIS. It does **not** synchronously call every upstream provider.

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
- run official-data synchronization;
- rely on arbitrary government-provider CORS for critical analysis.

### Edge Function responsibility

Edge Functions handle:

- official-source adapters and scheduled ingestion orchestration;
- request validation;
- auth/authorization for server APIs;
- analysis orchestration;
- rate limiting coordination;
- Gemini provider calls;
- privileged database operations where explicitly required;
- source timeout/retry/size controls;
- response normalization;
- secure CORS policy.

### PostgreSQL/PostGIS responsibility

Database handles:

- application state;
- project/proposal persistence;
- normalized geospatial datasets;
- source dataset versions and composite data releases;
- source provenance;
- immutable analysis snapshots;
- rule versions;
- spatial predicates/measurements;
- scheduled job state/leases where appropriate;
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
    sync-sources/
    sync-source/
    promote-data-release/
    _shared/
      auth/
      cors/
      errors/
      providers/
      schemas/
      source-provenance/
      ingestion/
      source-registry/
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

Normalized, versioned geospatial source data, usually accessed server-side or through controlled RPCs:

- parcels;
- restrictions;
- planning areas;
- environmental features;
- heritage features;
- road features.

Do not expose broadly merely because data originates publicly.

### `rules`

Versioned deterministic rule definitions, legal references and legal-change review candidates.

### `analysis`

Immutable analysis snapshots, findings and evidence relationships.

### `private`

- source definitions;
- source sync runs;
- source dataset versions;
- composite data releases;
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

### Default: scheduled, versioned replication

Krunditark does not re-fetch all laws, restrictions, planning data and other official datasets for every user request.

The baseline production model is:

1. Supabase Cron schedules source synchronization;
2. server-side ingestion fetches approved official datasets;
3. data is validated and normalized into staging/versioned tables;
4. stable IDs and hashes are used for change detection;
5. candidate dataset versions pass source-specific quality gates;
6. verified versions are promoted into a composite Krunditark data release;
7. analyses query that promoted release from Postgres/PostGIS.

The initial baseline is a **monthly full reconciliation** for replicated datasets, with documented source-specific exceptions.

### Why this is the default

This avoids:

- repeated official-provider calls per user;
- provider latency in the critical UX path;
- token cost for data retrieval;
- inconsistent data changing midway through one analysis;
- fragile behavior during temporary official-source outages.

### Live lookup exceptions

Live lookup is allowed only when explicitly registered because:

- the data is genuinely real-time/request-specific;
- replication is prohibited or unsuitable;
- no stable snapshot/bulk mechanism exists;
- the product semantics require a current provider response.

A live lookup must never become an undocumented fallback for a failed monthly sync.

### Legal changes

Legal-source synchronization may detect changed acts, sections or annexes, but it does not automatically modify verified deterministic rules.

A legal change creates a review candidate. New rule versions require explicit verification and tests before production activation.

See `docs/DATA_REFRESH_AND_VERSIONING.md` and ADR 0005.

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

The same adapter contract may be used by scheduled ingestion and explicitly approved live lookups, but the source definition determines which mode is allowed.

## 10. Analysis orchestration

```text
Analysis request
   |
   +--> validate user/proposal
   +--> select latest eligible promoted data release
   +--> resolve exact parcel/source versions from that release
   +--> calculate source completeness/freshness
   +--> compute GIS facts from normalized PostGIS data
   +--> load verified effective rule versions
   +--> evaluate rules deterministically
   +--> derive deterministic overall summary
   +--> persist immutable analysis snapshot/findings/evidence
   +--> persist data_release_id + exact source/rule versions
   +--> optionally request Gemini explanation
   v
Ehituspass response
```

AI explanation must not be in the transaction path required to persist the factual result.

A normal analysis does not trigger a bulk refresh of MaRu, PLANIS, EELIS or legal sources.

## 11. Transaction boundaries

### Data-release promotion

Promotion of a candidate source version/composite release must be transactional so readers never observe a half-promoted state.

A failed candidate must leave the previous verified version active.

### Analysis persistence

The following should become atomically consistent where practical:

- analysis snapshot header;
- data release reference;
- selected rule-version references;
- findings;
- finding-to-evidence relationships;
- engine version/input hash.

If AI explanation fails after factual analysis commits, factual analysis remains valid.

### External fetches

Do not hold database transactions open while waiting on slow external APIs.

Fetch/normalize into controlled staging first, then persist/promote with appropriate transaction boundaries.

## 12. Immutable analysis design

A completed analysis represents what Krunditark knew at a specific time using a specific promoted data release and exact rule versions.

Do not mutate its material fields after completion.

A rerun creates a new analysis linked to the same project/proposal or a proposal version.

Recommended state machine:

```text
queued -> preparing -> evaluating -> completed
                         \-> partial
          \--------------> failed
```

`partial` means useful results exist but one or more required categories are incomplete/stale beyond the allowed policy. It is not equivalent to failed.

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

The initial provider is **Google Gemini API**.

```text
Structured completed analysis
       + approved source excerpts
       + requested user question
                 |
                 v
         Prompt builder
                 |
                 v
     Gemini provider adapter
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

Gemini receives minimal structured evidence. It does not search for current official facts during the normal analysis path.

Store provider/model/request metadata only to the extent allowed by privacy/retention policy.

The factual analysis does not depend on model determinism.

## 15. Authentication and authorization

- Supabase Auth identifies users.
- PostgreSQL RLS enforces user-row access.
- Admin authorization is an explicit server-side role check.
- Client claims are not trusted for privilege escalation.
- Public analysis endpoints, if enabled, have rate/abuse controls and cannot access private user data.
- ingestion/sync/promotion endpoints are privileged server/admin operations only.

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
- data release ID;
- source adapter ID;
- source sync run ID;
- source duration/status;
- records added/changed/removed;
- release promotion status;
- rule count/evaluation duration;
- source freshness age;
- stale/carried-forward source count;
- typed error code;
- Gemini duration/status without logging secrets/full sensitive payloads.

Do not log entire government responses by default.

Operational monitoring must detect missed monthly syncs, schema changes, abnormal data diffs and critical stale sources.

## 19. Failure model

Use typed errors such as:

- `INVALID_CADASTRAL_ID`;
- `PARCEL_NOT_FOUND`;
- `SOURCE_TIMEOUT`;
- `SOURCE_UNAVAILABLE`;
- `SOURCE_RESPONSE_INVALID`;
- `SOURCE_STALE`;
- `SOURCE_SYNC_FAILED`;
- `DATA_RELEASE_UNAVAILABLE`;
- `DATA_RELEASE_INCOMPLETE`;
- `PROPOSAL_GEOMETRY_INVALID`;
- `ANALYSIS_SCOPE_UNSUPPORTED`;
- `RULESET_UNAVAILABLE`;
- `AI_UNAVAILABLE`;
- `RATE_LIMITED`;
- `UNAUTHORIZED`;
- `FORBIDDEN`.

Do not collapse source outage into not-found.

A failed scheduled refresh keeps the previous verified source version active; it must never replace it with an empty result.

## 20. Architecture constraints that require an ADR to change

- AI is explanation-only for material findings.
- Google Gemini API is the initial production AI provider.
- Supabase is MVP backend.
- PostGIS is authoritative spatial computation engine.
- official replicated data uses scheduled, versioned releases by default.
- monthly full reconciliation is the baseline refresh strategy.
- ordinary analysis does not bulk-fetch every official source.
- legal-source changes do not auto-promote rule interpretations.
- analysis snapshots are versioned/immutable.
- official-source provenance is mandatory.
- GitHub Pages frontend contains no elevated secrets.
- Estonia is MVP geography.
