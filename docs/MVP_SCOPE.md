# MVP Scope — Krunditark

## Objective

Deliver one trustworthy vertical slice:

> A user enters an Estonian cadastral identifier, places a supported proposed building on that parcel, runs an analysis, and receives a source-backed Ehituspass showing supported spatial conflicts/conditions, supported permit-path implications, unknowns and official next steps.

The MVP is successful when this works reliably for real supported Estonian parcels without using an LLM as the decision engine.

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

### Analysis categories

MVP must support:

- proposal inside/outside/touching parcel boundary;
- supported restriction intersections;
- supported distances needed by verified rules;
- planning-area detection;
- explicit statement when plan textual provisions have not been fully parsed;
- verified basic permit/notification/project requirements for supported structure matrix;
- source freshness and completeness;
- deterministic overall summary;
- official verification links.

### AI

MVP AI is an optional explanation layer.

The product must remain fully functional without an AI provider:

- factual findings still render;
- next steps still render from structured rule data;
- fallback templates explain findings;
- only conversational/plain-language enhancement is reduced.

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
- Supabase Cloud backend.

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

> “The proposed footprint intersects a supported registered restriction geometry retrieved from source X on date Y.”

It may say, where a verified rule supports it:

> “This intersection indicates that additional coordination/conditions are required.”

It must not generalize that into:

> “You definitely cannot build here”

unless a specifically verified deterministic rule and evidence justify that exact conclusion.

## MVP data-completeness behavior

For each analysis category, store one of:

- `complete_for_supported_scope`;
- `partial`;
- `unavailable`;
- `not_supported`.

The UI must disclose critical `partial`/`unavailable` categories.

A source returning zero matching features is not the same as a source request failing.

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
12. **Ametlikud allikad ja andmete kuupäevad**
13. **Vastutuse piirang**

## MVP acceptance scenario

Given a deterministic test parcel fixture and a proposal fixture:

1. parcel is resolved;
2. proposal geometry is validated;
3. source adapters return deterministic fixtures;
4. PostGIS calculates expected intersections/distances;
5. rules engine creates expected findings;
6. analysis snapshot stores exact versions/evidence;
7. API returns the documented contract;
8. UI renders findings and map evidence;
9. AI can be disabled and the report remains understandable;
10. all tests run without public network dependency.

A separate controlled integration environment may verify live official providers.

## Launch blockers

MVP must not launch publicly as a decision-support product if any of these are true:

- service/elevated secret is exposed to browser;
- user RLS isolation is not verified;
- source failure is displayed as “no restriction”;
- production legal rules lack official source/version metadata;
- AI can change deterministic finding status;
- map/report lacks required source attribution;
- analysis snapshots cannot identify rule/evidence versions;
- current law/source review has not been completed for the supported rule matrix.
