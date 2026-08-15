# User Journeys and Personas — Krunditark

Last product review: **2026-08-15**

This document defines the user problems Krunditark solves from first visit through long-term project use. It is intentionally broader than the initial MVP.

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

- find parcel by address;
- choose “Saun” or “Kuur” template;
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

Choices:

1. **Soovin midagi ehitada**
2. **Kaalun selle krundi ostmist**
3. **Tahan olemasolevat hoonet muuta**
4. **Tahan lihtsalt krundi piiranguid mõista**
5. **Töötan kliendi/projekti kallal** (professional mode)

Why this matters:

The same parcel needs a different workflow depending on the decision the user is trying to make. Asking “building type” too early creates unnecessary friction for buyers and professionals.

## 4. Entry methods

Do not require cadastral ID as the only starting point.

Supported entry hierarchy should become:

1. **Address search** — primary consumer method.
2. **Cadastral identifier** — precise known input.
3. **Select on map** — useful for undeveloped/no-address plots and visual users.
4. **Paste listing/property link** — future convenience feature; only after legal/technical source handling is defined.
5. **Professional/batch import** — post-core product.

### Address capability

Maa- ja Ruumiamet introduced In-AKS in 2026. The official In-AKS service exposes address/Gazetteer APIs and the predecessor In-ADS was described as free, fast and based on current official address data. This makes official address autocomplete a realistic Krunditark entry path.

Research:

- https://geoportaal.maaruum.ee/est/teenused/in-ads-in-aks/nb-muudatused-in-adsis-p1038.html
- https://geoportaal.maaruum.ee/est/teenused/integreeritav-aadressiotsing-in-ads-p504.html

## 5. Consumer happy path — build something

### Step 0 — Landing

User sees one dominant input:

`Sisesta aadress või katastritunnus`

Secondary action:

`Vali krunt kaardilt`

No account creation is required.

### Step 1 — Parcel selection

If address maps to several objects/parcels:

- show candidates on map;
- show address + cadastral ID + area;
- require user to select the exact parcel.

Do not silently choose one.

### Step 2 — Free parcel overview

Show immediate value:

- parcel outline;
- address;
- cadastral ID;
- area;
- supported land-use/basic facts;
- existing buildings when supported;
- current data-release date;
- “what Krunditark can check here”.

This is where trust is earned before signup/payment.

### Step 3 — Intent

User chooses `Soovin midagi ehitada`.

### Step 4 — Building template

Beginner mode:

- Elamu;
- Saun;
- Kuur / abihoone;
- Garaaž;
- `Muu` with clear supported-scope handling.

Then choose a template, for example:

- `Saun 4 × 6 m`;
- `Saun 6 × 8 m`;
- `Kuur 3 × 4 m`;
- `Elamu 10 × 12 m`;
- `Sisestan ise mõõdud`.

Do not make a non-GIS user draw a polygon as the default interaction.

### Step 5 — Parameters

Ask only facts that materially affect analysis:

- dimensions/footprint area;
- height;
- storeys;
- intended use;
- new building vs extension where relevant.

Use progressive disclosure. Do not front-load optional legal/technical fields.

### Step 6 — Place on map

User sees the building rectangle/model on the selected parcel and can:

- drag;
- rotate;
- edit dimensions;
- reset;
- switch to orthophoto;
- see simple distance labels to parcel boundaries when useful.

Advanced mode allows polygon editing/import later.

### Step 7 — Pre-check

Before payment/account gate, show enough value to establish that analysis is real, for example:

- correct parcel/proposal summary;
- number/categories of checks available;
- data freshness;
- whether some categories are unsupported/unavailable.

Do not use manipulative teaser wording such as “3 SECRET PROBLEMS FOUND”.

Do not show a false green “safe to build” state from an intentionally reduced free check.

### Step 8 — Account/payment conversion

Only now ask the user to preserve/complete the project.

Preferred flow:

- preserve anonymous project;
- `Jätka e-postiga` (email OTP);
- `Jätka Google'iga`;
- then payment when purchasing a paid product.

Do not require a password during the first journey.

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

The system duplicates the proposal, allowing user to move/rotate it.

Comparison UI:

| Variant | Conflict | Conditions | Unknowns | Notes |
|---|---:|---:|---:|---|
| A | 1 | 2 | 1 | original |
| B | 0 | 1 | 1 | moved 12 m west |

Do not rank solely by a fake “buildability score”.

A later placement optimizer can suggest candidate areas, but every suggestion must remain an analysis scenario rather than official approval.

## 7. Pre-purchase journey — Ostukontroll

Flow:

1. Search address/cadastral parcel.
2. Choose `Kaalun selle krundi ostmist`.
3. Show free parcel facts.
4. Run/buy **Ostukontroll**.
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
2. Choose `Muudan olemasolevat hoonet`.
3. Select an existing EHR building.
4. Choose action: extension, reconstruction, demolition/rebuild, use change, etc.
5. Ask task-specific parameters.
6. Draw/import proposed change.
7. Analyze using a separate verified rule profile.

Do not reuse “new building” rules blindly.

## 9. Professional journey

Professionals can switch to `Pro režiim`.

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
 -> proposal created
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

### Source is stale

Show last good data and its age where policy permits, with explicit stale warning.

### Building falls outside parcel

Show geometry directly on map and offer `Paiguta krundi sisse` for simple templates.

### Unsupported building type

Keep the parcel/project and say which checks are still available. Do not throw the user back to the landing page.

### AI is unavailable

Show deterministic report and template explanation. AI downtime is never a blocker.

### Payment succeeds but browser closes

Order/report must be recoverable by account/email and idempotent payment state.

## 13. Support and escalation

Every analysis has an ID.

Provide:

- `Teata võimalikust andmeveast`;
- `Kas see selgitus aitas?`;
- `Vajan spetsialisti abi` later;
- support message automatically includes safe analysis/source IDs, not secrets or unnecessary personal data.

This is also a feedback loop for source/rule quality.

## 14. Privacy defaults

- Parcel lookup is not proof of ownership.
- Public parcel data does not justify collecting owner identity.
- Guest work can use an anonymous Supabase session.
- Saved/private projects are private by default.
- Share links are opt-in and revocable.
- Future uploaded plans remain private and follow explicit retention policy.

## 15. Research evidence behind these journeys

### Fragmentation and user complexity

Maa- ja Ruumiamet itself states that construction law is complex and its e-ehituse platform is trying to translate that complexity into a simpler user experience. It also explicitly identifies future homeowners, architects, builders, banks and infrastructure/property companies as EHR users.

- https://maaruum.ee/blogi/mis-e-ehituse-platvorm
- https://maaruum.ee/ruumiloome-ehitus-ja-planeerimine/e-ehitus/e-ehitus

### Current process change

Major Ehitusseadustik changes entered into force on 1 August 2026 and changed important design-condition/detail-plan paths. This reinforces why the product needs versioned rules and an always-visible data/legal date rather than static advice pages.

- https://kliimaministeerium.ee/uudised/ehitamine-muutub-lihtsamaks
- https://www.riigikogu.ee/tegevus/eelnoud/eelnou/87821638-de39-45f9-8619-2f3b05a14aa3/ehitusseadustiku-ja-sellega-seonduvalt-teiste-seaduste-muutmise-seaduse-eelnou-743-se/

### Existing professional demand

Estonian professional firms already sell building-rights, restrictions, planning and due-diligence analysis. This validates the problem, while Krunditark's opportunity is to automate a fast first pass and route difficult cases to humans rather than pretending every case can be fully automated.

Examples researched:

- https://vanarc.ee/
- https://standup.ee/teenused/
- https://cityee.ee/konsultatsioon/

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

If any of these require reading raw WFS attributes or legislation, the UX is incomplete.
