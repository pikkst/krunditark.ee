# ADR 0010 — Leaflet map stack and Maa- ja Ruumiamet basemap

- Status: Accepted
- Date: 2026-08-21
- Supersedes: the MapLibre-specific frontend map-engine decision in ADR 0001 and references to MapLibre in ADR 0009

## Context

Phase 4 needs a focused 2D parcel/proposal workspace, not a general consumer navigation map. The critical browser capabilities are:

- render a clean Estonia basemap;
- switch to orthophoto on demand;
- render parcel/proposal/evidence GeoJSON overlays;
- fit/zoom to selected parcel;
- handle explicit map click for parcel selection;
- drag/rotate/resize a beginner proposal footprint;
- draw/edit a polygon in advanced mode;
- preserve accessible textual equivalents;
- keep authoritative GIS calculations server/PostGIS-side.

The earlier ADR 0001 selected MapLibre GL JS before these requirements and the current Maa- ja Ruumiamet (MaRu) tiled-service contract had been reviewed in detail.

Current research reviewed on 2026-08-21:

- Leaflet official reference describes Leaflet as an open-source mobile-friendly interactive-map library and lists raster TileLayer/WMS and vector layers; stable documentation is for Leaflet 1.9.4. Leaflet 2.0 is still alpha and is not selected for Phase 4.
- MaRu explicitly documents TMS/WMS-C/WMTS basemaps as suitable for Leaflet and recommends pre-tiled services rather than browser WMS tile fan-out.
- MaRu offers `Kaart`, `Ortofoto`, `Hübriidkaart` and other tiled basemaps. `Kaart` and `Hübriidkaart` are updated monthly; orthophoto is updated on its own annual cycle.
- MaRu service terms permit commercial and non-commercial reuse with source/data-age attribution. The tiled-service guidance additionally requires use through a fixed proxy address and asks implementers to contact the map-service support address.
- Google Maps is intentionally not selected: Krunditark does not need Google POI/navigation/business layers, proprietary SDK coupling, or their additional visual noise.

Official/current references:

- https://leafletjs.com/reference.html
- https://geoportaal.maaamet.ee/est/teenused/wms-wfs-wcs-teenused/tms-wms-c-ja-wmts-teenused-p481.html
- https://geoportaal.maaamet.ee/est/teenused/wms-wfs-wcs-teenused/maa-ja-ruumiameti-kaarditeenuste-kasutustingimused-p24.html
- https://geoportaal.maaamet.ee/est/ruumiandmed/topokaardid-ja-aluskaardid/eesti-pohikaart-1-10000-p30.html

## Decision

### 1. Phase 4 browser map engine

Use **Leaflet 1.9.x stable**, pinned through the committed lockfile.

Do not use Leaflet 2.0 alpha in production Phase 4 work unless a later ADR explicitly upgrades it after stable release and compatibility testing.

Leaflet is wrapped behind Krunditark-owned map components/adapters. Domain/application code must not depend directly on Leaflet classes.

React integration may use a small owned React wrapper around the Leaflet imperative API. `react-leaflet` is not an architectural requirement and must not be introduced merely for style consistency if it complicates editor/plugin state.

### 2. Phase 4 geometry editing

Use **`@geoman-io/leaflet-geoman-free`** when KT-045/KT-046 need draw/edit/drag/rotate behavior.

Reasons:

- actively maintained;
- MIT-licensed free package;
- supports Leaflet geometry drawing/editing/drag/rotate;
- TypeScript definitions are available;
- avoids depending on paid Pro-only behavior for Phase 4 acceptance.

Phase 4 must not require Geoman Pro. If an intended interaction turns out to be Pro-only, either implement the minimum owned behavior safely or create a separate product/architecture decision; do not silently introduce a paid runtime dependency.

### 3. Basemap provider

Use **Maa- ja Ruumiamet pre-tiled map services** as the intended Phase 4 basemap provider.

User modes:

- default: `Kaart` — clean general basemap;
- optional: `Ortofoto` — aerial imagery for visual site context;
- `Hübriidkaart` is not the default because it adds visual density that competes with Krunditark parcel/proposal overlays.

Do not use Google Maps as the production basemap.

Do not use public OpenStreetMap demo tile endpoints as the Krunditark production tile provider merely because they work without credentials.

### 4. Browser CRS and MaRu tile matrix

Canonical Krunditark Parcel/Proposal/Constraint geometry remains **EPSG:3301** server-side.

The Leaflet display map may use its normal Web Mercator browser CRS (**EPSG:3857**). MaRu's Web-Mercator/GMC tiled variants are used for browser basemap rendering. Canonical parcel/proposal geometry is converted to browser-safe EPSG:4326 GeoJSON before Leaflet rendering.

Do not make Leaflet or the basemap the authority for area, perimeter, distance, containment or legal/spatial findings.

### 5. Proxy requirement

The browser must not call MaRu tiled services directly in production.

Use a **Krunditark-owned fixed tile-proxy endpoint**. Initial implementation may be a narrowly scoped Supabase Edge Function because Supabase is already the current server boundary; later Cloudflare migration may move this proxy only through a documented infrastructure change.

The proxy must:

- expose only an allow-listed set of basemap modes/layers;
- validate `{z}/{x}/{y}` or equivalent WMTS/TMS coordinates;
- never accept an arbitrary upstream URL;
- preserve safe content type/cache headers;
- use bounded timeout and response size;
- avoid logging user project/parcel information;
- avoid mass/offline prefetch;
- support provider failure without breaking parcel/proposal overlay rendering;
- keep the upstream host/server configuration server-side.

A browser-visible proxy base URL is publishable configuration, not a secret.

### 6. MaRu service-contact gate

Before public production use of the tiled basemap, complete the provider-contact/operational step documented by MaRu (`kaardirakendus@maaruum.ee`) and record the agreed/fixed Krunditark proxy address if requested.

This is an operational launch gate, not a reason to use a different unverified public tile provider during development.

### 7. Attribution

Attribution is always visible in the map UI and preserved in screenshots/print/report map evidence where the basemap is visible.

Use source-specific wording consistent with MaRu terms, for example:

- `Aluskaart: Maa- ja Ruumiamet [aasta]`
- `Maa- ja Ruumiameti ortofoto [kuupäev/aasta]`

The displayed age/version must come from documented source metadata/configuration rather than the current page date.

### 8. Failure/degraded mode

Tile-provider failure must not destroy the task flow.

The application must still be able to show, where already available:

- parcel outline;
- proposal outline;
- textual parcel summary;
- editor controls/state;
- a visible `Aluskaart ei ole hetkel saadaval` status.

Do not misclassify tile failure as parcel/source `not_found`.

## Alternatives considered

### MapLibre GL JS

Still a strong open-source choice for vector-tile-heavy, WebGL-styled maps and future large visual datasets. It is not required for the current Phase 4 2D workflow, while Leaflet aligns directly with the official MaRu tiled-service examples and has a simpler DOM/canvas 2D interaction model.

A future move to MapLibre would require a superseding ADR and map-adapter migration, not domain-model changes.

### OpenLayers

Technically strong, especially for OGC services and custom projections, but more API surface and complexity than Phase 4 currently needs. Server/PostGIS already owns authoritative EPSG:3301 operations, so the browser does not need OpenLayers to become a GIS engine.

### Google Maps

Rejected for Phase 4 due to proprietary SDK/provider coupling, irrelevant POI/navigation/business-map emphasis, additional visual noise and unnecessary dependency for an Estonia-specific parcel workspace.

## Consequences

- KT-040 implements Leaflet, not MapLibre.
- Phase 4 real-browser tests no longer require WebGL specifically, but still require Playwright for real map sizing, pointer/touch, routing and editor behavior.
- MaRu attribution, proxy and service-contact requirements become explicit KT-040/launch requirements.
- Parcel/proposal rendering remains provider-independent through Krunditark-owned geometry/view adapters.
- `MapShell`, parcel overlays and proposal editor must remain replaceable enough that a future renderer change does not rewrite domain/API contracts.

## Change policy

Changing the primary browser map engine or production basemap provider requires a superseding ADR and migration/terms review.
