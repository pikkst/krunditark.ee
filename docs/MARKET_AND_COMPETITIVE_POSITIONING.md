# Market and Competitive Positioning — Krunditark

Last research review: **2026-08-15**

This document defines where Krunditark competes, where it deliberately does not compete, and what becomes defensible over time.

## 1. Market problem

Construction and land-use information in Estonia is increasingly digital, but the user problem is not simply access to data.

The real problem is combining:

- the correct parcel;
- the user's actual proposed scenario;
- spatial relationships;
- current planning/legal context;
- source freshness;
- understandable next actions;
- uncertainty;
- project history.

Maa- ja Ruumiamet itself describes construction regulation as complex and is developing the e-ehituse platform to present parcel requirements/opportunities more coherently.

Official source:

- https://maaruum.ee/blogi/mis-e-ehituse-platvorm

This validates the user problem, but it also means Krunditark is entering a space where the public platform will continue improving.

## 2. Strategic competitive warning — do not become “just a chatbot”

In January 2026 Maa- ja Ruumiamet publicly described a vision for the EHR chatbot where it may eventually analyze questions such as:

- whether a property can be built on and under which conditions;
- what problems/opportunities are visible in registry data;
- what the homeowner should do next.

Official source:

- https://maaruum.ee/blogi/maru-asub-ehitisregistri-kasutamist-lihtsamaks-muutma-appi-tuleb-vestlusrobot

The same announcement reported substantial early chatbot usage, indicating real demand for simpler guidance.

### Consequence

Krunditark must not build its strategic value around:

> `cadastral ID -> AI chat answer`

That is likely to become increasingly available from the state platform itself.

Krunditark's differentiation must be a **decision/workflow product**, not only an information answer.

## 3. Krunditark positioning

Recommended category:

> **Kinnistu- ja ehitusotsuste tööriist**

or product language:

> **Kontrolli krunti. Testi ehitusideed. Võrdle variante. Tea järgmisi samme.**

Positioning sentence:

> Krunditark aitab enne maa ostmist või ehitusprojekti alustamist kontrollida konkreetset krunti ja ehitusideed, sidudes ametlikud ruumiandmed, kontrollitud reeglid, kaardipõhise stsenaariumi ning järgmised sammud ühte projekti.

## 4. Differentiation pillars

### 4.1 Exact scenario placement

Not only:

> “What restrictions are on parcel X?”

but:

> “What changes if this 6×8 m sauna is placed here vs 12 metres west?”

This is a genuine spatial decision tool.

### 4.2 Variant comparison

Users can create scenario A/B/C and understand what changed.

### 4.3 Historical reproducibility

Every report is tied to:

- data release;
- source versions;
- rule versions;
- geometry;
- engine version.

A generic chatbot answer is usually not a durable project artifact.

### 4.4 Pre-purchase due diligence

A dedicated buyer flow can answer “what should I investigate before buying this land?” without requiring a final building project.

### 4.5 Persistent project workspace

A house project lasts months/years.

Krunditark can preserve:

- proposal versions;
- reports;
- source changes;
- next actions;
- files/collaboration later.

### 4.6 Change monitoring

The system can tell a saved project that newer verified data/rules exist and later compute whether the change is materially relevant.

### 4.7 Professional workflow

Architects/brokers/prefab sellers/developers need:

- repeat use;
- comparison;
- templates;
- team projects;
- export;
- batch/API;
- audit/provenance.

This is different from occasional state self-service.

### 4.8 Productized escalation

When automation reaches `unknown`, Krunditark can make that uncertainty actionable by handing the same structured evidence to a professional review workflow.

## 5. Public-sector relationship

The state is not only a competitor; it is also the source ecosystem and potentially a complementary service.

Krunditark should:

- use official APIs/feeds where permitted;
- link users back to official EHR/PLANIS/Riigi Teataja/KOV processes;
- avoid recreating application submission systems prematurely;
- avoid pretending to be official;
- be designed so a future official deep-link/API handoff is easy.

Success does not require replacing EHR.

A useful product can sit **before** the official process:

```text
idea / property listing
        |
        v
Krunditark early decision + scenario testing
        |
        v
professional design / missing evidence
        |
        v
EHR / PLANIS / KOV official process
```

## 6. Competitor categories

Do not define “competitor” only as another SaaS website.

### Category A — User does it manually

Alternatives:

- Maa- ja Ruumiamet/X-GIS;
- EHR/e-ehitus;
- PLANIS;
- Riigi Teataja;
- Keskkonnaportaal/EELIS;
- KOV website/email/phone;
- utility maps;
- spreadsheets/bookmarks.

Krunditark wins on orchestration and scenario-specific interpretation.

### Category B — State digital guidance/chatbot

Likely increasingly capable and free.

Krunditark must win on workflow depth, persistence, comparison, buyer/professional tooling, change monitoring and integration.

### Category C — Architect/planning consultant

Human professional analysis is higher touch and can address ambiguous local context better.

Krunditark should not pretend to replace this.

It wins on:

- immediate first pass;
- lower cost;
- repeat scenario testing;
- standardized evidence;
- triage before paying professional hours.

Then it may create a qualified handoff to professionals.

### Category D — Real estate portals/brokers

Portals may expose parcel/basic map facts, but their business goal is the transaction/listing, not neutral construction feasibility.

Krunditark can later become a plugin/API/data product for them.

### Category E — GIS/professional map tools

Powerful but not designed for consumer decision guidance.

Krunditark's advantage is domain workflow and controlled interpretation, not raw GIS capability.

## 7. Existing professional willingness-to-pay signals

Current Estonian firms offer paid services around:

- building-right analysis;
- restrictions/constraints;
- planning risk;
- document review;
- permit/design-condition processes;
- property valuation/advice.

Examples researched in August 2026:

- https://cityee.ee/konsultatsioon/
- https://www.nordproperty.ee/teenused/hinnakiri
- https://eri.ee/
- https://vanarc.ee/
- https://standup.ee/teenused/

These are not exact product substitutes and their pricing must not be used as proof that a specific Krunditark price will work.

They do show that solving uncertainty around building/property decisions has monetary value.

## 8. Demand signals

Maa- ja Ruumiamet's chatbot pilot publicly reported thousands of users/messages during early usage. That is a strong qualitative signal that people ask construction/property questions digitally.

The EHR platform identifies users including future homeowners, architects, builders, banks, infrastructure and real-estate companies.

Official sources:

- https://maaruum.ee/blogi/maru-asub-ehitisregistri-kasutamist-lihtsamaks-muutma-appi-tuleb-vestlusrobot
- https://www.maaruum.ee/ruumiloome-ehitus-ja-planeerimine/e-ehitus/e-ehitus

Do not turn these figures into a TAM estimate without more careful market sizing.

## 9. Primary launch segment

Recommended first segment:

> **Private homeowner / prospective land buyer who has a real parcel and a real decision within the next 6–12 months.**

Why:

- pain is concrete;
- value is understandable;
- workflow can be designed narrowly;
- direct payment is plausible;
- feedback reveals real unknowns;
- successful reports can later be reused in professional workflows.

Do not start by building a generic “all Estonian real-estate intelligence” product.

## 10. Second segment

After consumer trust/product engine:

> **Architect/design consultant and prefab-house seller.**

These are especially strong because they repeatedly need the same pre-check on different parcels.

Professional workflow creates recurring revenue and product distribution.

## 11. B2B distribution hypotheses

### Prefab-house widget

Customer selects house model + parcel.

Krunditark returns a supported pre-check and routes a qualified lead.

### Broker/portal integration

`Kontrolli ehitusvõimalust` from a land listing.

Must remain neutral and not claim the seller's description is verified.

### Architecture/design offices

Pro workspace for client pre-check and exports.

### Developer/land investor API

Batch parcel screening for early pipeline triage.

### Bank/appraiser context

Source-backed report may later support early due diligence, but do not market it as certified valuation/legal opinion without professional/regulatory review.

## 12. Trust moat

The moat is accumulated operational knowledge:

- official source adapters;
- normalized data;
- version history;
- legal/rule verification process;
- GIS semantics/tests;
- false-positive/unknown feedback;
- project/change comparison;
- professional workflow integration;
- source reliability monitoring.

Gemini is replaceable infrastructure. It is not the moat.

## 13. Data moat without data lock-in

Much source data is public, so “we have public data” is not a defensible moat by itself.

Defensibility comes from:

- normalization quality;
- exact source semantics;
- historical snapshots;
- stable domain model;
- verified rule links;
- test corpus;
- source-change handling;
- user interaction/feedback;
- scenario model.

Do not rely on violating source terms or hoarding data that should remain attributable/open.

## 14. Content/SEO strategy

High-intent educational content can acquire users organically:

- `Kas 20 m² kuur vajab ehitusluba?` (with current-law date and nuanced location caveats)
- `Mis on projekteerimistingimused?`
- `Kuidas kontrollida maatükki enne ostu?`
- `Kuidas leida katastritunnus?`
- `Mida tähendab elektriliini kaitsevöönd?`

But every law-dependent article must have:

- reviewed date;
- source/version links;
- no static advice that silently ages forever;
- “kontrolli oma krunti” CTA.

Do not create thousands of thin AI-generated locality/parcel pages.

## 15. Brand positioning

Avoid phrases:

- “AI lawyer for construction”;
- “100% guarantee”;
- “official building approval”;
- “ChatGPT for cadastral data”.

Prefer:

- `Tea enne, kui ehitad.`
- `Kontrolli krunti enne, kui kulutad projekteerimisele.`
- `Testi ehitusidee päris asukohas.`
- `Ametlikud allikad. Selged järgmised sammud.`

## 16. Strategic risks

### State platform catches up

Mitigation:

- scenario/workspace depth;
- professional/B2B;
- comparison;
- monitoring;
- buyer journey;
- fast UX iteration.

### Legal liability / overconfidence

Mitigation:

- deterministic rules;
- provenance;
- unknown state;
- explicit scope;
- human review escalation.

### Government source changes

Mitigation:

- adapters;
- fixtures;
- scheduled health checks;
- versioned releases;
- source-specific fallback semantics.

### Low B2C repeat frequency

Mitigation:

- one-off pricing;
- Project Pass;
- professional recurring plans;
- B2B distribution.

### Data storage becomes large/costly

Mitigation:

- source-specific snapshot strategy;
- partitions/generalization/tiles;
- retain exact evidence required for historical analyses;
- benchmark before mirroring everything.

## 17. What not to build first

Do not prioritize before core scenario trust:

- generic open-ended nationwide AI chat;
- social/community feed;
- contractor advertising network;
- 3D metaverse-like parcel viewer;
- property valuation score;
- every construction category;
- automated government submission;
- international expansion.

## 18. Competitive success criteria

Krunditark has found a defensible position when users say something closer to:

> “I moved my planned sauna and immediately saw which problem disappeared, then I knew exactly what I still had to ask the municipality.”

rather than only:

> “It explained an Estonian construction law to me.”

The first is a workflow/product moat. The second is increasingly a commodity AI capability.
