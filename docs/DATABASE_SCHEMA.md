# Database Schema — Krunditark

This document defines the intended PostgreSQL/PostGIS data model. Exact migration syntax may evolve, but relationships, provenance, versioning and security semantics are requirements.

## 1. General conventions

- PostgreSQL through Supabase.
- Supported PostgreSQL major version: **17** (matches `supabase/config.toml` `[db] major_version`).
- PostGIS enabled by migration.
- UUID primary keys for application entities unless an authoritative source identifier is the natural immutable key inside a source-scoped table.
- `timestamptz` for timestamps.
- Geometry SRID always constrained/documented.
- GiST indexes on spatial query columns.
- Foreign-key indexes for common joins.
- RLS on all client-accessible user tables.
- Internal schemas are not exposed through Data API unless explicitly approved.
- Completed analyses are immutable snapshots from the application perspective.
- Official replicated datasets are versioned; never model them as one silently overwritten “current” copy.
- A promoted data release is an immutable composition of exact source dataset versions.

## 2. Logical schemas

Suggested:

```text
public    user-facing account/project resources
geo       normalized official spatial source data/versioned snapshots
rules     rule definitions, versions, legal references/change review
analysis  analysis snapshots, findings, evidence, explanations
private   source registry, sync runs, dataset releases, audit and operational records
```

If Supabase exposure configuration makes another layout safer, preserve the logical boundaries.

## 3. Identity

### `public.profiles`

| Column         | Type                  | Notes                                      |
| -------------- | --------------------- | ------------------------------------------ |
| `id`           | uuid PK/FK auth.users | same as auth user                          |
| `display_name` | text nullable         | optional                                   |
| `role`         | text/enum             | `user`, `admin`; cannot be client-elevated |
| `created_at`   | timestamptz           |                                            |
| `updated_at`   | timestamptz           |                                            |

RLS:

- authenticated user may read own profile;
- authenticated user may update explicitly safe own fields;
- role cannot be updated through ordinary client policy;
- admin changes only server-side.

## 4. Projects and proposals

### `public.projects`

| Column                       | Type                 | Notes                                          |
| ---------------------------- | -------------------- | ---------------------------------------------- |
| `id`                         | uuid PK              |                                                |
| `user_id`                    | uuid FK auth.users   | owner                                          |
| `name`                       | text                 | user label                                     |
| `cadastral_id`               | text                 | selected parcel, not ownership proof           |
| `intent_code`                | text/enum nullable   | stable locale-independent user intent (KT-024) |
| `current_parcel_snapshot_id` | uuid nullable        | latest selected parcel snapshot                |
| `created_at`                 | timestamptz          |                                                |
| `updated_at`                 | timestamptz          |                                                |
| `archived_at`                | timestamptz nullable | optional soft archive                          |

Indexes:

- `(user_id, updated_at desc)`;
- cadastral ID for own-project filters if useful.

RLS:

- owner CRUD only;
- admin access through verified server path only.

#### Intent codes

The `intent_code` enum on `public.projects` records the user's declared workflow intent. Codes are stable, locale-independent identifiers; translated labels are resolved through i18n keys in the application layer. Codes are classified by implementation status:

| Code                             | Meaning                                         | Status    |
| -------------------------------- | ----------------------------------------------- | --------- |
| `build`                          | Build a new structure                           | supported |
| `understand_parcel`              | Understand parcel and constraints (no building) | supported |
| `pre_purchase`                   | Pre-purchase parcel check                       | planned   |
| `existing_building_modification` | Modify existing building (placeholder)          | planned   |
| `professional`                   | Professional context marker                     | context   |

Supported codes have a fully implemented workflow. Planned codes are recognized (valid `IntentCode` values) but their full workflow is not yet implemented — the system should present these as upcoming/unavailable rather than proceeding to full analysis. The `professional` code is a context marker rather than a primary workflow intent.

### `public.project_proposals`

Version proposals instead of silently changing geometry after analyses exist.

| Column              | Type                   | Notes                     |
| ------------------- | ---------------------- | ------------------------- |
| `id`                | uuid PK                |                           |
| `project_id`        | uuid FK                |                           |
| `version`           | integer                | unique per project        |
| `structure_type`    | text/enum              | supported categories      |
| `intended_use`      | text nullable          |                           |
| `footprint`         | geometry(Polygon,3301) | canonical server geometry |
| `footprint_area_m2` | numeric                | server-calculated         |
| `height_m`          | numeric nullable       |                           |
| `storeys`           | integer nullable       |                           |
| `width_m`           | numeric nullable       | convenience               |
| `length_m`          | numeric nullable       | convenience               |
| `orientation_deg`   | numeric nullable       | normalized                |
| `user_notes`        | text nullable          | limited length            |
| `created_at`        | timestamptz            |                           |
| `superseded_at`     | timestamptz nullable   |                           |

Constraints:

- valid polygon;
- positive sizes;
- sensible maximum limits to prevent resource abuse;
- unique `(project_id, version)`.

GiST index on `footprint` if proposal-spatial queries justify it.

## 5. Official source registry and synchronization

### `private.source_definitions`

One stable row per approved source/layer contract.

| Column                     | Type                 | Notes                                                                             |
| -------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `id`                       | text PK              | stable code e.g. `maru.cadastre.parcels`                                          |
| `name`                     | text                 |                                                                                   |
| `authority`                | text                 |                                                                                   |
| `source_type`              | text                 | WFS/API/download/manual-law                                                       |
| `base_url`                 | text                 | approved official base URL                                                        |
| `terms_url`                | text nullable        |                                                                                   |
| `attribution_text`         | text nullable        |                                                                                   |
| `refresh_policy`           | text/enum            | monthly_snapshot/weekly_metadata_check/manual_verified/live_lookup/no_replication |
| `refresh_interval`         | interval nullable    | expected schedule                                                                 |
| `freshness_warn_after`     | interval nullable    | user/admin warning threshold                                                      |
| `freshness_critical_after` | interval nullable    | critical stale threshold                                                          |
| `release_blocking`         | boolean              | whether unusable version blocks release                                           |
| `verification_policy`      | text                 | automatic_quality_gates/manual_verified/etc.                                      |
| `normalizer_version`       | text                 | current configured normalizer version                                             |
| `enabled`                  | boolean              |                                                                                   |
| `last_successful_sync_at`  | timestamptz nullable | operational cache                                                                 |
| `next_sync_due_at`         | timestamptz nullable | operational cache                                                                 |
| `created_at`               | timestamptz          |                                                                                   |
| `updated_at`               | timestamptz          |                                                                                   |

Changing a source ID to point to a semantically different dataset is forbidden. Create a new source definition/versioned migration instead.

### `private.source_sync_runs`

Represents one scheduled/manual/retry synchronization attempt.

| Column                 | Type                 | Notes                                                                      |
| ---------------------- | -------------------- | -------------------------------------------------------------------------- |
| `id`                   | uuid PK              |                                                                            |
| `source_id`            | text FK              |                                                                            |
| `trigger_type`         | text/enum            | scheduled/manual/retry                                                     |
| `idempotency_key`      | text                 | unique in appropriate source scope                                         |
| `status`               | text/enum            | queued/fetching/validating/normalizing/candidate/completed/failed/rejected |
| `started_at`           | timestamptz          |                                                                            |
| `finished_at`          | timestamptz nullable |                                                                            |
| `previous_version_id`  | uuid nullable        | previous promoted version                                                  |
| `candidate_version_id` | uuid nullable        | version produced by this run                                               |
| `http_status`          | integer nullable     | where meaningful                                                           |
| `records_fetched`      | bigint nullable      |                                                                            |
| `records_added`        | bigint nullable      |                                                                            |
| `records_changed`      | bigint nullable      |                                                                            |
| `records_removed`      | bigint nullable      | only after complete fetch proven                                           |
| `payload_sha256`       | text nullable        | provenance/dedupe                                                          |
| `source_version`       | text nullable        | source-provided                                                            |
| `source_updated_at`    | timestamptz nullable | source-provided                                                            |
| `normalizer_version`   | text                 |                                                                            |
| `error_code`           | text nullable        | safe typed code                                                            |
| `safe_metadata`        | jsonb                | never secrets/raw auth                                                     |

The run must distinguish “complete success with zero objects” from fetch failure/incomplete pagination.

Indexes:

- `(source_id, started_at desc)`;
- `(status, started_at)`;
- unique/indexed idempotency key in source scope.

### `private.source_dataset_versions`

Immutable candidate/promoted normalized dataset version for one source.

| Column                | Type                  | Notes                                        |
| --------------------- | --------------------- | -------------------------------------------- |
| `id`                  | uuid PK               |                                              |
| `source_id`           | text FK               |                                              |
| `version_key`         | text                  | source/release-friendly stable version label |
| `status`              | text/enum             | candidate/verified/rejected/retired          |
| `sync_run_id`         | uuid FK               | run that produced candidate                  |
| `previous_version_id` | uuid nullable FK self |                                              |
| `retrieved_at`        | timestamptz           |                                              |
| `source_updated_at`   | timestamptz nullable  |                                              |
| `promoted_at`         | timestamptz nullable  |                                              |
| `payload_sha256`      | text nullable         |                                              |
| `normalizer_version`  | text                  |                                              |
| `record_count`        | bigint                |                                              |
| `validation_summary`  | jsonb                 | bounded structured validation result         |
| `created_at`          | timestamptz           |                                              |

Unique `(source_id, version_key)`.

A failed/rejected candidate does not modify the previously verified dataset version.

## 6. Composite data releases

### `private.data_releases`

A data release is the exact source-version composition available to an analysis.

| Column        | Type                 | Notes                               |
| ------------- | -------------------- | ----------------------------------- |
| `id`          | uuid PK              |                                     |
| `release_key` | text UNIQUE          | e.g. `2026-09-01.1`                 |
| `status`      | text/enum            | candidate/promoted/rejected/retired |
| `created_at`  | timestamptz          |                                     |
| `promoted_at` | timestamptz nullable |                                     |
| `created_by`  | uuid nullable        | admin/manual release if applicable  |
| `notes`       | text nullable        |                                     |

Only a `promoted` release is eligible for normal production analysis unless an explicit testing/admin mode says otherwise.

### `private.data_release_sources`

Exact source version membership of a release.

| Column                      | Type        | Notes                                                              |
| --------------------------- | ----------- | ------------------------------------------------------------------ |
| `data_release_id`           | uuid FK     |                                                                    |
| `source_id`                 | text FK     |                                                                    |
| `source_dataset_version_id` | uuid FK     |                                                                    |
| `carried_forward`           | boolean     | previous verified version reused because no newer eligible version |
| `freshness_state`           | text/enum   | fresh/warning/stale/unknown                                        |
| `created_at`                | timestamptz |                                                                    |

Composite PK `(data_release_id, source_id)`.

A promoted release is immutable. Create another release rather than modifying membership.

## 7. Parcel snapshots

### `geo.parcel_snapshots`

The same cadastral unit can change over time. Analyses reference a snapshot bound to a source dataset version.

| Column                      | Type                                          | Notes                                        |
| --------------------------- | --------------------------------------------- | -------------------------------------------- |
| `id`                        | uuid PK                                       |                                              |
| `cadastral_id`              | text                                          | indexed                                      |
| `source_dataset_version_id` | uuid FK                                       | exact source dataset version                 |
| `source_sync_run_id`        | uuid FK                                       | provenance convenience                       |
| `source_object_id`          | text nullable                                 |                                              |
| `geometry`                  | geometry(MultiPolygon,3301) or Polygon policy | authoritative normalized geometry            |
| `area_m2_source`            | numeric nullable                              | source-reported                              |
| `area_m2_geometry`          | numeric                                       | computed                                     |
| `address_text`              | text nullable                                 |                                              |
| `land_use_data`             | jsonb                                         | only normalized noncritical extras initially |
| `source_effective_at`       | timestamptz nullable                          |                                              |
| `retrieved_at`              | timestamptz                                   |                                              |
| `normalizer_version`        | text                                          |                                              |
| `content_hash`              | text                                          | normalized-object change detection           |

Critical facts used by rules should graduate from generic JSON into typed columns/tables when required.

GiST index on `geometry`; B-tree on `(cadastral_id, source_dataset_version_id)` and `(cadastral_id, retrieved_at desc)`.

## 8. Normalized constraints and planning

### `geo.constraint_snapshots`

A generic normalized representation for spatial constraints while retaining source-specific detail.

| Column                      | Type                             | Notes                                                |
| --------------------------- | -------------------------------- | ---------------------------------------------------- |
| `id`                        | uuid PK                          |                                                      |
| `source_dataset_version_id` | uuid FK                          | exact dataset version                                |
| `source_sync_run_id`        | uuid FK                          | provenance convenience                               |
| `source_object_id`          | text                             | source-scoped ID                                     |
| `category`                  | text                             | e.g. cadastral_restriction/environment/heritage/road |
| `subcategory`               | text                             | controlled source/domain mapping                     |
| `name`                      | text nullable                    |                                                      |
| `geometry`                  | geometry(Geometry,3301)          | point/line/polygon as normalized                     |
| `impact_geometry`           | geometry(Geometry,3301) nullable | authoritative zone if separate                       |
| `source_attributes`         | jsonb                            | noncritical retained data                            |
| `source_effective_from`     | timestamptz nullable             |                                                      |
| `source_effective_to`       | timestamptz nullable             |                                                      |
| `retrieved_at`              | timestamptz                      |                                                      |
| `normalizer_version`        | text                             |                                                      |
| `content_hash`              | text                             | normalized-object change detection                   |

Unique/dedupe key should include source dataset version + source object ID. A separate unique rule on active/candidate source data must not destroy historical versions.

GiST indexes on geometry columns; B-tree on `(source_dataset_version_id, source_object_id)`.

### `geo.planning_snapshots`

Keep planning concepts typed rather than forcing all into generic constraint rows.

| Column                      | Type                                 | Notes          |
| --------------------------- | ------------------------------------ | -------------- |
| `id`                        | uuid PK                              |                |
| `source_dataset_version_id` | uuid FK                              |                |
| `source_sync_run_id`        | uuid FK                              |                |
| `source_plan_id`            | text                                 |                |
| `plan_type`                 | text                                 |                |
| `status`                    | text nullable                        | source-derived |
| `title`                     | text                                 |                |
| `authority_name`            | text nullable                        |                |
| `geometry`                  | geometry(MultiPolygon,3301) nullable |                |
| `official_url`              | text nullable                        |                |
| `established_at`            | date/timestamptz nullable            |                |
| `source_attributes`         | jsonb                                |                |
| `retrieved_at`              | timestamptz                          |                |
| `content_hash`              | text                                 |                |

Important semantic rule: intersection with plan geometry does not prove compliance with all textual plan provisions.

## 9. Legal/source references and legal changes

### `rules.legal_sources`

| Column                | Type          | Notes                                 |
| --------------------- | ------------- | ------------------------------------- |
| `id`                  | uuid PK       |                                       |
| `authority`           | text          | usually official publisher/authority  |
| `title`               | text          |                                       |
| `official_url`        | text          |                                       |
| `document_identifier` | text nullable | act/publication ID                    |
| `section_reference`   | text nullable | section/annex etc.                    |
| `effective_from`      | date nullable |                                       |
| `effective_to`        | date nullable |                                       |
| `retrieved_at`        | timestamptz   |                                       |
| `content_hash`        | text nullable | if text snapshot is lawfully retained |
| `notes`               | text nullable |                                       |

Do not rely on only a mutable URL when an effective version/identifier is available.

### `rules.legal_change_candidates`

Created when scheduled/manual legal-source synchronization detects a potentially material change.

| Column                     | Type                 | Notes                                    |
| -------------------------- | -------------------- | ---------------------------------------- |
| `id`                       | uuid PK              |                                          |
| `legal_source_id`          | uuid FK              | new/current legal source record          |
| `previous_legal_source_id` | uuid nullable FK     | previous compared version                |
| `previous_hash`            | text nullable        |                                          |
| `new_hash`                 | text nullable        |                                          |
| `detected_at`              | timestamptz          |                                          |
| `effective_at`             | date nullable        |                                          |
| `status`                   | text/enum            | pending/reviewed/accepted/no_rule_change |
| `review_notes`             | text nullable        | human/admin notes                        |
| `reviewed_by`              | uuid nullable        | admin                                    |
| `reviewed_at`              | timestamptz nullable |                                          |

Detection does not equal legal interpretation. This table cannot itself activate a production rule.

## 10. Rules

### `rules.rule_definitions`

| Column        | Type        | Notes                |
| ------------- | ----------- | -------------------- |
| `id`          | uuid PK     |                      |
| `code`        | text UNIQUE | stable semantic code |
| `title`       | text        |                      |
| `category`    | text        |                      |
| `description` | text        |                      |
| `created_at`  | timestamptz |                      |

### `rules.rule_versions`

| Column               | Type                 | Notes                                   |
| -------------------- | -------------------- | --------------------------------------- |
| `id`                 | uuid PK              | immutable version record                |
| `rule_definition_id` | uuid FK              |                                         |
| `version`            | integer              | unique per definition                   |
| `implementation_key` | text                 | maps to deterministic evaluator version |
| `status`             | enum                 | draft/verified/retired                  |
| `effective_from`     | date nullable        | legal applicability                     |
| `effective_to`       | date nullable        |                                         |
| `verified_at`        | timestamptz nullable |                                         |
| `verified_by`        | uuid nullable        | admin                                   |
| `created_at`         | timestamptz          |                                         |

Unique `(rule_definition_id, version)`.

A detected legal change never updates a verified row in place. Create a new rule version, test it, then verify/promote it.

### `rules.rule_version_sources`

Many-to-many between rule versions and `legal_sources`.

| Column            | Type    |
| ----------------- | ------- |
| `rule_version_id` | uuid FK |
| `legal_source_id` | uuid FK |
| `relationship`    | text    |

Composite PK.

## 11. Analysis snapshots

### `analysis.analyses`

| Column                     | Type                 | Notes                                                |
| -------------------------- | -------------------- | ---------------------------------------------------- |
| `id`                       | uuid PK              |                                                      |
| `project_id`               | uuid nullable        | guest mode may be future                             |
| `proposal_id`              | uuid FK              | exact proposal version                               |
| `parcel_snapshot_id`       | uuid FK              | exact parcel snapshot                                |
| `data_release_id`          | uuid FK              | exact promoted source composition                    |
| `requested_by`             | uuid nullable        |                                                      |
| `status`                   | enum                 | queued/preparing/evaluating/completed/partial/failed |
| `analysis_profile_version` | text                 | required source/check set                            |
| `engine_version`           | text                 |                                                      |
| `input_hash`               | text                 | deterministic request snapshot hash                  |
| `source_completeness`      | jsonb                | structured category freshness/completeness statuses  |
| `started_at`               | timestamptz          |                                                      |
| `completed_at`             | timestamptz nullable |                                                      |
| `created_at`               | timestamptz          |                                                      |

Completed rows must not have material content overwritten.

The `data_release_id` cannot be switched after completion. Reanalysis creates another row.

### `analysis.analysis_source_versions`

Optional but recommended explicit denormalized provenance for fast audit/reproducibility in addition to `data_release_id`.

| Column                      | Type    |
| --------------------------- | ------- |
| `analysis_id`               | uuid FK |
| `source_id`                 | text FK |
| `source_dataset_version_id` | uuid FK |

Composite PK `(analysis_id, source_id)`.

### `analysis.analysis_rule_versions`

Exact rule set selected for analysis.

| Column            | Type    |
| ----------------- | ------- |
| `analysis_id`     | uuid FK |
| `rule_version_id` | uuid FK |

Composite PK.

### `analysis.findings`

| Column               | Type          | Notes                                                   |
| -------------------- | ------------- | ------------------------------------------------------- |
| `id`                 | uuid PK       |                                                         |
| `analysis_id`        | uuid FK       |                                                         |
| `rule_version_id`    | uuid nullable | null only for clearly typed non-rule technical findings |
| `code`               | text          | stable finding code                                     |
| `category`           | text          |                                                         |
| `state`              | enum          | clear/condition/conflict/unknown                        |
| `severity`           | enum/text     | separate from state                                     |
| `title_key`          | text          | UI/template localization key                            |
| `structured_details` | jsonb         | bounded/validated                                       |
| `next_action_code`   | text nullable | structured action                                       |
| `created_at`         | timestamptz   |                                                         |

Critical relationships must not exist only in `structured_details`.

### `analysis.finding_evidence`

Use explicit typed provenance.

| Column                      | Type                             | Notes                                            |
| --------------------------- | -------------------------------- | ------------------------------------------------ |
| `id`                        | uuid PK                          |                                                  |
| `finding_id`                | uuid FK                          |                                                  |
| `evidence_type`             | enum                             | parcel/constraint/planning/source/legal/geometry |
| `parcel_snapshot_id`        | uuid nullable                    |                                                  |
| `constraint_snapshot_id`    | uuid nullable                    |                                                  |
| `planning_snapshot_id`      | uuid nullable                    |                                                  |
| `legal_source_id`           | uuid nullable                    |                                                  |
| `source_sync_run_id`        | uuid nullable                    |                                                  |
| `source_dataset_version_id` | uuid nullable                    | direct provenance where useful                   |
| `evidence_geometry`         | geometry(Geometry,3301) nullable | derived intersection/nearest segment etc.        |
| `measurement`               | jsonb nullable                   | typed schema at application boundary             |

Add a check constraint requiring the appropriate referenced object for each evidence type.

## 12. AI explanation data

Do not make AI output part of factual finding identity.

### `analysis.explanations`

| Column                    | Type                 | Notes                               |
| ------------------------- | -------------------- | ----------------------------------- |
| `id`                      | uuid PK              |                                     |
| `analysis_id`             | uuid FK              | immutable factual input             |
| `finding_id`              | uuid nullable        | whole report or one finding         |
| `language`                | text                 | `et` MVP                            |
| `provider`                | text                 | `google-gemini` initially           |
| `model`                   | text                 | deployment-selected model           |
| `prompt_template_version` | text                 |                                     |
| `input_hash`              | text                 | allows safe explanation reuse/cache |
| `content`                 | text                 | validated human explanation         |
| `status`                  | text                 | generated/fallback/rejected         |
| `created_at`              | timestamptz          |                                     |
| `expires_at`              | timestamptz nullable | retention policy if applicable      |

Raw prompts/responses should not automatically be retained forever. Store only what privacy/audit needs justify.

Repeated page loads should normally reuse the stored explanation for the same immutable analysis rather than call Gemini again.

## 13. Audit

### `private.audit_log`

| Column          | Type          |
| --------------- | ------------- |
| `id`            | uuid PK       |
| `actor_user_id` | uuid nullable |
| `actor_type`    | text          |
| `action`        | text          |
| `target_type`   | text          |
| `target_id`     | text nullable |
| `safe_metadata` | jsonb         |
| `created_at`    | timestamptz   |

Audit examples:

- rule version verified;
- source enabled/disabled;
- manual source refresh triggered;
- source dataset version promoted/rejected;
- composite data release promoted;
- legal change candidate reviewed;
- admin role changed;
- analysis manually invalidated;
- retention/admin action.

Never log credentials or auth tokens.

## 14. Idempotency and sync locking

### `private.idempotency_keys`

For expensive analysis orchestration where needed:

- scope/user;
- key;
- request hash;
- result analysis ID;
- created/expires timestamps.

Same idempotency key with different request hash must be rejected.

### Source synchronization

Scheduled source sync also requires idempotency and overlap protection.

Use one or both of:

- unique source-period/version idempotency keys;
- PostgreSQL advisory locks;
- explicit lease table with owner/expiry if better operationally.

A duplicate scheduled invocation must not create duplicate promoted versions or conflicting releases.

## 15. RLS/exposure matrix

| Resource                     |               anon |                authenticated owner | admin/server path |
| ---------------------------- | -----------------: | ---------------------------------: | ----------------: |
| profiles                     |                 no |                                own |               yes |
| projects                     |                 no |                           own CRUD |               yes |
| proposals                    |                 no |                    own via project |               yes |
| analysis read model          |  no/limited future |                                own |               yes |
| geo source versions          |          no direct |                          no direct |            server |
| rules                        | no direct mutation | read only if intentionally exposed |            server |
| source definitions/sync runs |                 no |                                 no |      server/admin |
| data releases                | no direct mutation |     read metadata only if explicit |      server/admin |
| legal change candidates      |                 no |                                 no |      server/admin |
| audit                        |                 no |                                 no |      server/admin |

Public government data being public does **not** mean internal normalized/version tables should be publicly writable/readable through Supabase Data API.

## 16. Migration rules

Every migration:

- ordered/timestamped;
- runs against empty database;
- includes extensions/schemas before dependent objects;
- enables RLS explicitly;
- adds policies/grants deliberately;
- adds indexes;
- is committed before deployment;
- is never edited after production application; fixes are forward migrations.

Source-sync tables, cron jobs/functions and release promotion constraints must be reproducible from migrations/configuration rather than manually existing only in a production dashboard.

## 17. Retention

Retention values must be finalized before public production.

Separate policies for:

- user projects (until deletion/account retention policy);
- immutable analyses (user-controlled history with deletion obligations);
- normalized source dataset history;
- source sync diagnostics;
- raw provider downloads;
- data release metadata;
- audit logs;
- AI explanation/provider metadata;
- uploaded documents.

Rules:

- do not delete source dataset/rule versions still referenced by completed analyses unless an archival mechanism preserves exact reproducibility;
- raw source payloads may use shorter retention when hashes + normalized facts provide sufficient permitted provenance;
- source terms/privacy rules always override convenience.

See `docs/DATA_REFRESH_AND_VERSIONING.md`, `SECURITY.md` and `docs/LEGAL_AND_COMPLIANCE.md`.
