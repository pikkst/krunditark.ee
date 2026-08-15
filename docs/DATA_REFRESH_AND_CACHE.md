# Data Refresh and Cache Architecture — Krunditark

## 1. Goal

Krunditark must **not** query every official source, re-read legislation, or call Google Gemini every time a user opens or runs the same project analysis.

The default architecture is **snapshot-first**:

```text
Official sources
      |
      | scheduled sync (monthly baseline)
      v
Validated + normalized versioned snapshots
      |
      v
PostgreSQL / PostGIS
      |
      +--> verified rules
      |
      v
User analysis
      |
      v
Cached deterministic Ehituspass
      |
      v
Cached Gemini explanation (optional)
```

A normal user analysis reads from Krunditark's own current validated data snapshot and verified rule set.

It does **not** perform live nationwide WFS/API/legal-document collection by default.

## 2. Why this is required

This architecture reduces:

- upstream API traffic;
- provider outages affecting user requests;
- latency;
- duplicate network transfer;
- repeated parsing/normalization;
- database write churn;
- Gemini token/API cost;
- risk that two users receive different results because a provider changed between requests.

It also improves reproducibility because every Ehituspass can identify the exact dataset release and rule versions used.

## 3. Three independent cache/version layers

### Layer A — Official spatial/data snapshots

Examples:

- cadastral restrictions;
- PLANIS planning geometries/metadata;
- selected EELIS public layers;
- heritage data when supported;
- state-road/protection-zone data when supported;
- other approved public spatial datasets.

These are periodically imported/normalized into Krunditark PostGIS.

### Layer B — Legal source + verified rules

Examples:

- Ehitusseadustik source metadata/content hash;
- relevant annex versions;
- other supported acts/regulations;
- Krunditark deterministic `rule_versions`.

The monthly job may detect legal changes automatically, but **must not automatically promote a new legal interpretation into a verified production rule**.

### Layer C — Analysis + AI explanation cache

For unchanged:

- proposal input;
- parcel snapshot;
- dataset release bundle;
- verified rule set;
- analysis engine version;

the deterministic structured analysis may be reused.

For unchanged:

- analysis ID/hash;
- language;
- Gemini model/config version;
- prompt template version;

the stored Gemini explanation may be reused rather than generated again.

## 4. Default refresh cadence

The project baseline is **monthly refresh** for relatively stable official/regulatory datasets.

Recommended default:

```text
Monthly dataset refresh window:
1st day of month, off-peak hours (Europe/Tallinn operational convention)
```

Exact cron execution uses UTC as configured in the database/runtime and must be documented explicitly when implemented.

Do not hard-code business meaning to “day 1” in domain logic. Cadence is source configuration.

Each source definition has:

- refresh cadence;
- last successful sync;
- last attempted sync;
- current release ID;
- freshness threshold;
- failure policy;
- whether manual/emergency refresh is allowed.

Monthly is the baseline, not an assertion that every source can never need a different cadence.

## 5. Supabase scheduling

Use **Supabase Cron / `pg_cron`** to schedule refresh orchestration.

Current Supabase Cron supports scheduled recurring jobs and can invoke SQL/database functions or Supabase Edge Functions.

Preferred pattern:

```text
Supabase Cron
    |
    +--> invoke source-sync Edge Function / enqueue source sync
              |
              +--> retrieve official source
              +--> validate
              +--> normalize
              +--> stage new release
              +--> run integrity checks
              +--> atomically activate release
```

Do not put a long national ETL directly into a single database transaction.

If a source dataset is too large for one Edge Function execution, split work into bounded batches/jobs and maintain resumable sync state.

## 6. Monthly spatial-data refresh lifecycle

For each supported source/layer:

### Step 1 — Start sync run

Create a `source_sync_run` with:

- source ID;
- requested release/cadence;
- started timestamp;
- previous active release ID;
- sync software/normalizer version.

### Step 2 — Retrieve official data

Prefer in order:

1. official full/incremental downloadable dataset if suitable;
2. official WFS/API pagination/batching;
3. approved source-specific mechanism.

Do not query the same national dataset once per user parcel if a periodic local copy is practical and source terms permit it.

### Step 3 — Stage, do not overwrite active data

Write incoming normalized records into a new release/snapshot partition/version.

The active production release remains unchanged during import.

### Step 4 — Validate

At minimum check:

- schema/version;
- feature count sanity;
- non-empty conditions where expected;
- geometry validity rate;
- SRID;
- duplicate stable IDs;
- source object identifiers;
- source update metadata;
- payload/release hash where practical;
- catastrophic count changes against previous release.

### Step 5 — Compare with previous release

Record:

- inserted features;
- updated/changed features;
- removed features;
- unchanged features;
- geometry changes;
- source metadata changes.

This enables auditing and future “what changed?” functionality.

### Step 6 — Activate atomically

Only after validation passes:

- mark the new dataset release `active`;
- mark prior release `superseded`;
- update the source's active release pointer.

Do not delete the old release immediately if analyses reference it.

### Step 7 — Retention cleanup

Old unreferenced source snapshots may eventually be archived/pruned under a retention policy.

Any source snapshot/release referenced by an immutable historical analysis must remain reproducible or retain sufficient immutable evidence to reconstruct the finding.

## 7. Failed monthly sync behavior

If a new sync fails validation or provider retrieval fails:

- do **not** replace the last known-good active release;
- mark the sync run failed;
- retain the old active snapshot;
- expose its real age/freshness;
- create an operational alert/admin warning;
- retry according to bounded retry policy;
- never claim the old release was freshly checked.

If the old release exceeds the configured maximum safe age, affected analysis categories become `partial`/`unknown` according to rule/source policy.

## 8. Emergency/manual refresh

Monthly default must not prevent urgent updates.

Provide an admin-only mechanism to request a source refresh when:

- a major legal change becomes effective;
- an authority announces a corrected dataset;
- a source schema changed;
- a critical restriction/plan dataset requires urgent update;
- an incident invalidated current cached data.

Manual refresh uses the same staging/validation/activation path as scheduled refresh.

Never allow arbitrary ordinary users to trigger national dataset refreshes.

## 9. Legislation refresh lifecycle

Legal updates are more sensitive than geometry replacement.

### Monthly law check

For each registered legal source:

1. retrieve official source metadata/current version from Riigi Teataja or other approved authority;
2. compare document/version/effective metadata and content hash where permitted/available;
3. if unchanged, record successful check;
4. if changed, create a **legal change candidate**;
5. preserve old source/rule version;
6. queue review.

### Critical rule

A detected legal text change must **not** automatically rewrite production deterministic rules.

Required path:

```text
official law changed
      |
      v
change candidate detected
      |
      v
rule impact review
      |
      v
new draft rule version
      |
      v
tests + exact source/effective dates
      |
      v
admin/verifier approval
      |
      v
verified rule version activated
```

Until verification is complete, current verified rule behavior remains explicit and the system may mark affected rule areas as requiring review if the legal change could invalidate them.

## 10. Legal change candidate data

A candidate should record:

- legal source ID;
- previous source version/hash;
- detected source version/hash;
- detected timestamp;
- effective date if available;
- changed source metadata;
- review status;
- impacted rule codes if known;
- reviewer notes;
- resulting new rule version IDs.

Suggested statuses:

- `detected`;
- `reviewing`;
- `no_rule_impact`;
- `rule_update_required`;
- `verified`;
- `dismissed`.

## 11. Data-release bundle

An analysis should not reference a vague concept such as “current data”.

Create a versioned **analysis data bundle** or equivalent manifest containing the exact active releases selected for an analysis profile.

Conceptual:

```json
{
  "profile": "mvp-v1",
  "bundleId": "uuid",
  "datasets": {
    "cadastre": "release-...",
    "restrictions": "release-...",
    "planis": "release-...",
    "eelis": "release-...",
    "heritage": "release-...",
    "roads": "release-..."
  },
  "ruleSetManifestId": "uuid"
}
```

This manifest is immutable once used by a completed analysis.

## 12. Normal user analysis behavior

Default request path:

```text
User proposal
   |
   v
Resolve current validated data bundle
   |
   v
Query local PostGIS only
   |
   v
Run deterministic verified rules
   |
   v
Reuse matching completed analysis if cache key matches
   |
   v
Generate Gemini explanation only if no matching explanation exists
```

No default per-analysis calls to:

- national WFS restriction services;
- PLANIS WFS;
- EELIS WFS;
- Riigi Teataja document retrieval;
- Gemini for already-cached explanation.

Exceptions must be source/task-specific and documented.

## 13. Analysis cache key

A reusable deterministic analysis cache key should be based on immutable/canonical inputs, for example:

```text
SHA-256(
  canonical proposal geometry + parameters
  + parcel snapshot/release ID
  + data bundle ID
  + rule-set manifest ID
  + analysis profile version
  + engine version
)
```

Do not key only by cadastral ID. Moving the proposed building even one meaningful distance can change results.

### Cache reuse rule

If the exact input hash already has a completed compatible analysis:

- return/reuse it or create a lightweight project reference to it according to privacy/data model;
- do not re-run source ingestion;
- do not re-run deterministic work unnecessarily.

Never share user-private metadata merely because two analyses have identical technical inputs.

## 14. Gemini explanation cache

Gemini is used only after the structured result exists.

Explanation cache key concept:

```text
analysis structured-result hash
+ language
+ prompt template version
+ configured Gemini model ID
+ explanation schema version
```

If a valid stored explanation exists for this key:

- return it;
- do not call Gemini again.

If the deterministic result is unchanged but a prompt/model version changes, a new explanation may be generated without changing the factual Ehituspass.

## 15. Minimize Gemini tokens

Gemini must **not** receive entire national law corpora or every source document for each analysis.

Send only:

- the relevant structured finding(s);
- deterministic measurements;
- compact source metadata;
- small approved excerpts only when needed;
- structured next actions;
- critical limitations/unknowns.

The rules engine already contains the verified legal interpretation needed to derive status.

Gemini's job is wording, not re-research.

## 16. Parcel-specific data strategy

Not every dataset needs to be mirrored nationally on day one.

Two approved patterns:

### Pattern A — National/large snapshot

Use for datasets where:

- bulk/download access is practical;
- source terms allow local caching;
- data volume is manageable;
- many analyses reuse the same features.

Best candidate for restrictions/planning/environment layers when technically suitable.

### Pattern B — On-demand object cache

Use for datasets where:

- full national mirror is impractical;
- API terms/volume favor lookup;
- user queries sparse objects.

Once fetched, persist a versioned normalized object cache and do not refetch it for every page view. Refresh according to source freshness policy/monthly maintenance where applicable.

The source registry must specify which pattern applies.

## 17. Source-specific cadence

Every source definition includes a configuration such as:

```yaml
refresh_strategy: scheduled_snapshot
refresh_cadence: monthly
freshness_warning_after: P35D
maximum_safe_age: P60D
manual_refresh: true
```

These example durations are design examples, not production values.

Production values require source-by-source review.

## 18. Observability

Track for every scheduled sync:

- job/run ID;
- source ID;
- scheduled/manual trigger;
- started/completed time;
- records fetched;
- records staged;
- inserted/changed/removed counts;
- validation result;
- previous/new release ID;
- bytes transferred if useful;
- errors/retries;
- current active release age.

Track AI cache:

- explanation cache hit/miss;
- model;
- prompt version;
- input/output token usage when provider returns it;
- request latency;
- cost estimate if operationally useful;
- provider failure rate.

Do not log Gemini API keys or unrestricted private prompts.

## 19. Scheduled job design

Use small coordinator jobs rather than one unbounded monthly request.

Conceptual:

```text
monthly-refresh coordinator
  |
  +--> restrictions sync
  +--> PLANIS sync
  +--> EELIS sync
  +--> heritage sync
  +--> road sync
  +--> legal source check
```

Each child run is independently retryable and auditable.

A failed EELIS sync must not roll back a valid PLANIS release.

## 20. Supabase Cron operational constraints

When implemented, review current Supabase Cron guidance and runtime limits.

The current platform documentation recommends bounded jobs and provides job run history in Postgres. Large ETL work should therefore be split appropriately instead of assuming an unlimited cron execution window.

Cron configuration must be represented by migration/controlled infrastructure code where practical so production scheduling is reproducible.

## 21. User-facing freshness

Ehituspass displays the actual data basis, for example:

```text
Kitsenduste andmed: dataset 2026-08, uuendatud 01.08.2026
Planeeringud: dataset 2026-08, uuendatud 01.08.2026
Keskkonnaandmed: dataset 2026-08, uuendatud 01.08.2026
Õigusreeglid: kontrollitud 01.08.2026
Analüüs koostatud: 15.08.2026
```

If the monthly refresh failed:

```text
Planeeringud: viimati edukalt uuendatud 01.07.2026 — andmed võivad olla aegunud
```

Never show today's analysis date as though every underlying source was fetched today.

## 22. Reanalysis after new monthly release

Existing historical Ehituspass remains unchanged.

When a new data bundle or verified rule set becomes active:

- old analysis remains viewable with its original snapshot versions;
- project can be marked `newer_data_available`;
- user may run a new analysis;
- future product may proactively create/notify of material changes, but this is not required for MVP.

Do not silently mutate an old report to current data.

## 23. Cost-control hierarchy

When satisfying a user request, prefer:

1. cached completed analysis;
2. local PostGIS computation using current dataset bundle;
3. cached normalized source object;
4. scheduled/background official-source retrieval;
5. live source retrieval only when explicitly required;
6. Gemini only for explanation that is not already cached.

This hierarchy is a core product architecture rule.

## 24. Implementation acceptance criteria

The refresh/cache system is complete when:

- a monthly Supabase Cron schedule can trigger source sync orchestration;
- each source sync creates an auditable run;
- data is staged and validated before activation;
- a failed sync leaves previous release active;
- analyses reference immutable data-release/rule manifests;
- legal source changes create review candidates rather than auto-verifying rules;
- ordinary analysis does not call official WFS/legal services by default;
- identical compatible analyses can be reused via deterministic cache key;
- Gemini explanations are cached by analysis/model/prompt version;
- source and AI cache hit/miss behavior is observable;
- freshness is visible to the user;
- manual admin refresh uses the same validated pipeline.
