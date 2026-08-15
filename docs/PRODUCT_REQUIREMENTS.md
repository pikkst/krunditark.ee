# Product Requirements — Krunditark

## 1. Product vision

Krunditark makes the first stage of planning construction on an Estonian parcel understandable, evidence-based and significantly faster.

The product combines public/authoritative spatial and regulatory information into one project view and answers:

- What is known about the selected parcel?
- What known restrictions overlap the proposed building location?
- What planning information applies?
- Which supported permit/notification path is indicated by verified rules?
- What cannot yet be determined from available public data?
- Which authority/provider/source should the user verify next?

The first product is the **Ehituspass**.

## 2. Problem statement

A person considering a house, sauna, shed, garage or other structure must currently assemble information from multiple systems, laws, map layers, municipal documents and service providers. The information may be technically public but fragmented, differently structured, difficult to interpret, and updated on different schedules.

Krunditark must reduce this fragmentation without creating a false impression of official approval.

## 3. Target market

Initial scope: **Estonia only**.

Primary MVP user:

- private individual evaluating a construction idea on a selected parcel.

Secondary users after core MVP:

- property buyer;
- architect/designer;
- prefab-house seller;
- broker;
- small developer;
- surveyor/consultant.

## 4. Primary jobs to be done

### JTBD-1 — Understand a parcel

When I enter a cadastral identifier, I want Krunditark to find the correct parcel, show it on a map and summarize relevant official facts so I do not have to search several portals manually.

### JTBD-2 — Test a proposed location

When I place a proposed building on the parcel, I want to see which supported restrictions or conditions intersect that exact location, not merely generic parcel-level information.

### JTBD-3 — Understand the likely administrative path

When I describe the structure, I want to know which verified permit/notification path is indicated by supported rules and where to verify/apply officially.

### JTBD-4 — Understand uncertainty

When public or machine-readable data is incomplete, I want Krunditark to tell me exactly what it cannot determine and who/what should be checked next.

### JTBD-5 — Keep evidence

When I make a decision based on Krunditark, I want the result to show which official source, rule version and retrieval date supported it.

## 5. Product principles

1. **Evidence before explanation.**
2. **Unknown is better than invented certainty.**
3. **Map-specific analysis beats generic legal text.**
4. **AI explains; deterministic systems decide supported findings.**
5. **Every important result has provenance.**
6. **Official sources are preferred over secondary explanations.**
7. **The product must remain useful even when AI is unavailable.**
8. **The user should always know what to do next.**

## 6. MVP functional requirements

### PR-001 — Cadastral lookup

The user can enter a valid Estonian cadastral identifier.

System must:

- validate format;
- resolve authoritative parcel geometry and supported basic attributes;
- show source and retrieval timestamp;
- distinguish not-found from upstream-source failure.

### PR-002 — Parcel map

System displays:

- parcel boundary;
- map base layer;
- required attribution;
- key supported parcel facts;
- proposal layer when created.

### PR-003 — Proposed building

User can specify at least:

- structure category;
- footprint geometry;
- area/dimensions;
- height;
- storeys;
- intended use.

User can place/edit the footprint on the parcel.

### PR-004 — Server-side geometry validation

The server validates proposal geometry and computes authoritative project geometry metrics used by analysis.

### PR-005 — Supported spatial layers

MVP analysis must be able to consume selected supported layers from:

- Maa- ja Ruumiamet cadastral/restriction sources;
- PLANIS;
- EELIS/Keskkonnaportaal public layers;
- verified official heritage data source;
- verified road/access source relevant to state roads.

A layer is not considered supported until its adapter, semantics, provenance and tests are documented.

### PR-006 — GIS checks

System supports deterministic checks including:

- proposal vs parcel containment;
- proposal vs supported restriction geometry intersection;
- distances where a verified rule requires them;
- evidence geometry for user display.

### PR-007 — Versioned rules

Rules that convert facts into a project finding must be versioned and source-backed.

No production rule may be treated as verified solely because an LLM produced it.

### PR-008 — Permit-path classification

For explicitly supported structure categories and parameters, system evaluates verified current rules that indicate likely construction-notice/building-permit/project requirements.

Outside the supported matrix, result must be `unknown`/manual verification rather than extrapolation.

### PR-009 — Finding states

Every check produces one of:

- `clear`;
- `condition`;
- `conflict`;
- `unknown`.

State meaning must be consistent across UI/API.

### PR-010 — Ehituspass

An Ehituspass includes:

- selected parcel identity;
- proposal summary;
- analysis timestamp;
- source freshness summary;
- overall deterministic summary;
- findings grouped by category;
- critical unknowns;
- evidence/source links;
- next-step checklist;
- disclaimer.

### PR-011 — AI explanation

AI may turn structured findings into plain Estonian text.

Requirements:

- server-side only;
- provider-neutral interface;
- schema-validated response;
- cannot change finding state;
- can reference only supplied finding/source identifiers;
- deterministic fallback when AI fails.

### PR-012 — Saved projects

Authenticated user can save a project and create multiple immutable analysis snapshots over time.

### PR-013 — Analysis history

Past analysis remains reproducible with the rule/source snapshot metadata used at the time.

### PR-014 — Official-source navigation

Material findings provide direct official verification links where a stable link exists.

### PR-015 — Responsive and accessible UI

Core flow works on desktop and mobile.

State communication must not rely solely on color.

## 7. Non-functional requirements

### Reliability

- Failure of one independent provider must not turn its category into “clear”.
- Partial results may be returned when safely separable.
- Provider timeouts are classified explicitly.

### Security

- No elevated key in browser bundle.
- RLS on all client-accessible user tables.
- privileged operations server-side.
- least privilege and validated inputs.

### Privacy

- Do not collect parcel-owner identity for ordinary analysis.
- Minimize account data.
- Store only necessary AI prompts/responses, according to retention policy.

### Reproducibility

A completed structured analysis must be reconstructable from persisted identifiers/snapshots and rule versions without relying on the current mutable state of an LLM.

### Performance targets

Initial goals, subject to measurement:

- parcel lookup should normally feel interactive;
- map interactions remain responsive on mid-range mobile devices;
- expensive provider work must use timeout/caching controls;
- frontend map bundles should be lazy-loaded where practical.

Do not create fake progress percentages.

## 8. User-visible terminology

Preferred Estonian terms:

- Krunditark
- Ehituspass
- Katastritunnus
- Valitud kinnistu / valitud katastriüksus
- Kavandatav ehitis
- Piirang / kitsendus
- Planeering
- Vajab kontrolli
- Võimalik konflikt
- Ametlik allikas
- Andmete seis / kontrollitud
- Järgmine samm

Avoid claiming “lubatud” when system only knows that supported checks found no conflict.

## 9. Overall result semantics

The overall summary must not be a percentage.

Suggested user-facing levels:

- **Konflikt tuvastatud** — at least one supported verified blocking/conflict finding exists.
- **Tingimustega / vajab kontrolli** — no blocking conflict from supported checks, but one or more conditions/manual checks/critical unknowns remain.
- **Kontrollitud ulatuses konflikti ei tuvastatud** — supported required checks completed without conflict or critical unknown; wording must still state scope limitations.
- **Analüüs puudulik** — required source(s) unavailable or proposal outside supported scope.

## 10. Analytics and metrics

Before adding tracking, document privacy/legal basis.

Useful product metrics once approved:

- parcel lookup success rate;
- proposal creation completion;
- analysis completion rate;
- provider failure rate;
- number of `unknown` findings by source/category;
- source freshness age;
- official-link click-through;
- saved-project conversion;
- reanalysis usage.

Never optimize UX toward hiding uncertainty merely to improve conversion.

## 11. Explicit exclusions from product claims

Krunditark must not claim that it:

- grants a building permit;
- guarantees a building permit will be granted;
- replaces a local government decision;
- verifies legal ownership of the parcel by cadastral number alone;
- guarantees utility connection capacity/price;
- detects non-public protected data that it cannot legally access;
- replaces required professional design/survey/expert work.

See `MVP_SCOPE.md`, `LEGAL_AND_COMPLIANCE.md` and `AI_SAFETY_AND_EXPLANATIONS.md`.
