# Data Refresh, Cache and Release Architecture — Krunditark

**Canonical refresh document.**

Last research review: **2026-08-15**

`DATA_REFRESH_AND_VERSIONING.md` is retained only as a compatibility pointer to this document.

## 1. Goal

Krunditark must not re-download every official dataset, re-read legislation or call Gemini for every user analysis.

At the same time, “refresh everything once per month” is too blunt because different official sources change at different rates and expose different change capabilities.

The production model is **source-specific snapshot/change-watch + verified release**:

```text
Official sources
      |
      +--> short-cache/live lookup where appropriate (e.g. address search)
      |
      +--> lightweight daily/weekly change watch where supported
      |
      +--> scheduled full/incremental ingestion for analytical data
      v
staging + validation + change detection
      v
versioned source dataset releases
      v
composite verified Krunditark data release
      v
local PostgreSQL/PostGIS analysis
      v
cached deterministic Ehituspass
      v
cached Gemini explanation (optional)
```

## 2. Non-negotiable user-request rule

A normal user analysis **does not fan out to all national WFS/API/legal sources**.

Normal priority:

1. compatible cached completed analysis;
2. local current verified PostGIS/data release;
3. cached normalized source object;
4. scheduled/background ingestion;
5. live source retrieval only for source-specific approved use;
6. Gemini only for uncached explanation.

Ordinary users cannot trigger national refresh jobs.

## 3. Source classes

### Class A — Heavy replicated spatial datasets

Examples, where terms/volume permit:

- cadastral restrictions;
- PLANIS planning geometry/metadata;
- selected EELIS layers;
- heritage layers;
- roads/protection geometry;
- later elevation/flood/geology generalized analytical layers.

Default:

- monthly full reconciliation **or** source-supported incremental strategy;
- versioned snapshot;
- PostGIS local query;
- source-specific freshness threshold.

### Class B — Frequently changing metadata/change feeds

Examples:

- EHR changed-building identifiers;
- legal version/effective metadata;
- source schema/capabilities metadata.

Default:

- daily or weekly inexpensive change check;
- detailed sync only when change detected;
- no Gemini;
- idempotent cursor/timestamp state.

### Class C — Interactive official lookup

Example:

- In-AKS address search.

Address autocomplete needs fresh results and the official service is specifically designed for integration. Do not mirror all address-search behavior into a monthly consumer index merely to avoid a small API lookup.

Default:

- live server/client integration as terms/architecture allow;
- bounded short cache (for example minutes/hours/24h based on final source policy);
- official result is not part of the heavy analysis release unless a selected parcel snapshot is persisted.

### Class D — Manual/verified legal interpretation

Official legal text/version may be automatically monitored, but Krunditark rule semantics require human/admin verification before activation.

### Class E — No-replication / sensitive / restricted

Where terms, privacy or source policy do not permit replication:

- keep only permitted metadata/evidence;
- use approved live/manual workflow;
- disclose incompleteness;
- never infer absence from unavailable private data.

## 4. Current source cadence matrix

These are architecture defaults and must be reviewed during each adapter implementation.

| Source/category | Retrieval strategy | Change watch | Full/incremental sync | Gemini |
|---|---|---|---|---|
| In-AKS address search | live/short cache | service-driven | no national monthly mirror required for search | never |
| MaRu cadastral parcel facts | source-specific snapshot/object cache | weekly/daily metadata if available | monthly/incremental as practical | never |
| MaRu restrictions | replicated PostGIS | optional weekly metadata/schema | monthly full/incremental | never |
| PLANIS planning | replicated/indexed | weekly metadata/change where practical | monthly + emergency | never |
| EELIS selected layers | replicated/indexed | weekly source health | monthly + emergency | never |
| Heritage | source-specific after endpoint verified | source health | monthly/incremental if permitted | never |
| State roads | source-specific | source health | monthly/incremental | never |
| EHR actual building data | object/index cache | **daily changed-after cursor** where approved | fetch changed building data incrementally; periodic reconciliation | never |
| Riigi Teataja legal sources | retained version metadata/content hash as permitted | **daily version/hash/effective check** | fetch changed acts only; periodic reconciliation | never |
| Krunditark rule set | internal versioned | triggered by legal candidate/review | manual verified promotion | never required |
| Gemini explanation | analysis-result cache | n/a | generate on cache miss | yes, explanation only |

Do not treat cadence values as legal guarantees. `source_definitions` owns final configuration.

## 5. Research basis for differentiated cadence

### In-AKS

MaRu introduced In-AKS in production on 27 April 2026 and exposes address/Gazetteer APIs. The previous official integration documentation describes address data as kept current through nightly updates.

Official:

- https://geoportaal.maaruum.ee/est/teenused/in-ads-in-aks/nb-muudatused-in-adsis-p1038.html
- https://geoportaal.maaruum.ee/est/teenused/integreeritav-aadressiotsing-in-ads-p504.html

Implication: use as an interactive lookup/short-cache service, not a once-a-month UX dependency.

### EHR

The current Buildings Actual Data API exposes `GET /v2/find/ehrcodes/dateafter`, returning up to 1000 current building codes modified after a specified time, plus current building-data endpoints.

Official:

- https://swaggerui.ehr.ee/ehitise_kehtivate_andmete_teenus

Implication: EHR synchronization can use a timestamp cursor/incremental queue instead of repeated full national retrieval.

### Riigi Teataja

Riigi Teataja provides public API search and act XML access. Its FAQ documents a changed XML API path from 1 June 2026 while general API use remains available.

Official:

- https://www.riigiteataja.ee/kkk

Implication: cheap daily legal version/hash monitoring is appropriate; a full monthly-only law check could leave a recently effective change unnoticed for too long.

### PLANIS

PLANIS provides WMS/WFS access to planning data and was introduced in 2026. Source usage/notification arrangements should be followed.

Official:

- https://planeerimine.ee/juhendid-ja-uuringud/planeeringute-andmekogu-planis-juhendid/planeeringute-andmekogu-wms-ja-wfs-teenused/

## 6. Composite data release

User analysis references a **data release**, not vague “current data”.

Conceptual manifest:

```json
{
  "dataReleaseId": "uuid",
  "releasedAt": "2026-08-01T...Z",
  "profile": "consumer-build-v1",
  "sources": {
    "cadastre": "dataset-version-...",
    "restrictions": "dataset-version-...",
    "planis": "dataset-version-...",
    "eelis": "dataset-version-...",
    "heritage": "dataset-version-...",
    "roads": "dataset-version-...",
    "ehr": "dataset/cursor-version-..."
  },
  "ruleSetManifestId": "uuid"
}
```

Once used by a completed analysis, membership is immutable.

## 7. Data-release promotion

A dataset candidate is not automatically production data merely because download succeeded.

Pipeline:

```text
fetch
 -> validate transport/schema
 -> normalize
 -> validate geometry/required fields
 -> compare prior release
 -> run integrity tests
 -> classify abnormal diff
 -> promote source dataset version
 -> assemble/promote composite data release
```

Readers never see a half-promoted source set.

## 8. Heavy spatial monthly lifecycle

For each due source:

1. create `source_sync_run`;
2. download/page source in bounded batches;
3. stage new version;
4. validate counts/schema/SRID/geometry/stable IDs;
5. compare added/changed/removed;
6. quarantine suspicious changes;
7. promote only if gates pass;
8. retain previous version needed for history;
9. update source health/freshness.

Monthly coordinator may run on the first day/off-peak, but exact schedule is infrastructure configuration.

## 9. Lightweight change-watch lifecycle

Change watch must be inexpensive and safe.

Concept:

```text
cron (daily/weekly)
 -> read source cursor/version/hash
 -> make bounded metadata/change request
 -> unchanged: record health/check only
 -> changed: enqueue source-specific sync/review
```

No LLM is required.

## 10. Legal change workflow

```text
Riigi Teataja metadata/version changed
      |
      v
legal_change_candidate
      |
      v
identify potentially affected rule codes
      |
      v
human/admin legal/domain review
      |
      v
new draft rule version
      |
      v
tests + effective dates + exact source reference
      |
      v
verified promotion
```

If a legal change may invalidate an active rule and review is pending, affected analysis profile can be degraded/flagged rather than silently using known-obsolete semantics.

## 11. EHR incremental workflow

Conceptual:

```text
last_ehr_change_cursor
 -> GET changed EHR codes after cursor
 -> enqueue changed IDs
 -> fetch current building data in bounded batches
 -> validate/normalize
 -> write new object/dataset version
 -> advance cursor only after successful committed batch
```

Requirements:

- timestamp/cursor overlap to avoid boundary loss if API semantics require;
- dedupe IDs;
- idempotent fetch/write;
- max 1000 result behavior handled by paging/window splitting if documented endpoint needs it;
- periodic reconciliation to catch missed events;
- source failures do not advance cursor incorrectly.

## 12. Interactive address cache

For In-AKS:

- query based on user-entered search string with debouncing;
- cache normalized responses briefly where terms permit;
- never log sensitive unnecessary search strings long-term;
- final selected address/object identifiers may be stored with project parcel resolution;
- service outage is not “address does not exist”.

## 13. Analysis cache

Deterministic analysis key concept:

```text
SHA-256(
  canonical proposal geometry + parameters
  + parcel snapshot ID
  + data release ID
  + rule-set manifest ID
  + analysis profile version
  + engine version
)
```

If compatible completed analysis exists:

- reuse technical result safely;
- attach project/user relationship according to privacy model;
- never leak another user's notes/metadata.

## 14. Gemini explanation cache

Key:

```text
structured-result hash
+ locale
+ prompt template version
+ configured model ID/config version
+ explanation schema version
```

Cache hit => no Gemini call.

Gemini receives only compact relevant structured findings/source metadata and approved excerpts, not national law corpora.

## 15. Failure behavior

### Sync/provider failure

- old verified source version remains active;
- failed run recorded;
- no deletion/replacement;
- alert/health degradation;
- freshness age continues increasing;
- beyond max safe age -> impacted category partial/unknown according to policy.

### Suspicious dataset diff

Examples:

- 80% of objects disappeared;
- CRS unexpectedly changed;
- IDs became null;
- geometry validity collapsed.

Action:

- quarantine candidate;
- require investigation/manual promotion depending severity;
- keep previous good release.

### Change-watch failure

Do not assume unchanged. Mark watch unhealthy and retry/alert.

## 16. Source health model

Each source exposes internally:

- last attempted sync/check;
- last successful sync/check;
- active dataset version;
- next due;
- age;
- warning/critical freshness threshold;
- schema health;
- last error;
- pending change candidate;
- release carried-forward status.

Admin dashboard aggregates these.

## 17. User-facing freshness

Ehituspass shows data basis by category, not just report date.

Example:

```text
Analüüs koostatud: 15.08.2026
Andmeväljalase: 2026-08

Katastriandmed: 01.08.2026
Planeeringud: 01.08.2026
Keskkonnaandmed: 01.08.2026
EHR hooneandmed: inkrementaalselt kontrollitud kuni 15.08.2026 04:00
Õigusallikate muutusi kontrollitud: 15.08.2026
Reeglistik: verified release 2026.08.1
```

If stale:

```text
Planeeringud: viimati edukalt uuendatud 01.07.2026 — värskendamine ebaõnnestus; andmed võivad olla muutunud.
```

## 18. Reanalysis behavior

Old reports remain unchanged.

When relevant new data/rules become active:

- mark project `newer_data_available`;
- user can rerun;
- Project Pass/Pro may receive notification;
- later compute deterministic report diff before sending “material change” alert.

## 19. Supabase scheduling

Use Supabase Cron/`pg_cron` and/or controlled scheduled Edge Function orchestration according to current platform guidance.

Pattern:

```text
cron
  -> small coordinator
      -> source job(s)
          -> bounded batch/checkpoint
```

Do not assume one Edge Function request can safely ETL every national dataset.

Configuration should be reproducible through migrations/infrastructure code where practical.

## 20. Raw-data retention

Do not retain every raw response forever by default.

Prefer:

- source object ID;
- dataset/version ID;
- retrieval/sync run;
- hash;
- normalized evidence;
- selected source excerpt/metadata where lawful/needed.

Historical analyses require sufficient immutable evidence/references to reproduce the material finding.

## 21. Storage optimization

As data grows, evaluate:

- partitioning by source/version;
- geometry generalization for map display;
- vector tiles;
- object-version delta strategy;
- archive/compressed cold evidence;
- retention of unreferenced superseded datasets;
- PostGIS indexes/statistics;
- source-level national mirror vs on-demand object cache.

Do not delete data referenced by a completed historical report without a reproducibility replacement.

## 22. Cost control

The largest optimization is architectural:

- download heavy public data once per release, not once per user;
- use local spatial indexes;
- incremental EHR/legal monitoring;
- cache completed deterministic results;
- cache explanations;
- send compact data to Gemini.

Do not optimize by reducing evidence quality or hiding stale data.

## 23. Observability

Per sync/watch:

- run ID/source;
- trigger scheduled/manual/change;
- cursor/window;
- request count/bytes;
- fetched/staged/changed/removed;
- validation metrics;
- prior/new version;
- duration/retries;
- error code;
- freshness.

AI:

- cache hit/miss;
- model/prompt version;
- provider token usage/cost if returned;
- latency/failure;
- no secrets/full private prompts in logs.

## 24. Acceptance criteria

Refresh/cache platform is production-ready when:

- each source has explicit source class/refresh policy;
- heavy spatial sync runs independently of user traffic;
- lightweight legal/EHR watches can run more frequently without Gemini;
- In-AKS-style interactive lookup is not artificially limited to monthly data;
- all candidate data is validated before promotion;
- failed/suspicious sync preserves last good release;
- composite releases are immutable;
- analyses reference exact release/rules;
- ordinary analysis does not call all official providers;
- same analysis/explanation can be cached safely;
- source freshness is visible;
- manual emergency refresh uses same validation path;
- historical reports remain reproducible.
