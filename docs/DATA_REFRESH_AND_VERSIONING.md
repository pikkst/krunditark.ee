# Data Refresh, Versioning and Freshness — Krunditark

## 1. Purpose

Krunditark must not re-download and reinterpret Estonia's official legal, cadastral, planning and restriction data for every user analysis.

The default production model is:

```text
Official sources
      |
      | scheduled ingestion
      v
Supabase ingestion/staging
      |
      | validation + normalization + change detection
      v
Versioned Postgres/PostGIS datasets
      |
      | verified/promoted data release
      v
Deterministic GIS + rules engine
      |
      v
Ehituspass
      |
      +--> optional Gemini explanation
```

A user analysis primarily reads Krunditark's latest verified internal data release. It does not fan out to every upstream government service.

This design exists for:

- predictable latency;
- lower upstream load;
- lower infrastructure and AI cost;
- reproducibility;
- resilience when an official source is temporarily unavailable;
- exact provenance;
- safe historical analyses;
- explicit freshness reporting.

## 2. Default refresh policy

### Monthly full reconciliation

The baseline production policy is one full scheduled reconciliation per calendar month for replicated datasets.

Recommended initial schedule:

```text
03:15 UTC on the first day of every month
```

The exact cron schedule is infrastructure configuration and may be changed without altering domain semantics.

The monthly run must include all source definitions whose `refresh_policy` is `monthly_snapshot` and which are due.

### Manual/emergency refresh

Administrators must be able to trigger a source-specific refresh before the next monthly cycle when:

- a major law change becomes effective;
- an authority announces an important dataset correction;
- a source schema changes;
- a production incident reveals stale/invalid data;
- a source was unavailable during the scheduled run.

A manual refresh follows the same validation and promotion pipeline as a scheduled run. It must not bypass verification.

### Source-specific exceptions

Not every dataset has the same lifecycle. A source may use another documented policy such as:

- `monthly_snapshot` — default replicated source;
- `weekly_metadata_check` — cheap change/version metadata check only;
- `manual_verified` — legal/rule content requiring human verification;
- `live_lookup` — only where current live data is genuinely required and storage/replication is unsuitable;
- `no_replication` — source terms or sensitivity prohibit local replication.

A source-specific exception must be registered in `DATA_SOURCES.md` and source configuration. Critical analysis logic must never silently switch from snapshot to live lookup.

## 3. Supabase scheduling

Use Supabase Cron / `pg_cron` for recurring scheduling.

A scheduled Postgres job may invoke a dedicated Supabase Edge Function through the supported Supabase scheduling pattern.

Recommended logical functions:

```text
supabase/functions/
  sync-sources/
  sync-source/
  promote-data-release/
  _shared/
    ingestion/
    source-registry/
    provenance/
    validation/
```

The scheduler starts orchestration. Network-heavy ingestion belongs in server-side code, not in a user request and not in browser code.

Operational constraints:

- scheduled jobs must be idempotent;
- overlapping full sync runs must be prevented with a database/advisory lock or equivalent lease;
- long source imports should be split into bounded batches if required by runtime limits;
- a failed batch must be resumable/retryable;
- job credentials/secrets stay in Supabase-managed server configuration/Vault/secrets;
- ordinary users cannot invoke privileged sync endpoints.

## 4. No AI in the authoritative refresh path

The default official-data refresh pipeline must not require Gemini.

Do not use Gemini to:

- discover current law for each user request;
- decide whether a source record changed;
- determine whether a restriction geometry exists;
- modify deterministic rule thresholds automatically;
- auto-promote a changed legal interpretation into production.

Gemini may later assist an administrator by summarizing an already-detected legal document diff, but that output is advisory only and cannot promote a rule.

This prevents token cost from scaling with cadastral searches and keeps source ingestion deterministic.

## 5. Source sync lifecycle

Every source sync follows this state machine:

```text
scheduled/manual
      |
      v
queued
      |
      v
fetching
      |
      v
validating
      |
      v
normalizing
      |
      v
change_detection
      |
      +--> failed/rejected
      |
      v
candidate
      |
      v
verified/promoted
```

For sources that require human/legal review, `candidate` cannot automatically become `verified`.

## 6. Ingestion algorithm

For each source:

1. load the source definition and current promoted dataset version;
2. acquire a source-specific sync lease;
3. fetch the official dataset or required bounded pages;
4. validate transport status, content type, schema and configured response limits;
5. record retrieval metadata and payload/file hash;
6. normalize geometry to the canonical analysis CRS where applicable;
7. run geometry validity checks and source-specific quality checks;
8. write into staging/candidate rows, never directly mutate the active production dataset;
9. compare stable source IDs and normalized content hashes against the previous promoted version;
10. record added/changed/removed counts and change events;
11. run source contract tests/invariants;
12. mark the candidate version valid or rejected;
13. promote according to the source's verification policy;
14. release the sync lease and persist observability metrics.

No partially downloaded dataset may replace the previous known-good production version.

## 7. Change detection

Prefer stable official object IDs plus normalized content hashes.

Conceptually:

```text
same source object id + same normalized hash -> unchanged
same source object id + different normalized hash -> changed
new source object id -> added
previous source object id missing from complete new snapshot -> removed
```

A source must not treat “missing from an incomplete/failed fetch” as a deletion.

For large spatial datasets, implement efficient staged diffing in Postgres rather than loading the entire national dataset into application memory.

## 8. Data releases

Krunditark analyses use a composite **data release**.

Example release identifier:

```text
2026-09-01.1
```

A release contains explicit source-version references, for example:

```json
{
  "release": "2026-09-01.1",
  "sources": {
    "maru.cadastre": "2026-09-01:a81c...",
    "maru.restrictions": "2026-09-01:72e4...",
    "planis.plans": "2026-09-01:11bc...",
    "eelis.public": "2026-09-01:d9fd...",
    "legal.registry": "2026-08-31:verified"
  }
}
```

The composite release prevents an analysis from vaguely meaning “whatever happened to be current when several SQL queries ran”.

## 9. Promotion policy

### Spatial/registry sources

A new normalized source dataset may be automatically promoted only when all configured machine-verifiable gates pass, including where relevant:

- complete successful retrieval;
- schema validation;
- CRS validation;
- geometry validity policy;
- non-empty/expected sanity checks;
- record-count anomaly thresholds;
- duplicate-ID checks;
- required field checks;
- diff-size anomaly checks.

Large unexpected changes must be quarantined for review instead of being blindly promoted.

### Legal sources and deterministic rules

Legal source synchronization and rule activation are separate operations.

A monthly law refresh may detect:

- new act version;
- amended section;
- changed annex;
- changed effective date;
- repealed provision.

This creates a `legal_change_candidate` and may mark affected verified rules `review_required`.

It must **not** automatically rewrite or verify the deterministic rule.

A human/admin verification step must confirm the interpretation and tests before a new `rules.rule_versions` record is promoted to `verified`.

Historical rule versions remain intact.

## 10. Failure behavior

If a monthly source sync fails:

- keep the last verified dataset version active;
- mark the source freshness/health state appropriately;
- create an operational alert/admin-visible failure;
- retry under the configured policy;
- do not replace active data with an empty/incomplete dataset;
- do not interpret failed retrieval as “no restrictions”.

A new composite release may either:

1. carry forward the previous verified version for that source and mark it stale/carried-forward; or
2. remain unpromoted if the source is classified as release-blocking.

The source definition decides which policy applies.

## 11. Freshness model

Every source definition must include at least:

- refresh policy;
- expected refresh interval;
- freshness warning threshold;
- critical stale threshold;
- whether stale data blocks a finding or only adds a warning;
- whether the source is release-blocking.

Every promoted source version stores:

- retrieved at;
- source-reported update/effective date when available;
- promoted at;
- source payload/content hash;
- normalizer version;
- validation result;
- prior version reference.

User-facing analysis must be able to display:

- data release date;
- per-category source freshness;
- stale/carried-forward sources;
- manual-verification requirements.

Never display “checked today” merely because the user ran an analysis today.

## 12. Analysis behavior

The normal analysis path is:

```text
User request
   |
   v
Select latest eligible verified data release
   |
   v
Read normalized PostGIS/source snapshot
   |
   v
Run deterministic GIS/rules
   |
   v
Persist analysis with data_release_id + ruleset versions
   |
   v
Optionally call Gemini for explanation
```

A normal Ehituspass request must not synchronously refresh MaRu, PLANIS, EELIS and Riigi Teataja.

This is a hard architectural rule unless a source is explicitly registered as `live_lookup`.

## 13. Historical reproducibility

Completed analyses are immutable.

Persist at minimum:

- `data_release_id`;
- exact source dataset-version IDs used;
- exact rule-version IDs used;
- analysis engine version;
- proposal/input snapshot;
- result/evidence references.

When the monthly data release changes, an older Ehituspass remains a record of the information/rules used at that time.

The user may request a rerun, which creates a new analysis against the latest eligible release.

## 14. Recommended database additions

### `private.source_definitions`

Add/plan fields:

```text
refresh_policy
refresh_interval
freshness_warn_after
freshness_critical_after
release_blocking
verification_policy
last_successful_sync_at
next_sync_due_at
```

### `private.source_sync_runs`

Recommended fields:

```text
id
source_id
trigger_type          -- scheduled/manual/retry
status
started_at
finished_at
previous_version_id
candidate_version_id
records_fetched
records_added
records_changed
records_removed
payload_hash
error_code
safe_metadata
```

### `private.source_dataset_versions`

Recommended fields:

```text
id
source_id
version_key
status                -- candidate/verified/rejected/retired
retrieved_at
source_updated_at
promoted_at
payload_hash
normalizer_version
record_count
previous_version_id
validation_summary
created_at
```

### `private.data_releases`

Recommended fields:

```text
id
release_key
status                -- candidate/promoted/rejected
created_at
promoted_at
notes
```

### `private.data_release_sources`

Recommended fields:

```text
data_release_id
source_id
source_dataset_version_id
carried_forward
freshness_state
```

### `rules.legal_change_candidates`

Recommended fields:

```text
id
legal_source_id
previous_hash
new_hash
detected_at
effective_at
status                -- pending/reviewed/accepted/no_rule_change
review_notes
reviewed_by
reviewed_at
```

### `analysis.analyses`

Add/require:

```text
data_release_id
```

An analysis should also retain direct evidence/version relationships so the release reference is not the only provenance mechanism.

## 15. Idempotency and locking

A scheduled job may be invoked twice because of retry/operator error. Therefore:

- derive an idempotency key from source + intended sync period/version where possible;
- use unique constraints to prevent duplicate promoted versions;
- use advisory locks or lease rows to prevent overlapping writes;
- make batch page/chunk checkpoints resumable;
- promotion itself must be transactional.

## 16. Retention

Do not keep unlimited raw provider payloads by default.

Prefer retaining:

- normalized versioned facts required for analysis/history;
- hashes;
- provenance metadata;
- source IDs;
- change summaries;
- legally permitted source excerpts needed by rules/reports.

Raw downloads may use shorter operational retention unless they are required for audit/reproducibility and source terms permit storage.

Do not delete dataset versions still referenced by an analysis.

## 17. Performance

User query performance should depend mainly on Postgres/PostGIS indexes, not public-provider latency.

Required practices include:

- GiST indexes on active spatial layers;
- B-tree indexes on source IDs/version IDs/status fields;
- partial indexes for current/promoted rows when useful;
- avoid N+1 evidence/source queries;
- precompute normalized impact geometry only when semantics permit;
- archive/partition very large historical datasets when actual scale justifies it.

## 18. AI/token cost policy

Krunditark's token budget must scale with explanation use, **not with official-data acquisition**.

Therefore:

- source refresh uses APIs/WFS/downloads and deterministic parsers;
- GIS/rule evaluation uses PostGIS/domain code;
- Gemini receives only the final structured analysis plus approved, minimal evidence/excerpts;
- repeated page loads do not call Gemini again automatically;
- cache a generated explanation for an immutable analysis where product policy allows;
- regeneration is explicit and rate-limited;
- normal monthly source refresh uses zero Gemini tokens.

A future optional legal-diff summarizer may use Gemini once per detected change set for admin assistance, but it is not part of the authoritative pipeline.

## 19. Monitoring and alerts

Track at minimum:

- last successful sync per source;
- next due time;
- run duration;
- fetched/added/changed/removed counts;
- source failures/timeouts;
- schema-validation failures;
- abnormal diff percentage;
- stale critical source count;
- release promotion status;
- pending legal change candidates.

Create admin-visible alerts for:

- missed monthly run;
- critical source beyond freshness threshold;
- repeated source failures;
- quarantined large diff;
- source schema change;
- pending legal change that may affect verified rules.

## 20. Testing requirements

Tests must cover:

- first source import;
- second identical import creates no material change;
- added/changed/removed source objects;
- incomplete fetch does not delete objects;
- malformed source response is rejected;
- large anomalous diff is quarantined;
- duplicate cron invocation is idempotent;
- overlapping runs are prevented;
- failed candidate keeps previous verified version active;
- successful candidate promotion is atomic;
- composite release references exact source versions;
- carried-forward stale source is visible;
- completed analysis remains bound to its old release;
- new analysis uses the latest eligible release;
- legal text change creates review candidate but does not auto-change verified rule;
- Gemini is not called during source synchronization.

## 21. Implementation sequence

When implementation reaches source caching/synchronization, perform work in this order:

1. extend source registry/schema with refresh/version metadata;
2. add source sync run and dataset-version tables;
3. add composite data releases;
4. build one source end-to-end through staging/diff/promotion;
5. schedule it with Supabase Cron;
6. add monitoring/failure state;
7. migrate other replicated sources to the same pipeline;
8. make analysis select a promoted data release;
9. add legal-change candidate workflow;
10. remove any accidental per-request bulk source refresh behavior.

## 22. Related documents

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/GIS_AND_RULES_ENGINE.md`
- `docs/AI_SAFETY_AND_EXPLANATIONS.md`
- `docs/adr/0005-scheduled-versioned-data-releases.md`

Supabase implementation reference to verify at implementation time:

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/functions/schedule-functions
