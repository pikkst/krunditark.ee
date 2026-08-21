# User Journeys and Personas — Krunditark

Last product review: **2026-08-21**

This document defines the user problems Krunditark solves from first visit through long-term project use. It is intentionally broader than the initial MVP.

For the current map/proposal implementation boundary, also read `PHASE_4_READINESS.md`, `PHASE_4_IMPLEMENTATION_GUIDE.md`, `MAP_STACK_AND_BASEMAP.md` and ADR 0010.

## 1. Product job

Krunditark is not primarily a cadastral viewer, legal chatbot or document search engine.

The core job is:

> Help a person make a safer next decision about an Estonian parcel before they spend serious money or time on design, purchase, permitting or construction.

The user usually does not want to learn planning law. They want answers to practical questions:

- Can I realistically pursue this idea here?
- What may block me?
- What is still unknown?
- Where could I place the building with fewer problems?
- Which official process is likely next?
- What should I ask the municipality/provider/professional?
- What might the preparation cost and how long might it take?
- Has anything changed since I checked last time?

Krunditark must translate fragmented public information into a decision workflow while preserving source provenance and uncertainty.

## 2. Main personas

### P1 — Homeowner planning a small building

Examples:

- sauna;
- shed;
- garage;
- greenhouse or another supported auxiliary structure;
- later extension/reconstruction.

Typical mindset:

> “I already have the land. I do not know whether this needs a notice, project, permit, design conditions or some approval. I just want to know where to start.”

Pain points:

- legal terminology is unfamiliar;
- does not know the right portal or authority;
- may not know the cadastral identifier;
- does not understand protection-zone map layers;
- may assume “under 20 m²” means “do anything anywhere”, which can be wrong because location-specific restrictions still matter;
- does not want to pay a designer before knowing whether the idea is realistic.

Desired experience:

- find parcel by address or map;
- choose a verified-supported “Saun”/other structure scenario when available;
- enter dimensions;
- drag/rotate it on the map;
- receive understandable findings and next steps.

### P2 — Family planning a detached house

Mindset:

> “We want to build a home and need a complete early-stage checklist before talking to designers and banks.”

Needs more than a permit label:

- planning context;
- buildable-area constraints;
- existing buildings;
- road/access context;
- electricity/water/sewer context;
- terrain and drainage later;
- approximate preparation cost categories;
- expected administrative path;
- reusable project history.

This persona benefits most from a **Project Pass**, not a one-time monthly consumer subscription.

### P3 — Land buyer / pre-purchase due diligence

Mindset:

> “The listing says residential land. What can I actually do with it before I commit to buying?”

This user frequently does **not own the parcel**, which is why Krunditark must never equate parcel search with ownership.

Needs:

- address/listing parcel lookup;
- quick risk screen without drawing a final house;
- planning and restriction overview;
- existing-building/EHR context;
- missing-access/utility warnings where supported;
- option to test one or several hypothetical building templates;
- compare several parcels side by side later;
- share result with partner, architect or bank adviser.

This is a high-value episodic use case and should have a separate **Ostukontroll** product flow.

### P4 — Existing homeowner planning an extension/rebuild

Needs:

- find existing EHR building(s);
- select which building is being changed;
- describe extension/reconstruction rather than creating a new building from scratch;
- compare existing and proposed footprint;
- understand building-notice/permit implications for the supported case;
- identify when original documents/conditions must be reviewed.

This flow should be introduced after the new-building vertical slice because the legal/domain matrix is different.

### P5 — Architect / designer / planning consultant

Mindset:

> “I need a reliable pre-check before spending professional time on a client proposal.”

Needs:

- fast parcel/address search;
- advanced polygon/dimension tools;
- upload DXF/PDF/IFC later;
- source freshness and exact references;
- multiple proposal versions;
- project notes;
- exports;
- shareable client link;
- many projects;
- fewer AI explanations and more structured evidence;
- team/workspace features later.

This persona is subscription-compatible because usage is recurrent.

### P6 — Prefabricated/modular house seller

Mindset:

> “Can model X fit this customer’s parcel, and what obvious constraints should the customer investigate before ordering?”

Needs:

- house-model catalog with known footprint, height and parameters;
- one-click placement of a selected model;
- automated parcel compatibility pre-check;
- customer handoff/share link;
- API/widget later;
- leads generated from successful fit checks.

This can become a strong B2B distribution channel.

### P7 — Broker / land investor / small developer

Needs:

- rapid parcel screening;
- compare several parcels;
- portfolio/dashboard;
- batch import later;
- development-right and planning indicators;
- structured export/API;
- change monitoring;
- team access.

This persona should not be forced through the beginner wizard for every parcel.

### P8 — Appraiser / lender / due-diligence professional

Possible later use:

- verify supported building-right and risk context;
- source-backed snapshot for an appraisal/due-diligence file;
- historical report reproducibility;
- professional export/API.

Krunditark should not claim to produce a certified valuation unless a separate regulated/professional product is created.

## 3. User intent comes before building type

The first post-parcel question should be:

> **Mida soovid selle krundiga teha?**

Choices map to stable locale-independent codes:

1. **Soovin midagi ehitada** -> `build`
2. **Kaalun selle krundi ostmist** -> `pre_purchase`
3. **Tahan olemasolevat hoonet muuta** -> `existing_building_modification`
4. **Tahan lihtsalt krundi piiranguid mõista** -> `understand_parcel`
5. **Töötan kliendi/projekti kallal** -> `professional`

Support status is separate from code identity. Planned flows must not silently enter the supported `build` analysis path.

Why this matters:

The same parcel needs a different workflow depending on the decision the user is trying to make. Asking “building type” too early creates unnecessary friction for buyers and professionals.

## 4. Entry methods

Do not require cadastral ID as the only starting point.

Supported entry hierarchy:

1. **Address search** — primary consumer method.
2. **Cadastral identifier** — precise known input.
3. **Select on map** — useful for undeveloped/no-address plots and visual users.
4. **Paste listing/property link** — future convenience feature; only after legal/technical source handling is defined.
5. **Professional/batch import** — post-core product.

### Address capability

Maa- ja Ruumiamet introduced In-AKS in 2026. The official In-AKS Gazetteer makes an official address candidate-search path realistic.

Current Krunditark interaction is **submit-driven**:

- typing only changes local input;
- `Otsi`/Enter triggers the upstream-backed search;
- 0 results -> not found;
- multiple results -> accessible candidate list + explicit selection;
- provider failure -> unavailable, never no-match.

Do not reintroduce per-keystroke upstream traffic merely because older product language used the word “autocomplete”. Candidate-list UX after explicit submit remains appropriate.

Research/source details live in `DATA_SOURCES.md`.

## 5. Consumer happy path — build something

### Step 0 — Landing

User sees one dominant input:

`Sisesta aadress või katastritunnus`

Secondary action:

`Vali krunt kaardilt`

No permanent-account creation is required.

### Step 1 — Parcel selection

Text path:

- user explicitly submits address/cadastral input;
- if address maps to several objects/parcels, show candidates;
- show address + cadastral ID + area where available;
- require user to select the exact parcel.

Map path:

- open the **Leaflet** parcel-selection experience defined by ADR 0010;
- default to MaRu `Kaart`, with `Ortofoto` as an optional visual mode;
- user explicitly clicks/selects a location;
- canonical server point resolver finds candidate parcel(s);
- ambiguity requires explicit confirmation;
- confirmed parcel enters the same overview flow;
- a tile/basemap outage remains a degraded visual-map state and does not become parcel `not_found`.

Do not silently choose one.

### Step 2 — Free parcel overview

Show immediate value:

- parcel outline;
- address;
- cadastral ID;
- area;
- supported land-use/basic facts;
- existing buildings when supported;
- current data/source freshness information;
- “what Krunditark can check here”.

This is where trust is earned before permanent signup/payment.

### Step 3 — Intent

User chooses `Soovin midagi ehitada` (`build`).

At this point, when the workflow becomes stateful, the application may create/reuse a **Supabase anonymous Auth identity and owner-scoped guest project**. This happens as technical ownership behind the guest flow; it is not shown as a permanent-account signup requirement.

Persist/reference the exact selected parcel and canonical intent so routing/locale changes do not throw away the workflow.

### Step 4 — Building/scenario selection

Beginner mode may offer domain labels such as:

- Elamu;
- Saun;
- Kuur / abihoone;
- Garaaž;
- `Muu` with clear limited supported-scope handling.

Important:

- a valid domain enum/code is **not** proof that the legal/product scenario has been verified;
- OQ-005 defines the first verified-supported matrix;
- only verified scenarios may be marked fully supported;
- `Muu`/unsupported input may retain generic spatial checks but must not fall back to a supported legal/process profile.

Then choose a beginner template, for example:

- `Saun 4 × 6 m`;
- `Saun 6 × 8 m`;
- `Kuur 3 × 4 m`;
- `Elamu 10 × 12 m`;
- `Sisestan ise mõõdud`.

Templates are UI conveniences, not legal/design advice or authoritative analysis provenance.

Do not make a non-GIS user draw a polygon as the default interaction.

### Step 5 — Parameters

Ask only facts that materially affect analysis:

- dimensions/footprint area;
- height;
- storeys;
- intended use;
- scenario type where relevant.

Use progressive disclosure. Do not front-load optional legal/technical fields.

### Step 6 — Place on map

User sees the building draft on the selected parcel and can:

- drag;
- rotate;
- edit dimensions;
- reset/delete an unpersisted draft;
- switch between `Kaart` and `Ortofoto` without losing overlays/draft state;
- see convenience distance/geometry feedback where useful.

Advanced mode allows polygon editing later in Phase 4.

The browser object is a **proposal draft**, not authoritative legal geometry. Client area/perimeter/distance are previews only. Leaflet/Geoman objects are presentation/editor implementation state, not durable domain state.

### Step 6A — Canonical server validation/persistence

Before a proposal version becomes authoritative project state:

1. send the typed browser draft through the proposal validation boundary;
2. transform/canonicalize to EPSG:3301 server-side;
3. validate topology/bounds/resource limits;
4. compute authoritative area/perimeter in PostGIS/server logic;
5. persist a new owner-scoped proposal version only after validation succeeds.

A persisted proposal referenced by terminal analysis is never silently mutated in place. Save retry/concurrency behavior must follow the KT-048 idempotency/version-allocation contract.

### Step 7 — Pre-check

Before permanent-account/payment gate, show enough value to establish that analysis is real, for example:

- correct parcel/proposal summary;
- number/categories of checks available;
- data freshness;
- whether some categories are unsupported/unavailable.

Do not use manipulative teaser wording such as “3 SECRET PROBLEMS FOUND”.

Do not show a false green “safe to build” state from an intentionally reduced free check.

### Step 8 — Permanent account/payment conversion

This step means **permanent identity**, not the anonymous technical owner created earlier.

Only when durable/cross-device/paid value requires it, ask the user to link/convert the existing guest project:

- preserve exact anonymous project/proposal;
- `Jätka e-postiga` (email OTP);
- `Jätka Google'iga`;
- then payment when purchasing a paid product.

Do not require a password during the first journey.

Do not create a second replacement project during conversion.

### Step 9 — Full Ehituspass

Present:

- summary;
- blockers/conflicts;
- conditions;
- unknown/manual checks;
- planning;
- restrictions;
- environmental/heritage/road context;
- permit/process path for supported cases;
- next-step checklist;
- source dates/links;
- AI explanation clearly separated from deterministic result.

### Step 10 — Act

Every report should end with **next actions**, not information only:

- move building and compare;
- open official source;
- contact KOV;
- apply/request design conditions where appropriate;
- request professional review;
- request utility quote later;
- save/share/export.

## 6. Variant comparison journey

A major product differentiator is iteration.

After a result, show:

`Proovi teist asukohta`

The later variant workflow duplicates the exact persisted scenario into a new scenario/version, allowing the user to move/rotate/edit it and run a separate analysis.

Comparison UI:

| Variant | Conflict | Conditions | Unknowns | Notes           |
| ------- | -------: | ---------: | -------: | --------------- |
| A       |        1 |          2 |        1 | original        |
| B       |        0 |          1 |        1 | moved 12 m west |

Do not rank solely by a fake “buildability score”.

Phase 4 may build reusable proposal-version primitives, but full A/B analysis comparison remains the later variant phase.

A later placement optimizer can suggest candidate areas, but every suggestion must remain an analysis scenario rather than official approval.

## 7. Pre-purchase journey — Ostukontroll

Flow:

1. Search address/cadastral/map parcel.
2. Choose `Kaalun selle krundi ostmist` (`pre_purchase`).
3. Show free parcel facts.
4. Run/buy **Ostukontroll** when implemented.
5. Report sections:
   - planning context;
   - known restrictions;
   - existing buildings/EHR context;
   - access/road context;
   - utility context when supported;
   - important unknowns;
   - questions to ask seller/KOV;
   - source dates.
6. Optional `Testi siia maja` upgrades the parcel to a building scenario.
7. Future: compare up to N candidate parcels.

The product must explicitly say that this is not title/ownership/legal transaction due diligence unless those datasets/services are intentionally added.

## 8. Existing-building journey

Future route:

1. Search parcel.
2. Choose `Muudan olemasolevat hoonet` (`existing_building_modification`).
3. Select an existing EHR building.
4. Choose action: extension, reconstruction, demolition/rebuild, use change, etc.
5. Ask task-specific parameters.
6. Draw/import proposed change.
7. Analyze using a separate verified rule profile.

Do not reuse “new building” rules blindly.

## 9. Professional journey

Professionals can later switch to `Pro režiim` / `professional` context.

Differences:

- denser information;
- advanced map controls;
- source IDs/version metadata immediately visible;
- fewer educational prompts;
- keyboard shortcuts;
- multi-project dashboard;
- client/project name fields;
- reusable building templates;
- exports/share links;
- batch/API later.

The underlying factual engine is identical. Professional mode changes workflow density, not truth semantics.

## 10. Saved project lifecycle

A project may remain active for months or years.

States:

```text
idea
 -> parcel selected
 -> intent selected
 -> proposal draft
 -> proposal version persisted
 -> analyzed
 -> comparing variants
 -> preparing next action
 -> professional/design phase
 -> permitting phase (future tracking)
 -> construction preparation (future)
 -> archived
```

A project should show:

- latest Ehituspass;
- last verified data release;
- newer-data-available indicator;
- proposal versions;
- next actions;
- files later;
- collaborators later.

## 11. Reanalysis and change monitoring

When a new data/rule release is available:

- historical report stays unchanged;
- project shows `Uuemad andmed on saadaval`;
- user may rerun analysis;
- paid Project Pass/pro users can receive a notification;
- later, system can compute a deterministic report diff.

Useful notification:

> “Sinu projekti puudutavates kontrollandmetes on muutus. Vaata, kas see mõjutab kavandatud hoonet.”

Do not send alarmist messages before material impact is computed.

## 12. Error recovery

### User enters invalid address/ID

Help correct it; do not dead-end.

### Address/parcel provider is unavailable or rate-limited

Show an unavailable/retry state. Do not show “parcel not found” merely because the provider failed.

### Map selection is ambiguous

Show candidates and require explicit confirmation. Never choose one silently.

### Basemap/tile provider is unavailable

Keep the selected parcel/proposal/draft and textual controls available where possible. Show a degraded visual-map state and retry path. A tile failure is not parcel `not_found` and is not evidence that parcel/source data are absent.

### Guest project bootstrap fails

Keep safe in-memory/public state where possible and show a recoverable error. Never fall back to shared ownership, disabled RLS or browser service-role credentials.

### Source is stale

Show last good data and its age where policy permits, with explicit stale warning.

### Building falls outside parcel

Show geometry directly on map and offer a correction path for simple templates where implemented.

### Unsupported building type

Keep the parcel/project and say which checks are still available. Do not throw the user back to the landing page or silently reuse a supported legal profile.

### AI is unavailable

Show deterministic report and template explanation. AI downtime is never a blocker.

### Payment succeeds but browser closes

Order/report must be recoverable by permanent account/email and idempotent payment state.

## 13. Support and escalation

Every analysis has an ID.

Public/server requests also use safe request/correlation IDs where appropriate so support can diagnose a provider failure without asking the user for raw internal payloads.

Provide:

- `Teata võimalikust andmeveast`;
- `Kas see selgitus aitas?`;
- `Vajan spetsialisti abi` later;
- support message automatically includes safe analysis/source/request IDs, not secrets or unnecessary personal data.

Routine diagnostics should not require storing full user-entered addresses.

This is also a feedback loop for source/rule quality.

## 14. Privacy defaults

- Parcel lookup is not proof of ownership.
- Public parcel data does not justify collecting owner identity.
- Guest project work can use an anonymous Supabase session without collecting email/name.
- Anonymous identity is created only when stateful ownership is needed, not necessarily for every landing visitor.
- Saved/private projects are private by default.
- Share links are opt-in and revocable.
- Future uploaded plans remain private and follow explicit retention policy.
- Third-party analytics do not receive full addresses/geometry/notes by default.

## 15. Research evidence behind these journeys

### Fragmentation and user complexity

Maa- ja Ruumiamet itself states that construction law is complex and its e-ehituse platform is trying to translate that complexity into a simpler user experience. It also explicitly identifies future homeowners, architects, builders, banks and infrastructure/property companies as EHR users.

Research references are evidence inputs and must be reverified when implementation depends on current facts:

- https://maaruum.ee/blogi/mis-e-ehituse-platvorm
- https://maaruum.ee/ruumiloome-ehitus-ja-planeerimine/e-ehitus/e-ehitus

### Current process change

Major Ehitusseadustik changes entered into force on 1 August 2026 and changed important design-condition/detail-plan paths. This reinforces why the product needs versioned rules and an always-visible data/legal date rather than static advice pages.

The exact supported Phase 4 structure/scenario matrix remains gated by OQ-005 and must be verified against current official law before support claims.

### Existing professional demand

Estonian professional firms already sell building-rights, restrictions, planning and due-diligence analysis. This validates the problem, while Krunditark's opportunity is to automate a fast first pass and route difficult cases to humans rather than pretending every case can be fully automated.

Examples in research documentation are market evidence only, not authoritative sources for product findings.

## 16. Product success test

A first-time non-expert should be able to answer all of these without learning GIS terminology:

1. Did I choose the correct parcel?
2. What am I trying to do?
3. Where exactly am I proposing the building?
4. What did Krunditark check?
5. What problems or conditions were found?
6. What could not be checked?
7. What should I do next?
8. Which official source supports this?
9. How old are the underlying data/rules?
10. Can I try another variant without starting over?

And during the Phase 4 journey the system must also preserve these invisible safety properties:

- the guest's state is owned by the correct anonymous/permanent identity;
- browser map geometry is not mistaken for authoritative server analysis geometry;
- basemap mode/provider failure cannot erase or reinterpret parcel/proposal state.

If any of these require reading raw WFS attributes or legislation, the UX is incomplete.
