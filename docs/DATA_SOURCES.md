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

### In-AKS — integrated address search

Official In-AKS service page (replaced In-ADS on 27 April 2026):

- https://geoportaal.maaruum.ee/est/teenused/integreeritav-aadressiotsing-in-ads-p504.html

Official change notice:

- https://geoportaal.maaruum.ee/est/teenused/in-ads-in-aks/nb-muudatused-in-adsis-p1038.html

#### Locked integration contract (KT-031)

**Production endpoints:**

- Gazetteer API: `https://aks.geoportaal.ee/inaks/inaadress/gazetteer/`
- Base service: `https://aks.geoportaal.ee/inaks/`

**Test endpoints:**

- Gazetteer API: `https://aks-test.geoportaal.ee/inaks/inaadress/gazetteer/`
- Base service: `https://aks-test.geoportaal.ee/inaks/`

**Endpoint precedence note:**

The official MaRu documents currently disagree on these paths. The newer MaRu change notice (last modified 18 May 2026) defines the production service as `aks.geoportaal.ee/inaks/` and the Gazetteer under `/inaks/inaadress/gazetteer/`, which matches this contract and the current official test sample. The In-AKS usage-terms PDF v1.2 dated 24 April 2026 still contains older `/aks/inaks/` work/test URLs. This contract follows the 18 May change notice and live service; the stale paths in the 24 April PDF are preserved only for rate/legal rules and do not override the working endpoints above.

**Supported query parameters:**

- `address` — free-text address search query
- `adrid` — exact address version identifier lookup (`adr_id` from In-AKS response; not the stable object identifier)

**Cache defaults by query type:**

- Free-text `address` queries: **1 hour** Edge Function cache.
- Exact `adrid` lookup: **24 hours** Edge Function cache.
- Negative / empty results: **5 minutes** Edge Function cache.
- Rationale: In-AKS data updates nightly (`üks kord ööpäevas` per official documentation). Shorter TTL for negative results prevents stale "not found" states from persisting after upstream corrections.

**Response format:** JSON. The gazetteer returns an object with an `addresses` array and a `host` field. Each address object contains the fields documented in `src/lib/inaks-adapter/types.ts`.

**Key object type codes (`liik`):**

- `1` — `EHAK` (administrative unit)
- `2` — `TANAV` (street)
- `B` — `VAIKEKOHT` (small place; distinct from POI data in `poid` / `poidDetail`)
- `4` — `KATASTRIYKSUS` (cadastral unit)
- `E` — `EHITISHOONE` (building)

**Legacy/manual discrepancy — `liik=3` / `EHITIS`:**

The official In-AKS developer manual v3.3.0 section 7.2.15 lists Gazetteer `liik` values as `1, 2, B, 4, E`, but the same manual contains response examples with `liik: "3"` and `liikVal: "EHITIS"`. The committed raw fixtures captured from both production (`aks.geoportaal.ee`) and test (`aks-test.geoportaal.ee`) endpoints on 2026-08-19 only emit `liik: "E"` / `EHITISHOONE` for buildings. The parser accepts only the observed live contract (`1, 2, B, 4, E`). The `3/EHITIS` examples are treated as stale/manual legacy examples. If `3/EHITIS` reappears in production, it must be resolved via a controlled rule promotion rather than silent acceptance.

**Coordinate systems in response:**

- `viitepunkt_x` / `viitepunkt_y` — reference point in **EPSG:3301 (L-EST97)**
- `viitepunkt_l` / `viitepunkt_b` — reference point in **EPSG:4326 (WGS84)**
- `boundingbox` — bounding box in EPSG:3301
- `g_boundingbox` — bounding box in WGS84

**Stable identifiers:**

- `adr_id` — unique address key / address-version identifier (not the stable object identifier)
- `ads_oid` — **stable In-AKS object identifier** (source-scoped; used as canonical result `id` and `provenance.sourceObjectId`)
- `adob_id` — address-object version identifier
- `tunnus` — object ID (for `liik=4` this is the Estonian cadastral identifier)

**Points of interest (`poid`):**

- `poid` is the list of points of interest (Huviobjektid) associated with the address, **not** the data source authority.
- Provider authority is fixed from integration source metadata: **Maa- ja Ruumiamet**.

**Terms and attribution:**

- Service is free to use.
- When using the In-AKS container solution, notify Maaruum.ee at `inads.abi@maaruum.ee`.
- Attribution text: **Maa- ja Ruumiamet**.
- Source ID in Krunditark: `maru.inaks`.
- Preserve source attribution in map/report UI.

#### Client vs Edge proxy decision

**Decision:** In-AKS calls must go through a Supabase Edge Function proxy. Direct browser calls to `aks.geoportaal.ee` are not permitted.

Rationale:

- SSRF-safe allow-list enforcement;
- rate limiting per user/IP;
- CORS handling without exposing browser credentials;
- server-side cache control (short TTL);
- request/response logging for observability;
- centralized timeout/retry configuration.

The Edge Function acts as the only permitted client for official In-AKS requests. The frontend calls Krunditark-owned endpoints only.

#### Rate and cache policy

Source class: **Class C — Interactive official lookup**.

**Cache defaults:**

- Free-text `address` queries: **1 hour** Edge Function cache.
- Exact `adrid` lookup: **24 hours** Edge Function cache.
- Negative / empty results: **5 minutes** Edge Function cache.
- **Rationale:** In-AKS data updates nightly (`üks kord ööpäevas` per official documentation). Shorter TTL for negative results prevents stale "not found" states from persisting after upstream corrections.

**Cache-key isolation:**

- Cache keys must include `{environment}:{contractVersion}:{queryType}:{queryHash}:{filtersHash}`.
- `queryHash` must be a non-reversible hash (e.g., SHA-256 or HMAC) of the normalized query. The actual hashing implementation is deferred to KT-032; KT-031 locks only the policy that raw queries must not appear in cache keys.
- Production (`aks.geoportaal.ee`) and test (`aks-test.geoportaal.ee`) entries must never share cache keys.
- Contract version changes must invalidate prior cache namespaces.

**Upstream rate limits (In-AKS usage terms v1.2 section 2.3):**

- Maximum **5 000 requests per 10 minutes** per user / per IP address.
- Maximum **2 500 requests per 10 minutes** for traffic originating from IP addresses outside Estonia.
- Higher volumes require prior agreement with the service owner.

**Edge Function enforcement:**

- **Application-level per-user/IP limiter** for abuse protection.
- **Upstream/global egress budget** set below the applicable In-AKS ceiling, with headroom for concurrency and retries.
- If Edge egress country is not guaranteed, default to the more conservative **2 500 requests per 10 minutes** ceiling until egress geography is confirmed.
- The proxy must return `429` with a safe retry interval when either limit is exceeded.

**Do not** replicate In-AKS into a monthly national snapshot. The service is specifically designed for interactive lookup.

**Do not** log full search queries long-term.

Selected address/object identifiers may be stored with the user's project parcel resolution.

#### Ambiguous address-to-parcel behavior

One address query can return multiple results with different `liik` values. Distinct results may share the same `adr_id` (address-version identifier) but have different `ads_oid` object identifiers. The live test response for `adrid=2105921` returned both a building (`liik=E`, `ads_oid=ME01087725`) and a cadastral unit (`liik=4`, `ads_oid=CU00473339`) for the same street address.

**Contract rules:**

- Never silently choose a single parcel when multiple object types are returned.
- Use `ads_oid` as the canonical result `id` and provenance `sourceObjectId`; retain `adr_id` separately as `addressId`.
- Return all candidates to the client with their canonical `id` (backed by In-AKS `ads_oid`), `objectType`, `cadastralId` (when applicable), and `coordinates`.
- The client must present candidates explicitly and require user confirmation.
- Use the typed error `PARCEL_SELECTION_AMBIGUOUS` when resolution cannot proceed without explicit selection.
- A selected project does not prove parcel ownership.

#### Non-current object policy

The In-AKS provider contract defines object status (`olek`) as a finite set:

- `K` — current; normal selectable candidate for parcel resolution.
- `O` — pending; may be displayed with a clear pending state, but is not silently selected. Requires an explicit product decision before parcel resolution uses it.
- `V` — obsolete version; historical, not selectable for current parcel resolution.
- `T` — cancelled; not selectable for current parcel resolution.

**Downstream rules:**

- Non-`K` results surface a `NON_CURRENT_OBJECT` warning in the parser result.
- The address-search/parcel-resolution layer (KT-032) must respect this policy and not auto-select non-`K` candidates.
- The exact UI treatment of `O`/`V`/`T` is a product decision, but the parser contract must preserve the status and warning deterministically.

#### Adapter status

**KT-031 locked — contract research and normalizer implemented.**

- Production/test endpoints documented.
- Response fields/object identifiers locked in `src/lib/inaks-adapter/types.ts`.
- Object identity uses `ads_oid` (not `adr_id`) for canonical `id` and `sourceObjectId`.
- `poid` treated as POI data; source authority fixed as `Maa- ja Ruumiamet`.
- Normalizer and deterministic fixtures implemented in `src/lib/inaks-adapter/normalizer.test.ts`.
- Raw upstream fixtures captured from both production and test endpoints (`adrid=2105921`, 2026-08-19) with metadata.
- Terms/attribution documented above.
- Client vs Edge proxy decision: Edge Function only.
- Rate/cache policy: short-lived cache (Class C) with upstream limits enforced.
- Ambiguous behavior: explicit user selection required.
- Canonical cadastral-ID validation reused from `src/domain/parcel`.
- Coordinate domain validation enforces WGS84 lon/lat bounds and Estonia EPSG:3301 bounds.
- Timestamp validation rejects impossible calendar dates and invalid UTC offsets.
- `poid` validated as optional string array; non-array or non-string elements produce typed errors.

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
