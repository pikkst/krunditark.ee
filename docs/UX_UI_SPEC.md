# UX/UI Specification — Krunditark

Last comprehensive product review: **2026-08-21**

For current Phase 4 implementation, also read `PHASE_4_READINESS.md`, `PHASE_4_IMPLEMENTATION_GUIDE.md`, `MAP_STACK_AND_BASEMAP.md`, ADR 0006, ADR 0009 and ADR 0010.

## 1. UX north star

Krunditark should feel like a calm, guided **property decision workspace**, not a GIS portal, legal database or chatbot.

Primary promise:

> **Tea enne, kui ehitad.**

The UX must always help the user answer:

1. Did I select the correct parcel?
2. What am I trying to do?
3. What exactly is being tested?
4. What did Krunditark check?
5. What did it find?
6. What remains unknown?
7. What should I do next?
8. Which official source supports this?
9. How current is the data?
10. Can I change the scenario and compare the result?

## 2. Design principles

### 2.1 Start with the user's decision, not government terminology

Ask:

> `Mida soovid selle krundiga teha?`

before asking the user to understand terms such as detail plan, design conditions or building notice.

### 2.2 Progressive disclosure

Beginner users see:

- one search;
- one intent choice;
- simple building templates;
- essential warnings and actions.

Advanced source IDs, raw measurements, layer controls and legal details are available progressively.

### 2.3 Show evidence near claims

Every material finding keeps its source/date/action within the same visual unit. Do not push all provenance into a footer.

### 2.4 Unknown is visible, not embarrassing

`Unknown` is a safety feature. It must look intentional and actionable rather than like a broken product.

### 2.5 No fake certainty

Never use:

- `100% ehitatav`;
- `92% buildable`;
- `Lubatud` when only supported checks are clear;
- a single green score that hides unknowns.

### 2.6 Map explains, text decides comprehension

The map is powerful but never the only representation. Every geometry conflict has a textual finding.

### 2.7 Preserve user work through every gate

Anonymous ownership bootstrap, permanent Auth, payment, errors, language change and navigation must not discard the selected parcel or proposal.

### 2.8 Technical guest identity is invisible product plumbing

Supabase anonymous Auth may be created when the user enters a stateful proposal workflow so RLS has a real owner ID. Do not present that technical operation as “create an account”.

Permanent identity prompts appear only when identity creates user-facing value such as durable recovery, purchase, monitoring or sharing.

## 3. Visual identity direction

Krunditark should feel:

- modern Estonian digital product;
- architectural/spatial;
- calm and precise;
- trustworthy without imitating a government website;
- premium enough to justify a paid report;
- friendly enough for a homeowner.

### 3.1 Brand motifs

Potential visual motifs:

- cadastral boundary geometry;
- subtle contour/grid/parcel lines;
- building footprint rectangle;
- layered map/evidence cards;
- “checked source” timestamp.

Avoid generic AI stars/robot imagery as the core brand. AI is not the product moat.

### 3.2 Color semantics

Brand palette should be neutral/natural/technical; exact tokens require visual design iteration.

Status colors are semantic and accessible:

- conflict: strong danger tone + icon/text;
- condition: amber/warning + icon/text;
- clear: restrained success + icon/text;
- unknown: neutral/blue-grey/information + question/attention icon.

Never rely on color alone.

### 3.3 Typography

Requirements:

- excellent Estonian/Cyrillic/Latin support;
- readable numbers/measurements;
- clear distinction between heading, source metadata and body copy;
- avoid decorative architecture fonts for body/legal information.

Do not ship font files without verifying licensing/performance. System/web font choice is an implementation decision.

## 4. Product information architecture

### Public

```text
/
/{locale}/
/{locale}/hinnad
/{locale}/kuidas-tootab
/{locale}/ehituspass
/{locale}/ostukontroll
/{locale}/pro
/{locale}/abi
/{locale}/privaatsus
/{locale}/tingimused
```

### Application

Production target:

```text
/{locale}/kaart
/{locale}/projekt/uus
/{locale}/projekt/:projectId
/{locale}/projekt/:projectId/variant/:proposalId
/{locale}/ehituspass/:analysisId
/{locale}/projektid
/{locale}/konto
/{locale}/ostud
/{locale}/pro/...        later
```

GitHub Pages preview uses repository-path base, but component/domain design must target clean production routing.

Phase 4 route transitions must preserve the selected parcel, canonical intent and active proposal draft rather than keeping them only inside a landing-page component.

## 5. Global navigation

### Logged out / guest

Desktop:

```text
Krunditark      Kuidas töötab   Hinnad   Pro   Abi      ET ▾   [Logi sisse]
```

Primary contextual CTA on landing is the search, not a generic `Register` button.

An anonymously authenticated guest still looks like a guest until they deliberately link a permanent identity.

Mobile:

- compact logo;
- locale switch;
- menu;
- project action remains accessible.

### Logged in / permanent identity

```text
Krunditark    [Projektid] [Uus kontroll] ...   ET ▾   [Konto]
```

If one active project exists, show a clear `Jätka projekti` route.

## 6. Landing page

### 6.1 Above the fold

Desktop concept:

```text
+------------------------------------------------------------------+
| Krunditark                                      ET | RU | EN      |
|                                                                  |
|     Tea enne, kui ehitad.                                        |
|                                                                  |
|     Vaata ühest kohast, millised planeeringud, piirangud         |
|     ja kontrollitavad nõuded võivad sinu ehitusideed mõjutada.   |
|                                                                  |
|     [ Sisesta aadress või katastritunnus..................... ]  |
|     [ Otsi ]                                                      |
|                                                                  |
|     [ Vali krunt kaardilt ]                                      |
|                                                                  |
|     ✓ Ametlikud allikad   ✓ Konkreetne asukoht   ✓ Selged sammud |
|                                                                  |
|                                 [map/product preview visual]       |
+------------------------------------------------------------------+
```

Primary input must accept:

- official address search;
- cadastral identifier.

The MaRu In-AKS path makes official address candidate search a realistic primary entry method. Krunditark's current interaction is submit-driven, not per-keystroke upstream autocomplete. Do not force ordinary consumers to find a cadastral ID elsewhere first.

### 6.2 Trust strip

Immediately under hero:

- `Ametlikel andmeallikatel põhinev`
- `AI selgitab — kontrolltulemus tuleb reeglitest ja ruumiandmetest`
- `Andmete seis on alati nähtav`

Avoid partner/government logos without permission.

### 6.3 “Kuidas see töötab?”

Three/four visual steps:

1. `Leia krunt`
2. `Vali, mida soovid teha`
3. `Paiguta ehitis või tee ostukontroll`
4. `Saa Ehituspass ja järgmised sammud`

### 6.4 Product examples

Use real product screenshots/illustrations, not abstract marketing claims:

- parcel with sauna footprint;
- detected power/road/planning overlay;
- finding card with source;
- variant A/B comparison.

### 6.5 Use cases

Cards:

- `Tahan ehitada maja`
- `Tahan krundile sauna või abihoonet`
- `Kaalun maatüki ostmist`
- `Olen arhitekt / maakler / arendaja`

Each opens a relevant explanatory flow, not just the generic home page.

### 6.6 “Mida Krunditark kontrollib?”

Group by user problem rather than source agency:

- `Planeeringud ja ehitusõigus`
- `Kitsendused ja kaitsevööndid`
- `Keskkond ja muinsuskaitse`
- `Tee ja ligipääs`
- `Loa/teatise järgmine samm`
- `Olemasolevad ehitised` when supported
- `Kommunikatsioonid` later
- `Maastik, üleujutus ja pinnas` later

Each group explicitly states current coverage/limitations.

### 6.7 Sample Ehituspass

Allow public sample/demo report with synthetic/demo parcel data.

Users should understand what they are buying before checkout.

### 6.8 Pricing teaser

Simple:

- free parcel overview;
- Ostukontroll;
- Ehituspass;
- Project Pass;
- Pro link.

Do not put a 4-column SaaS pricing matrix above the product explanation.

### 6.9 FAQ

High-value questions:

- Kas Krunditark annab ehitusloa?
- Kas tulemus on ametlik otsus?
- Kas pean olema kinnistu omanik?
- Kui värsked andmed on?
- Miks mõni tulemus on “vajab kontrolli”?
- Kas saan proovida maja teist asukohta?
- Kas mu projekt on privaatne?
- Miks pean mõnel juhul siiski KOV-i või spetsialistiga suhtlema?

### 6.10 Footer

- company/service identity;
- support;
- privacy;
- terms;
- data/source methodology;
- language;
- service status later;
- no implication of official state service.

## 7. Search and parcel selection UX

### 7.1 Combined search

Label:

`Aadress või katastritunnus`

Placeholder:

`Nt Pärnu mnt 10, Tallinn või 12345:678:9012`

Search is **submit-driven**, not reactive to typing:

- typing updates the input text only;
- no upstream request is made while the user is typing;
- an address search is triggered only when the user explicitly submits (presses **Otsi** or **Enter**);
- a minimum of **3 characters** is required for an address lookup;
- exact cadastral identifiers bypass address search and call the parcel resolver directly;
- malformed cadastral-like input (wrong length/invalid characters) is validated locally and shown as an **invalid** state without any upstream request.

After submit:

- **0 candidates** -> `not_found` (`Katastriüksust ei leitud`);
- **1 candidate** -> resolve automatically when safe;
- **>1 candidates** -> show accessible candidate/listbox UI and require explicit selection;
- provider/network/parse/rate failure -> `unavailable`/retry state, never `not_found`.

Submitted address candidate card may show:

- official address;
- object type;
- locality;
- cadastral ID when resolution is available;
- map preview/highlight.

### 7.2 Multiple parcel candidates

Address can map to a building/address object rather than one unique cadastral unit.

When ambiguous:

> `Leidsime mitu võimalikku katastriüksust. Vali õige.`

Show candidates with area and outline where available.

### 7.3 Map selection

`Vali krunt kaardilt` is a functional Phase 4 entry path.

It opens/navigates to the **Leaflet** map workflow with:

- Estonia-useful initial viewport;
- default `Kaart` and optional `Ortofoto` basemap modes according to ADR 0010;
- location/search assistance where appropriate;
- cadastral/parcel context at suitable zoom;
- explicit click/select action;
- server-side `parcel-resolve` point lookup using WGS84 lat/lng;
- candidate outline + address/cadastral/area summary;
- bottom/side result sheet;
- `Kasuta seda krunti`.

Rules:

- pointer movement does **not** continuously resolve parcels;
- ambiguous candidates require explicit confirmation;
- not-found/unavailable/invalid-source are distinct;
- confirmed map parcel enters the same free-overview/intent flow as text search;
- source/data-age attribution remains visible;
- tile/basemap failure does not become parcel `not_found` and must not discard selected parcel/proposal state;
- map selection never implies ownership.

## 8. Free parcel overview

This is the first “aha” moment.

Layout:

```text
[Parcel header: address + cadastral ID]
[large map]

Pindala    Basic facts    Olemasolevad hooned (when supported)

Andmete seis: ...

Mida soovid selle krundiga teha?
[ Ehitan ] [ Kaalun ostmist ] [ Muudan hoonet ] [ Vaata piiranguid ]
```

Do not require permanent sign-in here. No anonymous technical identity is required merely to display this bounded overview unless the implementation later demonstrates a concrete need and the docs are deliberately changed.

## 9. Intent selection

Localized choices map to canonical codes:

### Build — `build`

`Soovin midagi ehitada`

Active Phase 4 proposal flow.

### Buy — `pre_purchase`

`Kaalun selle krundi ostmist`

Known/planned dedicated Ostukontroll flow. Do not fall through to build rules.

### Existing building — `existing_building_modification`

`Soovin olemasolevat hoonet muuta`

Known/planned separate scenario profile; not supported by new-building fallback.

### Understand parcel — `understand_parcel`

`Tahan lihtsalt piiranguid ja planeeringuid vaadata`

### Professional — `professional`

Future denser context/workflow, not a legal-analysis fallback.

When the user enters a **stateful proposal flow** such as `build`, create/reuse the anonymous Auth owner/project as required by ADR 0009. Preserve exact parcel + intent across routing.

## 10. Building proposal wizard — beginner mode

### Step 1 — Structure/scenario

Use visual cards for known candidate structure concepts such as:

- `Elamu`
- `Saun`
- `Kuur / abihoone`
- `Garaaž`
- later more verified categories.

A valid domain/DB structure code does **not** mean the scenario is currently verified-supported.

Before a card is labeled fully supported, OQ-005 must define the current verified scenario matrix from official law.

Unsupported/custom `Muu`:

> `Selle ehitise kohta ei pruugi Krunditark veel kõiki menetlusreegleid automaatselt kontrollida. Ruumi- ja piirangukontrolle saad siiski kasutada.`

`Muu` must never silently inherit a verified legal/process profile.

### Step 2 — Size template

Offer starting footprints:

- common predefined dimensions for verified/product-approved scenarios;
- `Sisestan ise mõõdud`.

A template is UI convenience, not design advice or authoritative provenance. Phase 4 does not require persisting a `sourceTemplateId` as a material proposal fact.

### Step 3 — Other rule-relevant parameters

Only ask what the selected supported rule/profile needs, with `Miks seda küsime?` help.

For unsupported scenarios, make the reduced scope explicit rather than inventing required legal parameters.

### Step 4 — Placement draft

Building appears as a **mutable browser draft** that can be:

- dragged;
- rotated;
- resized through numerical fields;
- reset/deleted before persistence.

Desktop uses map + side panel.

Mobile uses full-screen map + bottom sheet.

Full persisted-scenario duplication/A-B comparison is a later variant workflow. Phase 4 may share lower-level version primitives but should not present variant comparison as complete.

### Step 5 — Review and server validation

Review summary before canonical persistence:

- parcel;
- structure/scenario/support state;
- footprint/dimensions;
- height/storeys;
- map thumbnail;
- data categories available/unsupported.

Then run the canonical server validation boundary:

1. validate typed input/resource limits;
2. transform browser geometry to EPSG:3301;
3. validate topology/bounds;
4. compute authoritative area/perimeter;
5. show typed errors/warnings;
6. persist a new owner-scoped proposal version only when valid.

Client area/perimeter are previews only.

CTA copy for the later analysis step:

`Kontrolli ehitusvõimalust`

Better than `Kas tohib ehitada?` because Krunditark is not the authority.

## 11. Advanced proposal mode

Available through `Täpsem paigutus` / later Pro mode:

- polygon drawing;
- vertex editing;
- exact coordinates/dimensions;
- snapping where technically justified;
- distance measurement;
- layers;
- future PDF/DXF/IFC import.

Advanced polygon mode can exist in Phase 4 as a secondary path, but never expose raw provider-specific GIS controls to a beginner by default.

All advanced draft geometry still crosses the same authoritative server validation boundary.

## 12. Live map feedback vs authoritative analysis

During placement, the UI may show fast convenience feedback such as:

- outside parcel;
- approximate boundary distance;
- client-computed dimensions/area/perimeter;
- visible known layer overlay.

Clearly distinguish it from saved authoritative server/PostGIS geometry and later deterministic analysis.

For example:

`Eelvaade` vs `Kontrollitud tulemus`.

Client-side geometry/measurements never become authoritative legal measurements by display alone.

## 13. Basemap modes

Phase 4 user modes are fixed by ADR 0010:

- **`Kaart`** — default Maa- ja Ruumiamet pre-tiled basemap;
- **`Ortofoto`** — optional Maa- ja Ruumiamet orthophoto mode;
- later `Reljeef` only after a separate justified source/UX decision.

Implementation rules:

- Leaflet is the Phase 4 browser renderer;
- browser basemap requests use the Krunditark-owned fixed/allow-listed tile proxy;
- production browser code does not request MaRu tile origins directly;
- source/data-age attribution remains visible on desktop/mobile;
- mode switching preserves parcel/proposal overlays and project state;
- tile-provider failure shows degraded visual-map state without turning parcel state into `not_found`;
- public OSM/demo tile endpoints are not a production fallback by convenience;
- avoid querying heavyweight WMS directly for every browser pan when the approved pre-tiled MaRu service exists.

See `MAP_STACK_AND_BASEMAP.md` and ADR 0010.

## 14. Analysis progress UX

Because normal analysis uses local verified data releases, it should usually be much faster/predictable than a multi-provider live fetch.

Show actual stages:

- `Kontrollime krundi ja ehitise geomeetriat`
- `Võrdleme planeeringute ja kitsendustega`
- `Hindame toetatud reegleid`
- `Koostame Ehituspassi`

Do not pretend the system is currently calling each authority when it is using a promoted local/versioned data release.

Show data-release/source freshness separately from analysis creation date.

## 15. Ehituspass — result hierarchy

The first viewport must answer the decision question without hiding nuance.

### Header

```text
Ehituspass
[project / address]
Analüüs: 15.08.2026
Andmeväljalase: 2026-08
```

### Overall state

One of:

- `Konflikt tuvastatud`
- `Vajab täiendavat kontrolli`
- `Kontrollitud ulatuses konflikti ei tuvastatud`
- `Analüüs on puudulik`

### Top actions

Examples:

- `Vaata kriitilisi leide`
- `Proovi teist asukohta`
- `Vaata järgmisi samme`
- `Prindi / ekspordi`

### Category navigation

Sticky/side tabs on desktop, horizontal chips/accordion on mobile:

- Kokkuvõte
- Planeeringud
- Kitsendused
- Keskkond
- Muinsuskaitse
- Tee/ligipääs
- Luba/teatis
- Kommunikatsioonid later
- Kulud later
- Allikad

## 16. Finding card anatomy

```text
[icon] [STATE LABEL]
Title

Plain-language factual summary

Miks see käivitus?
  3.2 m² kavandatud hoonest kattub ...

Järgmine samm
  [Kontrolli tingimusi ...]

Ametlik allikas
  Authority · dataset/date
  [Ava ametlik allikas]

[Vaata kaardil] [Miks see oluline on?]
```

The optional `Miks see oluline on?` may be Gemini-enhanced but must be visually labeled as explanation and grounded to the supplied finding.

## 17. Map-to-finding interaction

Selecting a finding:

- highlights proposal;
- highlights only relevant evidence geometry;
- dims unrelated layers;
- zooms to useful extent;
- shows measurement annotation where meaningful.

Selecting map geometry opens the associated finding card.

This bidirectional interaction is a core differentiator from a text-only chatbot.

## 18. Unknown and stale states

### Unknown

Use:

> `Seda ei saanud olemasolevate/toetatud andmete põhjal automaatselt kinnitada.`

Then say why and what to do.

### Stale

Use:

> `Selle allika viimane edukas Krunditarga andmeuuendus oli 01.07.2026. Andmed võivad olla muutunud.`

Do not show the analysis creation date as source freshness.

## 19. Next-step plan

End the report with an ordered action plan.

Each action has a type:

- `Vajalik kontroll`
- `Tõenäoline menetlussamm`
- `Soovitus`
- `Valikuline ettevalmistus`

Example:

```text
1. [Vajalik kontroll] Vaata detailplaneeringu tingimused
2. [Vajalik kontroll] Täpsusta tee kaitsevööndi tingimused
3. [Tõenäoline menetlussamm] Taotle projekteerimistingimusi
4. [Soovitus] Telli geodeetiline alusplaan
```

Do not make recommendations look legally mandatory unless the verified rule says so.

## 20. Variant comparison

This should become a signature experience **after** persisted proposals and deterministic analyses exist.

CTA after a conflict/condition:

`Proovi teist asukohta`

Duplicate the exact persisted scenario into a new proposal version/scenario and let the user move/rotate/edit it.

Comparison view:

```text
              Variant A   Variant B
Konfliktid        1           0
Tingimused        2           1
Teadmata          1           1
```

Then list exact deterministic differences.

Do not rank with an opaque AI score.

Future optimizer may add:

`Leia krundilt sobivamad kandidaat-alad`

but user always sees why candidates were suggested.

## 21. Ostukontroll UX

A buyer often does not know the final building footprint.

Do not force building placement.

Report:

- parcel facts;
- planning context;
- known restrictions;
- EHR existing buildings when supported;
- road/access context;
- environment/heritage;
- important unknowns;
- `Küsimused müüjale/KOV-ile`;
- `Testi siia maja` upgrade.

Future compare mode:

`Võrdle krunte`

with transparent category differences rather than a single “investment score”.

## 22. Existing building / extension UX

Later:

- select EHR building visually/list;
- choose change type;
- show existing footprint;
- draw/import proposed change;
- run separate rule profile.

Do not visually imply a new-building analysis covers reconstruction rules.

## 23. Projects dashboard

### Consumer

Card:

```text
Saunaprojekt
[address]
Saun 48 m²
Vajab kontrolli
Viimane analüüs 15.08.2026
[Uuemad andmed saadaval]

[Ava projekt]
```

Filter/archive rather than complex enterprise tables.

### Professional

Optional table/list with:

- client/project;
- parcel;
- proposal;
- state;
- data freshness;
- assignee/team;
- last activity;
- batch actions later.

## 24. Project workspace

Desktop:

```text
+------------------------------------------------------------------+
| Project header | data freshness | share/export                   |
+-------------------------+----------------------------------------+
| LEFT PANEL              | MAP                                    |
|                         |                                        |
| Parcel                  | parcel/proposal/evidence                |
| Proposal variants       |                                        |
| Findings                |                                        |
| Next actions            |                                        |
| Files (later)           |                                        |
+-------------------------+----------------------------------------+
```

A project should feel persistent, not like a one-time wizard once stateful onboarding begins.

Anonymous guest ownership may back this workspace before permanent account conversion; project privacy/ownership semantics remain identical.

## 25. Change monitoring UX

When a new verified data/rule release exists:

```text
[info banner]
Uuemad kontrollandmed on saadaval.
Sinu viimane Ehituspass põhineb 2026-07 andmetel.
[Kontrolli uuesti]
```

Later after deterministic diff:

- `Mõju ei tuvastatud`;
- `Projektiga seotud muutus tuvastatud`;
- exact changed categories.

Never use alarmist push/email without computing impact.

## 26. Pricing/paywall UX

Consumer flow sells the decision/product, not “credits”.

Labels:

- `Ostukontroll`
- `Ehituspass`
- `Projektipass`

Professional users may understand usage credits inside a subscription.

Paywall shows:

- exactly what will be checked/unlocked;
- supported data date;
- price including applicable tax presentation;
- account/recovery behavior;
- service limitation;
- refund/technical-failure policy link.

No preselected recurring subscription for one-off users.

## 27. Auth UX

Follow `AUTH_AND_ONBOARDING.md`.

Two different concepts must remain visually separate:

### Anonymous technical ownership

- created/reused only when stateful guest project ownership is needed;
- no email/name requested;
- no “create account” wall;
- no loss of parcel/intent/draft;
- errors are recoverable and never bypass RLS.

### Permanent account conversion

Contextual sheet when identity provides value:

- durable/cross-device save;
- purchase/recovery;
- monitoring/notifications;
- sharing/pro features.

Methods later:

- email OTP;
- Google;
- no mandatory password;
- preserve the same anonymous project during conversion.

## 28. Language UX

Follow `LOCALIZATION_AND_LANGUAGE.md`.

- ET/RU/EN selector visible from landing;
- switching language preserves current selected parcel/project/proposal draft;
- critical legal/status terms use reviewed translations;
- canonical intent/structure/finding codes remain locale-independent;
- source identity remains official/Estonian where appropriate;
- translated explanation never looks like an official translated decision.

## 29. Help architecture

Contextual help beats a giant manual.

Patterns:

- `?` / `Miks seda küsime?` near parameters;
- glossary tooltip;
- report `Miks see oluline on?`;
- short help articles;
- AI follow-up grounded in current analysis;
- `Teata võimalikust andmeveast`.

Do not make the user leave the workflow to learn basic terms.

## 30. Mobile strategy

Mobile is important for parcel owners physically on site, but exact site-plan work is easier on desktop.

Mobile must fully support:

- search/select parcel including map entry;
- view map;
- place simple rectangle/template;
- edit numeric dimensions;
- run/read report;
- source/action links;
- pay/permanent auth later;
- share later.

For advanced polygon/import workflows, the UI may recommend desktop without making the project inaccessible.

Use bottom sheets carefully; do not cover the entire map with permanent controls.

## 31. Accessibility

Target WCAG 2.2 AA.

Required:

- semantic headings/landmarks;
- keyboard operation;
- visible focus;
- labels/error associations;
- submitted address candidate list accessibility;
- status not color-only;
- adequate contrast;
- touch targets;
- reduced motion;
- no hover-only critical controls;
- skip links;
- map has textual alternative;
- dialogs/sheets manage focus correctly;
- charts/comparisons have tables/text equivalents.

Real-browser Playwright coverage starts in Phase 4 because focus/pointer/touch/route behavior cannot be fully proven in jsdom.

## 32. Performance UX

Targets are experience-based, then measured.

- landing/search should be quick before loading heavy map code;
- lazy-load Leaflet/editor code where practical;
- cache address/parcel results within source policy;
- address lookup only on explicit submit;
- map parcel resolution only on explicit selection/click;
- tile requests follow the owned proxy/provider policy rather than uncontrolled direct-origin fan-out;
- local data-release analysis should avoid a series of visible upstream waits;
- render large vector evidence with simplification/tiles as needed;
- skeletons preserve layout;
- never use fake delay just to make analysis seem sophisticated.

## 33. Empty/error states

### Empty

`Sisesta aadress või katastritunnus ja alusta.`

### Parcel source unavailable

`Krundiandmeid ei õnnestunud praegu laadida. Proovi uuesti.`

### Public request rate-limited

Show a safe retry state. Do not display `Katastriüksust ei leitud`.

### Ambiguous map/address parcel

`Leidsime mitu võimalikku katastriüksust. Vali õige.`

### Basemap/tile provider degraded

Keep parcel/proposal state and textual controls available. Explain that the visual basemap is temporarily unavailable; do not convert the state to parcel not-found and do not discard the user's work.

### Guest project bootstrap failed

Keep recoverable draft/public state where safe, explain that project state could not yet be saved, and offer retry. Never silently use shared ownership or disable RLS.

### Unsupported rule scope

`Selle ehitise menetlusreegleid Krunditark veel täielikult ei kata, kuid saad jätkata toetatud ruumi- ja piirangukontrollidega.`

### Payment pending

`Makse kinnitust oodatakse. Sinu projekt on salvestatud.`

### Report creation failed after payment

Never ask for another payment. Show recovery/support path and retry internally/idempotently.

### AI failed

`AI selgitus ei ole hetkel saadaval. Kontrollitud tulemused ja allikad on allpool olemas.`

## 34. Notification design

Only notifications with clear user value:

- report ready;
- payment/refund/account security;
- newer data available for active monitored project;
- material change later;
- share/collaboration events;
- project-pass expiry if action remains.

Do not turn the product into marketing-email spam.

## 35. Pro mode

Pro mode is not simply “more features”. It changes information density.

Features later:

- advanced map/layers;
- source IDs/version metadata visible by default;
- reusable client/building templates;
- keyboard shortcuts;
- multiple active analyses;
- comparison/export;
- organization workspace;
- API/batch status.

Same factual engine and safety rules apply.

## 36. Future high-value experiences

### Best-location assistant

Use deterministic candidate-area construction and transparent ranking.

### Utility explorer

Show:

- known infrastructure/protection geometry;
- distance/proximity;
- service-area information;
- direct request/quote action.

Never present proximity as connection capacity/approval.

### Terrain/flood/solar

Map overlays and scenario cards with official-source metadata.

### Blueprint import

Upload PDF/DXF/IFC, extract candidate footprint, require scale/user confirmation, place on parcel.

### Professional review

`Vajan spetsialisti hinnangut`

Share the exact analysis/evidence with user permission, reducing paid professional discovery time.

### Application handoff

Long-term, when official APIs/process allow it, prepare structured data/checklists for EHR/PLANIS workflows. Do not automate submissions before identity/authority/legal requirements are fully understood.

## 37. Design-system component inventory

Initial/reusable components may include:

- AppShell
- Header / LocaleSwitcher
- AddressParcelSearch
- ParcelResultCard
- MapShell
- MapParcelSelectionSheet
- ParcelLayer
- ProposalLayer
- EvidenceLayer
- BuildingTemplateCard
- ProposalParameterForm
- Stepper
- StatusBadge
- FindingCard
- SourceBadge / SourceDetails
- FreshnessBadge
- NextActionCard
- AnalysisSummary
- VariantComparison
- ProjectCard
- Paywall/ProductCard
- AuthSheet / OTPInput later
- EmptyState / ErrorState
- ConfirmationDialog
- BottomSheet
- Toast for transient events only
- Skeletons

Avoid building a bespoke visual language per feature.

## 38. Responsive breakpoints

Exact tokens belong to the design system, but behavior should be content-driven.

Desktop:

- map + side panel simultaneously.

Tablet:

- collapsible side panel.

Mobile:

- map full-width;
- bottom sheet for parcel candidates/forms/findings;
- important CTA sticky but not obscuring map controls;
- report becomes normal document flow.

## 39. UX telemetry events

Subject to privacy approval:

- landing search submitted/succeeded;
- map selection opened/parcel confirmed;
- parcel selected;
- intent selected;
- proposal template chosen;
- placement completed;
- proposal validation/persistence succeeded/failed by safe code;
- analysis started/completed;
- finding/source opened;
- variant duplicated later;
- permanent-auth conversion later;
- paywall shown/purchase;
- report reopened;
- newer-data rerun;
- support/data-error report.

Use pseudonymous IDs; never send full addresses/parcel IDs/geometry to third-party analytics unless explicitly justified and disclosed.

## 40. UX acceptance test

Test at least these people/tasks:

1. homeowner who does not know cadastral ID;
2. user selecting an undeveloped parcel only from the map;
3. older/low-GIS-confidence user placing a verified-supported sauna scenario;
4. Russian-speaking user completing the critical consumer flow when enabled;
5. English-speaking resident/buyer;
6. architect who wants exact source details quickly;
7. buyer comparing land before purchase later;
8. mobile user at the property;
9. screen-reader/keyboard user completing critical non-map alternatives.

For Phase 4, the acceptance test must also confirm:

- no permanent account wall before placement;
- anonymous technical ownership does not disrupt the journey;
- route/locale navigation preserves active work;
- browser proposal geometry is clearly preview state until server validation;
- ambiguous parcel selection is explicit;
- `Kaart`/`Ortofoto` switching does not discard overlays/state;
- basemap failure does not destroy parcel/proposal state;
- mobile map/bottom-sheet interaction is usable in a real browser.

A successful session ends with a user knowing **what to do next**, not merely having viewed more data.
