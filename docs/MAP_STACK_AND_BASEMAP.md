# Map Stack and Basemap Policy — Krunditark

Last verified: **2026-08-21**

This document defines the browser map renderer, basemap source, proxy/attribution rules and Phase 4 operational constraints. ADR 0010 records the architecture decision; this file contains the implementation-facing details.

## 1. Product goal

Krunditark needs a **quiet 2D parcel workspace**, not a navigation/POI map.

The map should primarily help the user see:

- the selected parcel;
- the proposed footprint;
- later evidence/restriction geometry;
- a simple geographic background;
- optional orthophoto context.

The basemap must not visually compete with the user's parcel/proposal or imply that third-party POI/business information is part of Krunditark's analysis.

## 2. Browser renderer

### Selected

**Leaflet 1.9.x stable**.

Phase 4 must pin the installed version in `package-lock.json`. Do not use Leaflet 2.0 alpha in production Phase 4 work.

Why Leaflet fits Phase 4:

- open source;
- focused 2D interaction model;
- raster tile/TMS/WMS support and GeoJSON/vector overlays;
- mobile-friendly;
- MaRu explicitly documents Leaflet as suitable for its pre-tiled TMS/WMTS services;
- no proprietary Google/Mapbox SDK requirement;
- enough capability for parcel click, outline rendering and proposal editing without making the browser an authoritative GIS engine.

Official Leaflet reference:

- https://leafletjs.com/reference.html

### Editing plugin

For KT-045/KT-046 use `@geoman-io/leaflet-geoman-free` where its free MIT-licensed functionality satisfies the task.

- package/repo is MIT licensed;
- free package supports geometry creation/editing and the project documents drag/rotate functionality;
- Phase 4 must not depend on paid Geoman Pro features.

References:

- https://github.com/geoman-io/leaflet-geoman
- https://geoman.io/docs/leaflet

## 3. Alternatives reviewed

### MapLibre GL JS

Pros:

- strong vector-tile/WebGL styling;
- good future fit for very large styled vector maps;
- open source.

Why not the Phase 4 default:

- current primary basemap need is simple raster/pre-tiled MaRu map + orthophoto;
- WebGL/vector-style architecture is not needed for the current parcel/editor contract;
- Leaflet matches MaRu's documented tiled-service integration directly;
- authoritative GIS remains server/PostGIS-side, so WebGL is not a correctness advantage.

MapLibre remains a viable future migration if Krunditark later needs a vector-tile-heavy renderer. Such a change requires an ADR.

### OpenLayers

Pros:

- excellent OGC/service/projection support;
- advanced GIS-style browser capabilities.

Why not selected now:

- more API surface and complexity than required;
- EPSG:3301 authoritative operations already belong to server/PostGIS;
- Phase 4 does not need to turn the browser into a desktop GIS.

### Google Maps

Not selected.

Reasons:

- proprietary provider/SDK coupling;
- POI/business/navigation content is unnecessary and visually noisy for parcel editing;
- unnecessary commercial/API-key dependency;
- does not improve Krunditark's source-of-truth or legal/GIS correctness.

### Public OpenStreetMap tile endpoint

OpenStreetMap data or a separately contracted OSM-based provider may be useful in another context, but the public `tile.openstreetmap.org` endpoint is not selected as Krunditark's production tile service simply because it is easy to demo with.

## 4. Maa- ja Ruumiamet tiled basemaps

Provider: **Maa- ja Ruumiamet (MaRu)**.

Current official guidance confirms:

- TMS/WMS-C/WMTS pre-tiled basemaps are available;
- these services are explicitly suitable for Leaflet;
- browser-map integrations should prefer pre-tiled services instead of issuing many WMS requests;
- available basemap types include `Kaart`, `Ortofoto`, `Hübriidkaart`, relief and basic maps;
- `Kaart`/`Hübriidkaart` tiled products are refreshed monthly;
- orthophoto follows its own annual refresh cycle;
- service use is free for legal commercial/non-commercial purposes with attribution;
- public integration must follow MaRu service terms;
- the tiled-service page requires proxying through a fixed address and asks implementers to contact the map-service support address.

Current references:

- https://geoportaal.maaamet.ee/est/teenused/wms-wfs-wcs-teenused/tms-wms-c-ja-wmts-teenused-p481.html
- https://geoportaal.maaamet.ee/est/teenused/wms-wfs-wcs-teenused/maa-ja-ruumiameti-kaarditeenuste-kasutustingimused-p24.html
- https://geoportaal.maaamet.ee/est/ruumiandmed/topokaardid-ja-aluskaardid/eesti-pohikaart-1-10000-p30.html

## 5. Krunditark map modes

### `Kaart` — default

Purpose: clean, readable parcel/proposal workspace.

Requirements:

- subdued enough that Krunditark overlays remain dominant;
- source/age attribution visible;
- selected automatically on first map open unless user previously chose another mode in the same valid UI context.

### `Ortofoto` — optional

Purpose: help the user visually understand existing physical context.

Requirements:

- explicit user switch;
- attribution reflects orthophoto source/age;
- parcel/proposal overlays remain visible with contrast suitable for aerial imagery;
- switching must not recreate or lose parcel/proposal state.

### `Hübriidkaart`

Not a default Phase 4 mode. It may be evaluated later if user testing shows value, but Phase 4 should avoid adding visual noise without a clear need.

## 6. CRS contract

### Canonical/server

- Parcel/Proposal/Constraint: EPSG:3301.
- authoritative metric calculations: PostGIS/server.

### Browser

- Leaflet display map: normal Web Mercator/EPSG:3857 behavior;
- domain geometry sent to browser: explicit EPSG:4326 GeoJSON after canonical conversion;
- MaRu browser tiles use their Web-Mercator/GMC variant where applicable.

Never relabel EPSG:3301 coordinates as WGS84/3857.

Never use Leaflet pixel/degree calculations as authoritative area/perimeter/legal distance.

## 7. Tile proxy contract

The production browser must request tiles from a **Krunditark-owned fixed proxy URL**.

Conceptual browser path:

```text
GET <VITE_MAP_TILE_PROXY_URL>/<mode>/<z>/<x>/<y>
```

The exact route may differ, but the semantic contract must remain narrow.

Allowed modes initially:

```text
kaart
ortofoto
```

The proxy must not expose:

```text
?url=https://arbitrary-host/...
```

### Proxy responsibilities

- fixed MaRu upstream allow-list;
- fixed layer/mode mapping;
- validate numeric tile coordinates and supported zoom range;
- bounded upstream timeout;
- bounded response size/content type;
- safe cache behavior consistent with MaRu terms;
- no user-controlled arbitrary headers/upstream query;
- no full address/project/proposal logging;
- request/correlation ID where useful;
- safe `502/503` provider-unavailable response;
- no `not_found` parcel semantic for tile failure;
- no mass prefetch/offline national tile cache.

### Initial infrastructure

Supabase Edge Function may implement the Phase 4 proxy because it is already the server boundary. If traffic/cost/latency later justifies Cloudflare Worker/edge caching, move it via a documented infrastructure change and re-check MaRu terms.

Do not introduce Cloudflare solely to finish the first Leaflet component if the existing Supabase proxy satisfies the documented requirements.

## 8. Public configuration

Suggested browser configuration:

```text
VITE_MAP_TILE_PROXY_URL=<Krunditark-owned public proxy base URL>
```

This is public/publishable configuration.

Do not put MaRu credentials, Supabase service-role credentials or private proxy secrets into `VITE_*` variables.

Suggested server configuration may include:

```text
MAP_TILE_PROVIDER=maru
MAP_TILE_UPSTREAM_BASE_URL=<verified server-side upstream>
MAP_TILE_ALLOWED_MODES=kaart,ortofoto
```

Exact environment naming may be adapted consistently in `ENVIRONMENT.md`.

## 9. Attribution

MaRu terms require source attribution and data age/extract date when material is presented publicly or integrated into another service.

Examples from current terms include forms such as:

```text
Aluskaart: Maa- ja Ruumiamet [aasta]
Maa- ja Ruumiameti ortofoto [kuupäev/aasta]
Eesti põhikaart [aasta], Maa- ja Ruumiamet
```

Krunditark rules:

- attribution control remains visible on map;
- source age is not replaced by `new Date()` page date;
- screenshots/print/report maps retain attribution when the basemap is visible;
- if Krunditark later restyles raw MaRu spatial data so heavily it is no longer the supplied basemap, attribution wording follows the corresponding source-data rule rather than pretending the original basemap design is unchanged.

## 10. Provider-contact gate

Before public production traffic, contact/operational setup must follow MaRu's current tiled-service guidance.

Current support contact published by MaRu:

```text
kaardirakendus@maaruum.ee
```

Record in deployment/operations documentation:

- Krunditark environment/domain using the service;
- fixed proxy URL;
- selected modes/layers;
- expected traffic class if requested;
- any provider response/agreement relevant to operation.

Do not commit private correspondence or credentials to the repository; record only the operational conclusion needed by implementation.

## 11. Request/load policy

- only load tiles needed for the visible map/normal browser behavior;
- no national prefetch;
- no offline downloader in Phase 4;
- avoid WMS-per-tile fan-out where MaRu provides pre-tiled service;
- debounce/avoid unnecessary map recreation;
- switching base layer should reuse current map/overlay state;
- analytical source data is not inferred from visual basemap pixels.

## 12. Degraded behavior

If the tile proxy/provider fails:

- show a quiet status such as `Aluskaart ei ole hetkel saadaval`;
- keep the map canvas and already-known vector overlays when technically possible;
- preserve parcel/proposal/project state;
- allow textual project controls to remain usable;
- retry may be offered;
- do not translate tile failure into parcel `not_found`, source `clear`, or analysis success.

## 13. Security/privacy

- map tiles do not receive project notes, Auth tokens beyond what the Krunditark proxy itself legitimately needs, or proposal metadata in URLs;
- proxy path contains only tile/mode coordinates, not full address/cadastral ID;
- arbitrary upstream URLs are forbidden;
- CORS is restricted to intended Krunditark preview/production origins as deployment matures;
- logs avoid IP/address correlation beyond justified short-lived abuse/operations needs;
- no third-party Google/advertising/analytics map SDK is introduced through the basemap.

## 14. Phase 4 verification

Before KT-040 is Done:

- Leaflet map loads in local/preview environment;
- `Kaart` works through the owned proxy;
- `Ortofoto` works through the owned proxy;
- attribution visible on desktop/mobile;
- parcel/proposal overlays survive mode switch;
- one map click can trigger parcel point resolve without pointer-move spam;
- tile failure has degraded UI;
- no secret appears in frontend bundle;
- no direct production browser request targets the MaRu upstream tile host;
- provider-contact/proxy operational requirement is documented for public production.
