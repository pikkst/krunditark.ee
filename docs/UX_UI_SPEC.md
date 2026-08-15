# UX/UI Specification — Krunditark

## 1. UX objective

Krunditark should feel like a guided property/construction check, not a government database browser.

Primary promise:

> **Tea enne, kui ehitad.**

The user should understand:

1. what parcel is being checked;
2. what building is being proposed;
3. what Krunditark checked;
4. what it found;
5. what it could not verify;
6. what to do next;
7. where the official source is.

## 2. MVP information architecture

Suggested routes:

```text
/                       landing / start
/#/kaart                parcel search + map in GitHub Pages phase
/#/projekt/:id          project workspace
/#/projekt/:id/analuus  analysis progress/result
/#/ehituspass/:id       Ehituspass result
/#/projektid             saved projects
/#/login                 auth
/#/privaatsus            privacy
/#/tingimused            terms when available
```

During GitHub Pages preview, hash routing is acceptable to avoid static-host deep-link failures. Production hosting may later move to clean paths through an ADR/deployment change.

## 3. Landing page

Hero:

**Krunditark**

**Tea enne, kui ehitad.**

Suggested supporting message:

> Sisesta katastritunnus, paiguta kavandatav hoone kaardile ja vaata ühest kohast planeeringuid, kitsendusi, kontrollitavaid nõudeid ning järgmisi samme.

Primary action:

`Alusta katastritunnusega`

Secondary content should explain:

- what an Ehituspass is;
- official-source approach;
- AI does not replace official decisions;
- supported scope.

Avoid long legal text above the fold.

## 4. Parcel search

Input label:

`Katastritunnus`

Example format may be shown without presenting a real private user's parcel as a featured example.

States:

- empty;
- invalid format;
- loading;
- found;
- not found;
- official source unavailable.

Not-found and unavailable must be visually/textually different.

Result card:

- cadastral ID;
- address where sourced;
- area;
- source;
- retrieval time;
- `Ava kaardil`.

## 5. Map workspace

Desktop layout:

```text
+-------------------------------------------------------------+
| Header                                                      |
+----------------------+--------------------------------------+
| Project / form       | Map                                  |
|                      |                                      |
| Parcel               | parcel boundary                      |
| Building settings    | proposed building                    |
| Analysis action      | restriction/evidence overlays        |
|                      |                                      |
+----------------------+--------------------------------------+
```

Mobile:

- map remains usable;
- bottom sheet/drawer for project form;
- analysis/result sections stack vertically;
- do not require hover.

## 6. Proposal creation flow

Step 1: `Mida soovid kavandada?`

Initial supported examples:

- Elamu
- Saun
- Kuur / abihoone
- Garaaž / abihoone

Unsupported type option may route to:

> “Seda ehitiseliiki Krunditark veel automaatselt ei kontrolli.”

Step 2: basic parameters.

Step 3: place/draw on map.

Step 4: review and run.

Primary action:

`Kontrolli ehitusvõimalust`

Do not label the button `Kas tohib ehitada?`, because the result is not an authority decision.

## 7. Interactive map styling semantics

Map must visually distinguish:

- parcel boundary;
- proposed building;
- selected finding evidence;
- other relevant restriction layers.

Status colors may be used, but every legend item has a text/icon label.

Do not show dozens of raw GIS layers by default. Focus on relevant analysis output.

## 8. Analysis progress

Use actual step state, for example:

- `Katastriüksus kontrollitud`
- `Kitsenduste andmed kontrollitud`
- `Planeeringute andmeid kontrollitakse…`
- `Keskkonnaandmete kontroll ebaõnnestus — tulemus märgitakse puudulikuks`
- `Reeglite hindamine`
- `Ehituspassi koostamine`

Avoid a fake “73% complete” indicator unless progress is mathematically derived from known steps.

## 9. Overall Ehituspass states

### Conflict

Estonian label suggestion:

`Konflikt tuvastatud`

Explanation:

> Vähemalt üks kontrollitud tingimus vajab enne kavandatud asukohaga jätkamist lahendamist.

### Condition/manual check

`Vajab täiendavat kontrolli`

### Checked scope clear

`Kontrollitud ulatuses konflikti ei tuvastatud`

Never shorten this to simply `Lubatud`.

### Incomplete

`Analüüs on osaliselt puudulik`

Show which source/check could not complete.

## 10. Finding card anatomy

Each material finding:

```text
[STATE ICON] Title
Short plain-language explanation

Why it triggered:
- measurement / overlap / plan detected

Next step:
- structured action

Source:
Authority · retrieved/date
[Vaata ametlikku allikat]

[Vaata kaardil]
```

Optional expandable section:

`Miks see oluline on?`

AI explanation, if used, appears clearly as an explanation rather than official quote.

## 11. Unknown findings

Unknown is a first-class design state.

Use wording such as:

`Seda ei saanud avalike/saadud andmete põhjal automaatselt kinnitada.`

Then explain:

- why;
- which source failed/is unsupported/non-public;
- what the user can do manually.

Do not hide unknown items under “other”.

## 12. Source freshness UI

Ehituspass should show:

`Andmete seis`

Example:

- Maa- ja Ruumiamet — kontrollitud 15.08.2026
- PLANIS — kontrollitud 15.08.2026
- EELIS — kontrollitud 15.08.2026
- Heritage — automaatne kontroll ei ole selles versioonis toetatud

Do not say “live” unless a live request actually succeeded.

## 13. Next-steps checklist

Order actions by importance/dependency:

1. blocking conflicts;
2. required authority/manual checks;
3. permit/application path;
4. design/survey prerequisites;
5. optional preparation.

Labels distinguish:

- `Vajalik kontroll`
- `Tõenäoline järgmine samm`
- `Soovitus`

Do not make all recommendations look legally mandatory.

## 14. Saved projects

Project card:

- user project name;
- cadastral ID;
- structure type;
- last analysis state;
- last checked date;
- `Ava projekt`;
- `Kontrolli uuesti` when source/rules may have changed.

## 15. Analysis history

Show separate snapshots:

```text
15.08.2026  Ehituspass #3  Vajab kontrolli
02.08.2026  Ehituspass #2  Konflikt tuvastatud
```

Opening an older analysis must display its historical source/rule dates, not current-source wording masquerading as old output.

## 16. Accessibility

Target WCAG 2.2 AA where practical.

Required:

- semantic labels;
- keyboard navigation;
- visible focus;
- errors tied to fields;
- sufficient contrast;
- status not color-only;
- map findings have textual alternatives;
- touch targets suitable for mobile;
- reduced-motion respect;
- no essential information available only through hover.

## 17. Map accessibility

A map alone is not an accessible result.

Every map conflict must also exist as a text finding with:

- category;
- intersection/distance statement;
- source;
- next action.

Provide a non-map list of findings.

## 18. Loading/error behavior

Avoid generic `Something went wrong` for expected provider conditions.

Examples:

- `Katastriandmete teenus ei vastanud. Proovi uuesti.`
- `Planeeringute kontroll ei õnnestunud. Ülejäänud analüüs on olemas, kuid planeeringute osa on märgitud puudulikuks.`

Technical request ID can be available in details/support context.

## 19. Trust signals

Useful trust elements:

- `Ametlik allikas` link;
- data retrieval date;
- clear limitations;
- visible distinction between source fact and AI explanation;
- no exaggerated claims such as “100% legal certainty”.

## 20. Visual direction

Brand should feel:

- modern Estonian digital service;
- calm and technical;
- trustworthy rather than bureaucratic;
- map/data-led;
- not visually imitating a government authority.

Avoid using Estonian state branding in a way that could imply official-government status.

## 21. Empty state

A first-time user should see one clear action:

> `Sisesta katastritunnus ja alusta.`

Do not require account creation before the user understands the product, unless abuse/security constraints require it. A future limited preview can provide value before signup.

## 22. Print view

Printable Ehituspass includes:

- Krunditark branding;
- generation date;
- cadastral ID;
- proposal summary;
- finding statuses as text;
- sources/links;
- unknowns;
- disclaimer;
- optional map snapshot only if attribution remains legible.
