# MVP Scope — Krunditark

## Objective

Deliver one trustworthy vertical slice:

> A user enters an Estonian cadastral identifier, places a supported proposed building on that parcel, runs an analysis, and receives a source-backed Ehituspass showing supported spatial conflicts/conditions, supported permit-path implications, unknowns and official next steps.

The MVP is successful when this works reliably for real supported Estonian parcels without using an LLM as the decision engine and without re-fetching every official source for every user request.

## In scope

### Geography

- Estonia only.
- Estonian cadastral identifiers.
- L-EST97 / EPSG:3301-aware spatial analysis.
- Estonian UI.

### User input

- cadastral identifier;
- structure category;
- footprint placement/drawing;
- area/dimensions;
- height;
- storeys;
- intended use;
- optional project note.

### Initial structure categories

Start with a deliberately small matrix that can be legally verified and tested, for example:

- detached house;
- sauna;
- shed / small auxiliary building;
- garage / auxiliary building.

Do not mark a category supported until its permit/rule matrix is verified against the current official law.

### Official data categories

Required first integrations:

1. cadastral parcel geometry/basic facts;
2. cadastral restriction zones;
3. PLANIS planning areas and metadata;
4. selected public EELIS environmental layers;
5. official heritage protection data once a suitable machine-readable source is verified;
6. state-road/access context once a suitable official machine-readable source is verified.

EHR integration may enter late MVP only after exact API/access behavior is documented. It must not block the initial parcel + proposal + restriction vertical slice.

### Data refresh and versioning

MVP must include the foundation for scheduled, versioned official-data releases.

Required behavior:

- approved replicated sources are synchronized server-side rather than bulk-fetched during each user request;
- monthly full reconciliation is the baseline refresh policy;
- source-specific manual/emergency refresh is possible;
- source data is staged/validated before promotion;
- failed/incomplete refresh cannot replace the previous known-good version;
- exact source dataset versions are grouped into a promoted `data_release`;
- every analysis pins the exact `data_release_id` it used;
- historical analyses remain reproducible after later monthly refreshes;
- stale/carried-forward data is explicit in analysis freshness metadata;
- normal scheduled source refresh uses zero Gemini tokens.

For an initial narrow vertical slice, one or more source adapters may temporarily use bounded server-side lookups before full national replication is implemented, but the architecture and persisted analysis contract must already follow `docs/DATA_REFRESH_AND_VERSIONING.md`. Production should converge on versioned replicated datasets for sources classified as `monthly_snapshot`.

### Analysis categories

MVP must support:

- proposal inside/outside/touching parcel boundary;
- supported restriction intersections;
- supported distances needed by verified rules;
- planning-area detection;
- explicit statement when plan textual provisions have not been fully parsed;
- verified basic permit/notification/project requirements for supported structure matrix;
- source freshness and completeness;
- data release identification;
- deterministic overall summary;
- official verification links.

### AI

MVP AI is an optional explanation layer using **Google Gemini API** server-side.

The product must remain fully functional without Gemini:

- factual findings still render;
- next steps still render from structured rule data;
- fallback templates explain findings;
- only conversational/plain-language enhancement is reduced.

Gemini is not used for normal monthly source synchronization and is not used to rediscover current laws/restrictions for each cadastral request.

### Accounts

MVP should support:

- Supabase Auth;
- saved projects;
- own-project RLS;
- analysis history.

A limited unauthenticated parcel preview can be considered if rate/security requirements are satisfied, but saved analyses require an account.

### Deployment

Development/public preview:

- GitHub Pages static frontend;
- Supabase Cloud backend;
- Supabase Cron / `pg_cron` for scheduled source synchronization where enabled.

Production DNS/hosting migration is a separate release task.

## Explicitly out of scope for first MVP

Unless promoted by a documented product decision, do **not** block MVP on:

- automatic blueprint PDF interpretation;
- DXF/DWG/IFC import;
- AI-generated site plan;
- automatic optimal building placement;
- 3D building visualization;
- detailed terrain/slope engineering;
- geotechnical suitability;
- detailed flood simulation;
- guaranteed electricity capacity or connection price;
- guaranteed water/sewer connection feasibility;
- nationwide parsing of every historic KOV PDF/scan;
- automatic interpretation of every detailed-plan textual clause;
- official application submission to EHR;
- payment/billing;
- marketplace for architects/builders;
- professional digital signature of reports;
- mobile native apps;
- countries outside Estonia;
- batch developer API;
- property valuation;
- land ownership verification.

## MVP trust boundary

The MVP may say:

> “The proposed footprint intersects a supported registered restriction geometry from Krunditark data release X, sourced from authority Y and retrieved on date Z.”

It may say, where a verified rule supports it:

> “This intersection indicates that additional coordination/conditions are required.”

It must not generalize that into:

> “You definitely cannot build here”

unless a specifically verified deterministic rule and evidence justify that exact conclusion.

## MVP data-completeness and freshness behavior

For each analysis category, store one completeness state:

- `complete_for_supported_scope`;
- `partial`;
- `unavailable`;
- `not_supported`.

For replicated source data, also retain freshness state such as:

- `fresh`;
- `warning`;
- `stale`;
- `unknown`.

The UI must disclose critical `partial`/`unavailable` categories and material stale/carried-forward sources.

A complete source dataset containing zero matching features is not the same as a source sync/request failing.

The date on which a user runs an analysis is not automatically the source-data date.

## MVP report sections

1. **Kokkuvõte**
2. **Katastriüksus**
3. **Kavandatav ehitis**
4. **Planeeringud**
5. **Kitsendused ja kaitsevööndid**
6. **Keskkond**
7. **Muinsuskaitse** when supported
8. **Tee ja juurdepääs** when supported
9. **Loa/teatise tee** for supported structure matrix
10. **Mida ei saanud automaatselt kontrollida**
11. **Järgmised sammud**
12. **Ametlikud allikad, data release ja andmete kuupäevad**
13. **Vastutuse piirang**

## MVP acceptance scenario

Given a deterministic test data release, parcel fixture and proposal fixture:

1. source sync/version fixtures represent a promoted data release;
2. parcel is resolved from that release;
3. proposal geometry is validated;
4. normalized source version fixtures are selected deterministically;
5. PostGIS calculates expected intersections/distances;
6. rules engine creates expected findings;
7. analysis snapshot stores exact data release, source versions, rule versions and evidence;
8. API returns the documented contract;
9. UI renders findings, freshness and map evidence;
10. Gemini can be disabled and the report remains understandable;
11. all normal tests run without public network dependency.

Source-sync tests additionally prove:

- a second identical import is idempotent;
- incomplete/failed import cannot delete source objects or replace active version;
- candidate promotion is atomic;
- old analysis remains bound to its historical release;
- new analysis can use a newly promoted release;
- legal-source changes cannot automatically verify a new deterministic rule.

A separate controlled integration environment may verify live official providers.

## Launch blockers

MVP must not launch publicly as a decision-support product if any of these are true:

- service/elevated secret is exposed to browser;
- user RLS isolation is not verified;
- source failure is displayed as “no restriction”;
- a failed/incomplete scheduled import can replace the previous verified dataset;
- analyses cannot identify the exact promoted data release/source versions used;
- production legal rules lack official source/version metadata;
- detected legal changes can silently overwrite verified rules;
- Gemini can change deterministic finding status;
- Gemini is required for normal source synchronization;
- map/report lacks required source attribution;
- current law/source review has not been completed for the supported rule matrix.
