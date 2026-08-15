# Database Schema — Krunditark

This document defines the intended PostgreSQL/PostGIS data model. Exact migration syntax may evolve, but relationships, provenance and security semantics are requirements.

## 1. General conventions

- PostgreSQL through Supabase.
- PostGIS enabled by migration.
- UUID primary keys for application entities unless an authoritative source identifier is the natural immutable key inside a source-scoped table.
- `timestamptz` for timestamps.
- Geometry SRID always constrained/documented.
- GiST indexes on spatial query columns.
- Foreign-key indexes for common joins.
- RLS on all client-accessible user tables.
- Internal schemas are not exposed through Data API unless explicitly approved.
- Completed analyses are immutable snapshots from the application perspective.

## 2. Logical schemas

Suggested:

```text
public    user-facing account/project resources
geo       normalized official spatial source data/cache
rules     rule definitions, versions, legal references
analysis  analysis snapshots, findings, evidence
private   connector runs, audit and internal operational records
```

If Supabase exposure configuration makes another layout safer, preserve the logical boundaries.

## 3. Identity

### `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK/FK auth.users | same as auth user |
| `display_name` | text nullable | optional |
| `role` | text/enum | `user`, `admin`; cannot be client-elevated |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS:

- authenticated user may read own profile;
- authenticated user may update explicitly safe own fields;
- role cannot be updated through ordinary client policy;
- admin changes only server-side.

## 4. Projects and proposals

### `public.projects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK auth.users | owner |
| `name` | text | user label |
| `cadastral_id` | text | selected parcel, not ownership proof |
| `current_parcel_snapshot_id` | uuid nullable | latest selected authoritative snapshot |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `archived_at` | timestamptz nullable | optional soft archive |

Indexes:

- `(user_id, updated_at desc)`;
- cadastral ID for own-project filters if useful.

RLS:

- owner CRUD only;
- admin access through verified server path only.

### `public.project_proposals`

Version proposals instead of silently changing geometry after analyses exist.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `version` | integer | unique per project |
| `structure_type` | text/enum | supported categories |
| `intended_use` | text nullable | |
| `footprint` | geometry(Polygon,3301) | canonical server geometry |
| `footprint_area_m2` | numeric | server-calculated |
| `height_m` | numeric nullable | |
| `storeys` | integer nullable | |
| `width_m` | numeric nullable | convenience |
| `length_m` | numeric nullable | convenience |
| `orientation_deg` | numeric nullable | normalized |
| `user_notes` | text nullable | limited length |
| `created_at` | timestamptz | |
| `superseded_at` | timestamptz nullable | |

Constraints:

- valid polygon;
- positive sizes;
- sensible maximum limits to prevent resource abuse;
- unique `(project_id, version)`.

GiST index on `footprint` if proposal-spatial queries justify it.

## 5. Official source registry

### `private.source_definitions`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | stable code e.g. `maru.cadastre.wfs` |
| `name` | text | |
| `authority` | text | |
| `source_type` | text | WFS/API/download/manual-law |
| `base_url` | text | official |
| `terms_url` | text nullable | |
| `attribution_text` | text nullable | |
| `enabled` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `private.source_fetch_runs`

Represents one external retrieval attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | text FK | |
| `request_key` | text | normalized safe query identifier/hash |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz nullable | |
| `status` | enum | success/empty/timeout/unavailable/invalid/rate_limited |
| `http_status` | integer nullable | |
| `payload_sha256` | text nullable | provenance/dedupe |
| `source_version` | text nullable | source-provided |
| `source_updated_at` | timestamptz nullable | source-provided |
| `normalizer_version` | text | |
| `error_code` | text nullable | safe typed code |
| `safe_metadata` | jsonb | never secrets/raw auth |

A successful zero-feature response uses `status=empty`, not error.

## 6. Parcel snapshots

### `geo.parcel_snapshots`

The same cadastral unit can change over time. Analyses reference a snapshot.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `cadastral_id` | text | indexed |
| `source_fetch_run_id` | uuid FK | |
| `source_object_id` | text nullable | |
| `geometry` | geometry(MultiPolygon,3301) or Polygon policy | authoritative normalized geometry |
| `area_m2_source` | numeric nullable | source-reported |
| `area_m2_geometry` | numeric | computed |
| `address_text` | text nullable | |
| `land_use_data` | jsonb | only normalized noncritical extras initially |
| `source_effective_at` | timestamptz nullable | |
| `retrieved_at` | timestamptz | |
| `normalizer_version` | text | |

Critical facts used by rules should graduate from generic JSON into typed columns/tables when required.

GiST index on `geometry`; B-tree on `(cadastral_id, retrieved_at desc)`.

## 7. Normalized constraints

### `geo.constraint_snapshots`

A generic normalized representation for spatial constraints while retaining source-specific detail.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_fetch_run_id` | uuid FK | |
| `source_object_id` | text | source-scoped ID |
| `category` | text | e.g. cadastral_restriction/environment/heritage/road |
| `subcategory` | text | controlled source/domain mapping |
| `name` | text nullable | |
| `geometry` | geometry(Geometry,3301) | point/line/polygon as normalized |
| `impact_geometry` | geometry(Geometry,3301) nullable | authoritative zone if separate |
| `source_attributes` | jsonb | noncritical retained data |
| `source_effective_from` | timestamptz nullable | |
| `source_effective_to` | timestamptz nullable | |
| `retrieved_at` | timestamptz | |
| `normalizer_version` | text | |

Unique/dedupe key may include source ID, source object ID, source version/payload hash.

GiST indexes on geometry columns.

### `geo.planning_snapshots`

Keep planning concepts typed rather than forcing all into generic constraint rows.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_fetch_run_id` | uuid FK | |
| `source_plan_id` | text | |
| `plan_type` | text | |
| `status` | text nullable | source-derived |
| `title` | text | |
| `authority_name` | text nullable | |
| `geometry` | geometry(MultiPolygon,3301) nullable | |
| `official_url` | text nullable | |
| `established_at` | date/timestamptz nullable | |
| `source_attributes` | jsonb | |
| `retrieved_at` | timestamptz | |

Important semantic rule: intersection with plan geometry does not prove compliance with all textual plan provisions.

## 8. Legal/source references

### `rules.legal_sources`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `authority` | text | usually official publisher/authority |
| `title` | text | |
| `official_url` | text | |
| `document_identifier` | text nullable | act/publication ID |
| `section_reference` | text nullable | section/annex etc. |
| `effective_from` | date nullable | |
| `effective_to` | date nullable | |
| `retrieved_at` | timestamptz | |
| `content_hash` | text nullable | if text snapshot is lawfully retained |
| `notes` | text nullable | |

Do not rely on only a mutable URL when an effective version/identifier is available.

## 9. Rules

### `rules.rule_definitions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text UNIQUE | stable semantic code |
| `title` | text | |
| `category` | text | |
| `description` | text | |
| `created_at` | timestamptz | |

### `rules.rule_versions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | immutable version record |
| `rule_definition_id` | uuid FK | |
| `version` | integer | unique per definition |
| `implementation_key` | text | maps to deterministic evaluator version |
| `status` | enum | draft/verified/retired |
| `effective_from` | date nullable | legal applicability |
| `effective_to` | date nullable | |
| `verified_at` | timestamptz nullable | |
| `verified_by` | uuid nullable | admin |
| `created_at` | timestamptz | |

Unique `(rule_definition_id, version)`.

### `rules.rule_version_sources`

Many-to-many between rule versions and `legal_sources`.

| Column | Type |
|---|---|
| `rule_version_id` | uuid FK |
| `legal_source_id` | uuid FK |
| `relationship` | text |

Composite PK.

## 10. Analysis snapshots

### `analysis.analyses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid nullable | guest mode may be future |
| `proposal_id` | uuid FK | exact proposal version |
| `parcel_snapshot_id` | uuid FK | exact parcel snapshot |
| `requested_by` | uuid nullable | |
| `status` | enum | queued/collecting/evaluating/completed/partial/failed |
| `analysis_profile_version` | text | required source/check set |
| `engine_version` | text | |
| `input_hash` | text | deterministic request snapshot hash |
| `source_completeness` | jsonb | structured category statuses |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz nullable | |
| `created_at` | timestamptz | |

Completed rows must not have material content overwritten.

### `analysis.analysis_rule_versions`

Exact rule set selected for analysis.

| Column | Type |
|---|---|
| `analysis_id` | uuid FK |
| `rule_version_id` | uuid FK |

Composite PK.

### `analysis.findings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `analysis_id` | uuid FK | |
| `rule_version_id` | uuid nullable | null only for clearly typed non-rule technical findings |
| `code` | text | stable finding code |
| `category` | text | |
| `state` | enum | clear/condition/conflict/unknown |
| `severity` | enum/text | separate from state |
| `title_key` | text | UI/template localization key |
| `structured_details` | jsonb | bounded/validated |
| `next_action_code` | text nullable | structured action |
| `created_at` | timestamptz | |

Critical relationships must not exist only in `structured_details`.

### `analysis.finding_evidence`

Use explicit typed provenance.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `finding_id` | uuid FK | |
| `evidence_type` | enum | parcel/constraint/planning/source/legal/geometry |
| `parcel_snapshot_id` | uuid nullable | |
| `constraint_snapshot_id` | uuid nullable | |
| `planning_snapshot_id` | uuid nullable | |
| `legal_source_id` | uuid nullable | |
| `source_fetch_run_id` | uuid nullable | |
| `evidence_geometry` | geometry(Geometry,3301) nullable | derived intersection/nearest segment etc. |
| `measurement` | jsonb nullable | typed schema at application boundary |

Add a check constraint requiring the appropriate referenced object for each evidence type.

## 11. AI explanation data

Do not make AI output part of factual finding identity.

### `analysis.explanations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `analysis_id` | uuid FK | |
| `finding_id` | uuid nullable | whole report or one finding |
| `language` | text | `et` MVP |
| `provider` | text | |
| `model` | text | |
| `prompt_template_version` | text | |
| `content` | text | validated human explanation |
| `status` | text | generated/fallback/rejected |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz nullable | retention policy if applicable |

Raw prompts/responses should not automatically be retained forever. Store only what privacy/audit needs justify.

## 12. Audit

### `private.audit_log`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `actor_user_id` | uuid nullable |
| `actor_type` | text |
| `action` | text |
| `target_type` | text |
| `target_id` | text nullable |
| `safe_metadata` | jsonb |
| `created_at` | timestamptz |

Audit examples:

- rule version verified;
- source enabled/disabled;
- admin role changed;
- analysis manually invalidated;
- retention/admin action.

Never log credentials or auth tokens.

## 13. Idempotency

### `private.idempotency_keys`

For expensive analysis orchestration where needed:

- scope/user;
- key;
- request hash;
- result analysis ID;
- created/expires timestamps.

Same idempotency key with different request hash must be rejected.

## 14. RLS matrix

| Resource | anon | authenticated owner | admin server path |
|---|---:|---:|---:|
| profiles | no | own | yes |
| projects | no | own CRUD | yes |
| proposals | no | own via project | yes |
| analysis read model | no/limited future | own | yes |
| geo source cache | no direct | no direct | server |
| rules | no direct mutation | read only if intentionally exposed | server |
| private source runs | no | no | server |
| audit | no | no | server/admin |

Public government data being public does **not** mean internal cache tables should be publicly writable/readable through Supabase Data API.

## 15. Migration rules

Every migration:

- ordered/timestamped;
- runs against empty database;
- includes extensions/schemas before dependent objects;
- enables RLS explicitly;
- adds policies/grants deliberately;
- adds indexes;
- is committed before deployment;
- is never edited after production application; fixes are forward migrations.

## 16. Retention

Retention values must be finalized before public production.

Separate policies for:

- user projects (until deletion/account retention policy);
- immutable analyses (user-controlled history with deletion obligations);
- external source cache (source-specific freshness/terms);
- source fetch diagnostics;
- audit logs;
- AI explanation/provider metadata;
- uploaded documents.

See `SECURITY_PRIVACY.md`.
