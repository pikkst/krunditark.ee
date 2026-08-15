# Official Data Sources — Krunditark

Last reviewed for project foundation: **2026-08-15**.

This file is a source registry, not a guarantee that every endpoint is already implemented. Each source must pass technical, semantic, licensing/terms and freshness review before being promoted to a production analysis dependency.

## 1. Source hierarchy

Prefer, in order:

1. official machine-readable API/WFS/download from the responsible authority;
2. official registry or official map service;
3. official legal publication;
4. official municipal document/system;
5. only then a secondary source for non-authoritative explanatory context.

Never use a secondary blog/forum/company site as the authoritative basis for a legal/spatial finding when an official source exists.

## 2. Refresh architecture

Krunditark does **not** normally retrieve all official source data during each user analysis.

The default source lifecycle is:

```text
Official source
   -> scheduled server-side sync
   -> staging + validation
   -> normalized versioned dataset
   -> change detection
   -> candidate source version
   -> verified/promoted data release
   -> user analysis from Postgres/PostGIS
```

Baseline policy for replicated datasets:

- full reconciliation **monthly**;
- source-specific manual/emergency refresh available;
- no Gemini usage required for synchronization;
- previous known-good version remains active when a refresh fails;
- a completed analysis records the exact data release/source versions used.

See `docs/DATA_REFRESH_AND_VERSIONING.md` and ADR 0005.

### Allowed refresh-policy values

Use one explicitly registered policy per source/layer:

- `monthly_snapshot` — full replicated snapshot/reconciliation, normally monthly;
- `weekly_metadata_check` — lightweight source-version/schema metadata check, not a full reimport;
- `manual_verified` — source changes are detected but production interpretation/promotion requires review;
- `live_lookup` — request-time lookup only when genuinely required;
- `no_replication` — source cannot/should not be persisted locally beyond permitted metadata/evidence.

`live_lookup` is an exception, not the default.

## 3. Maa- ja Ruumiamet — cadastral data

Authority: **Maa- ja Ruumiamet (MaRu)**

Official overview:

- https://geoportaal.maaruum.ee/est/ruumiandmed/maakatastri-andmed-p117.html

Official public spatial services overview:

- https://geoportaal.maaruum.ee/est/teenused/wms-wfs-wcs-teenused-p65.html

Relevant capabilities include cadastral parcel WMS/WFS and other national spatial services.

### Intended Krunditark use

- cadastral identifier resolution;
- parcel geometry;
- parcel address/basic supported metadata;
- authoritative geometry source for project parcel snapshot.

### Planned refresh policy

`monthly_snapshot` for the normalized parcel dataset when bulk/efficient replication is technically and contractually suitable.

During initial adapter development, an explicitly bounded server-side lookup may be used before the national snapshot pipeline is operational, but production architecture should converge on versioned replicated data rather than per-analysis WFS fan-out.

Parcel data freshness must be shown in analyses. A selected project does not prove parcel ownership.

### Adapter status

**MVP required — implement and verify exact WFS service/layer names during KT-031.**

Do not hardcode a layer name based only on documentation text. Retrieve capabilities in a controlled research/integration step and add deterministic fixture tests.

### Attribution

MaRu public service guidance requires source attribution in products/printouts. Preserve source attribution in map/report UI.

## 4. Maa- ja Ruumiamet — cadastral restrictions

Official page:

- https://geoportaal.maaruum.ee/est/ruumiandmed/kitsenduste-andmed-p32.html

The official page exposes restriction-zone WMS/WFS access and explains that the restriction map represents objects and impact areas that cause land-use restrictions.

### Intended Krunditark use

- retrieve supported registered restriction geometries;
- normalize restriction category/subcategory;
- spatially compare proposal footprint with impact areas;
- show official source/provenance.

### Planned refresh policy

`monthly_snapshot`.

Restriction geometries are a core candidate for local PostGIS replication because repeated request-time national WFS calls would directly affect latency and availability.

A failed monthly refresh must retain the previous verified restriction dataset and mark freshness accordingly. An incomplete fetch must never be interpreted as deletion of missing restrictions.

### Important limitation

Public map views may omit some protected nature information. The MaRu data FAQ notes that Category I and II protected objects are not shown in the public view and may be visible to the landowner after authentication.

Official FAQ:

- https://geoportaal.maaruum.ee/est/abi-ja-juhised/andmed/

Therefore:

- absence from public data must not be interpreted as proof that no non-public restriction/protected object exists;
- the relevant analysis category may require an `unknown`/manual-verification notice.

## 5. PLANIS — planning data

Official planning system information:

- https://planeerimine.ee/digi/menetluse-infosysteem/
- https://planeerimine.ee/juhendid-ja-uuringud/planeeringute-andmekogu-planis-juhendid/

Official WMS/WFS guidance:

- https://planeerimine.ee/juhendid-ja-uuringud/planeeringute-andmekogu-planis-juhendid/planeeringute-andmekogu-wms-ja-wfs-teenused/

As of 2026, PLANIS has replaced the previous PLANK workflow for current planning-system operation. Planning guidance states that PLANIS provides access to established planning data through WMS/WFS services.

Published WMS endpoint in official guidance:

```text
https://planeeringud.ee/plank/wms
```

The exact WFS URL/layers must be read from current official capabilities/guidance during adapter implementation rather than guessed.

### Intended Krunditark use

- identify planning areas overlapping the selected parcel/proposal;
- capture plan ID/type/status/title/authority;
- link to official plan material where available;
- inform completeness state.

### Planned refresh policy

`monthly_snapshot` for supported structured planning records/geometries.

If PLANIS exposes inexpensive update/version metadata, a future `weekly_metadata_check` may flag an earlier manual refresh without doing a full weekly import.

Textual plan documents require separate parsing/verification policy and must not be automatically interpreted as complete legal compliance merely because the plan geometry was synchronized.

### Semantic limitation

A polygon showing that a parcel is inside a detailed/general planning area does **not** prove that the proposal complies with every textual/graphical condition of the plan.

Until plan documents/structured conditions are actually parsed and verified, Krunditark must say:

- planning context detected;
- textual/detailed compliance not fully automated;
- manual plan review may still be required.

## 6. E-ehitus / Ehitisregister (EHR)

Official OpenAPI portal:

- https://swaggerui.ehr.ee/

The e-ehitus API portal currently lists multiple services including public/open-data and building-data related APIs.

### Intended future/MVP-late use

- existing building facts;
- relevant public permits/notices/proceedings where officially accessible;
- existing-building context for site analysis.

### Planned refresh policy

To be decided during KT-120 after endpoint/access/terms analysis.

Preferred outcome for stable public building facts is `monthly_snapshot` or another documented incremental synchronization strategy. Truly request-specific/current proceeding data may remain `live_lookup` if justified.

### Implementation rule

Do not scrape the EHR user interface.

KT-120 must first document:

- exact endpoint(s);
- access/auth requirements;
- rate limits/terms;
- data fields relevant to Krunditark;
- whether public vs authenticated access is allowed;
- permitted local storage/replication behavior;
- selected refresh policy.

Only then implement KT-121.

## 7. Keskkonnaportaal / EELIS

Official public GeoServer documentation:

- https://keskkonnaportaal.ee/et/avaandmed/geoserver

Official public EELIS WMS/WFS endpoint documented there:

```text
https://gsavalik.envir.ee/geoserver/eelis/ows?
```

The official page states that EELIS data can be used through WMS/WFS and provides GeoJSON/WFS examples.

### Intended Krunditark use

Selected public layers relevant to construction feasibility, for example where legally and semantically appropriate:

- protected areas;
- environmental objects/zones;
- water/environment features;
- other explicitly approved public layers.

### Planned refresh policy

`monthly_snapshot` per explicitly approved public layer where source terms and dataset size permit replication.

Each layer is versioned independently enough to identify which source version contributed to an analysis. Large unexplained record-count/geometry diffs must be quarantined instead of automatically promoted.

### Sensitive/non-public limitation

Not all environmentally sensitive information is publicly available. Krunditark must not infer absence of a protected object from public-layer absence when official systems intentionally hide data.

Each EELIS layer must be individually registered in project code/config with:

- layer name;
- category mapping;
- geometry type;
- freshness/metadata;
- legal/product meaning;
- test fixture;
- refresh policy;
- replication/retention decision.

Do not ingest “all layers” blindly.

## 8. Cultural heritage / Muinsuskaitse

Official authority:

- https://www.muinsuskaitseamet.ee/

Official map integration description from MaRu:

- https://geoportaal.maaruum.ee/index.php?fatlayerid=kyRegosa&lang_id=1&page_id=144&plugin_act=getfatlayerid

The map application is created in cooperation with Muinsuskaitseamet and linked to the national cultural-monuments register.

The map-application page currently states that a public WFS URL is not available for that application entry. Separate MaRu guidance also discusses cultural-heritage WFS layers in some service contexts, so the exact currently supported machine-readable endpoint/layer must be verified during KT-053 rather than assumed.

Official Muinsuskaitse application guidance:

- https://www.muinsuskaitseamet.ee/teatised-taotlused-load-ja-toetused/kuidas-taotleda

### Intended Krunditark use

- monument/protection-area spatial context;
- official registry/source links;
- finding that indicates heritage review/conditions where a verified rule applies.

### Planned refresh policy

To be selected during KT-053.

Prefer `monthly_snapshot` if an official machine-readable dataset may lawfully and reliably be replicated. Otherwise use a documented controlled `live_lookup`/manual verification strategy.

### Adapter status

**Research required before production.**

Do not substitute an unofficial heritage dataset.

## 9. Transpordiamet — state roads/access

Official guidance:

- https://www.transpordiamet.ee/mahasoidud

Official guidance explains, among other things, that a new access from a state road requires Transpordiamet coordination and discusses construction in state-road protection zones.

### Intended Krunditark use

- state-road proximity/context;
- identify relevant road protection-zone/coordination context where supported by official data and verified rules;
- direct user to Transpordiamet where appropriate.

### Planned refresh policy

Select exact machine-readable road sources during KT-054. Prefer `monthly_snapshot` for stable road/protection-zone geometry and source metadata when permitted.

### Important semantic rule

A road protection zone is not automatically equivalent to an absolute building prohibition. The rule engine must encode the verified requirement/status, not simply transform every overlap into `conflict`.

### Adapter status

Exact machine-readable road datasets/layers must be documented during KT-054.

## 10. Riigi Teataja — legal source of truth

Official publication:

- https://www.riigiteataja.ee/

Key legal families expected to matter include, depending on supported rule scope:

- Ehitusseadustik (EhS) and annexes;
- Planeerimisseadus (PlanS);
- Ehitusseadustiku ja planeerimisseaduse rakendamise seadus;
- Looduskaitseseadus;
- Muinsuskaitseseadus;
- relevant water/fire/road/utility regulations;
- relevant implementing regulations;
- relevant local-government legislation/plan decisions.

### Refresh policy

Legal-source inventory/change detection uses a **monthly baseline review/sync** with `manual_verified` production semantics.

A legal source change may be synchronized and diffed automatically, but it does not automatically change a production rule.

Pipeline:

```text
monthly legal source refresh
   -> identify current/effective document version
   -> hash/diff relevant official content/metadata
   -> legal_change_candidate
   -> identify potentially affected rules
   -> admin/legal interpretation review
   -> tests + new rule version
   -> verified promotion
```

A major known legal change may trigger a manual/emergency refresh before the next monthly run.

Gemini may later summarize a detected diff for an administrator, but Gemini output cannot verify or promote a legal rule.

### Critical rule

Do not store only “current law text” and overwrite it.

A production rule must record:

- exact act/document identity;
- section/annex reference;
- effective-from/to where known;
- retrieval date;
- rule version that interpreted it.

The system must support law/rule changes without corrupting historical analyses.

## 11. Local governments (KOV)

Local authorities are unavoidable because detailed local planning and conditions may not always be completely represented as one national structured dataset.

### MVP policy

- use PLANIS/national structured data first;
- link to the responsible KOV/official plan record;
- mark textual/local requirements not automatically interpreted as `unknown`/manual review;
- do not build brittle municipality-specific scraping in the first vertical slice.

### Refresh policy

No generic national KOV scraper is approved.

A future KOV source must declare its own `monthly_snapshot`, `manual_verified`, `live_lookup` or `no_replication` policy after official endpoint/terms analysis.

### Later strategy

Introduce KOV adapters only through a documented source contract and tests. Prefer official APIs/downloads over HTML scraping.

## 12. Utilities

Potential providers/categories:

- electricity distribution;
- water/sewer operators;
- telecommunications;
- gas where relevant.

### MVP policy

Utility proximity must not be presented as guaranteed connection availability, capacity or quote.

Before integration:

- verify official/provider terms;
- verify machine-readable access;
- distinguish public map data from commercially sensitive capacity data;
- define exact output semantics;
- choose refresh/storage policy.

Static network geometry may later be suitable for scheduled snapshotting, while connection capacity/price may require `live_lookup` or user-initiated provider quote.

## 13. Source registration template

Every implemented data source/layer must have a record like:

```yaml
id: maru.cadastre.parcels
name: Maa- ja Ruumiamet cadastral parcels
authority: Maa- ja Ruumiamet
type: WFS
base_url: <configured official URL>
layer: <verified capability name>
geometry_crs: EPSG:3301
refresh_policy: monthly_snapshot
refresh_interval: P1M
freshness_warn_after: P45D
freshness_critical_after: P75D
release_blocking: true
verification_policy: automatic_quality_gates
attribution: <required text>
terms_url: <official URL>
normalizer_version: 1
semantic_scope:
  - parcel_geometry
failure_impact: critical
```

Exact thresholds are source-specific and must be intentionally chosen during implementation.

Do not leave semantic scope or refresh behavior implicit.

## 14. Provider response handling

For every source call classify:

- success with features;
- success with zero features;
- timeout;
- upstream unavailable;
- invalid payload;
- unauthorized/forbidden;
- rate limited;
- unsupported response version.

Only a complete, validated “success with zero features” may support a “no matching feature found in this supported layer” fact.

During full snapshot synchronization, incomplete pagination/chunks must never be promoted as a successful complete dataset.

## 15. Freshness

Each source gets its own freshness policy.

UI must be able to display:

- data release date;
- retrieved at;
- source updated/effective date where available;
- carried-forward status;
- stale/unknown freshness status.

Never label cached/snapshotted data “checked now” when no live refresh occurred.

The user running a new analysis today does not make a 30-day-old official snapshot one day old.

## 16. Raw-source storage

Do not automatically store every raw provider payload indefinitely.

For provenance, prefer:

- payload hash;
- source object ID;
- normalized versioned snapshot;
- source sync/retrieval run;
- source dataset version;
- selected legally permitted source excerpt/metadata.

Retain raw data only when needed for reproducibility/debugging and allowed by terms/privacy/retention policy.

Never delete normalized/source versions that remain referenced by historical analyses unless a safe archival strategy preserves reproducibility.

## 17. Source health

Operational monitoring must track:

- availability;
- response latency;
- schema changes;
- fixture/live-contract mismatch;
- last successful sync;
- next scheduled sync;
- freshness age;
- parsing errors;
- records fetched/added/changed/removed;
- abnormal diff percentage;
- current promoted source version;
- carried-forward source state;
- pending legal change candidates.

A provider schema change must fail safely to stale/unknown or keep the prior verified dataset; it must not silently produce incorrect “clear” results.

## 18. User-request behavior

A normal cadastral analysis must not trigger:

- national dataset refresh;
- legal-source web search;
- Gemini search for current law;
- repeated WFS calls for all supported sources.

It should:

1. select the latest eligible promoted Krunditark data release;
2. query normalized internal source versions;
3. run PostGIS + deterministic rules;
4. store exact release/rule provenance;
5. optionally call Gemini with the compact structured result for explanation.

This is the default production contract.
