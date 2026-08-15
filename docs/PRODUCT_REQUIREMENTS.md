# Product Requirements — Krunditark

Last comprehensive product review: **2026-08-15**

## 1. Product vision

Krunditark is an Estonia-first property and buildability decision platform.

It helps a user move from:

> “I have this parcel / I am thinking about buying this land / I want to put this building here — where do I even start?”

into:

> “I understand the checked constraints, what remains unknown, which scenario is better, which source supports the result, and what I should do next.”

The initial flagship product is **Ehituspass**.

Krunditark is not an authority and does not issue permits, approvals, valuations or legal opinions.

## 2. Product category

Krunditark should be designed as a **decision/workflow product**, not as:

- a cadastral map viewer;
- a government portal clone;
- a generic legal-search website;
- an open-ended AI chatbot;
- a contractor advertising directory.

The differentiating product interaction is:

```text
real parcel
+ real user intent
+ exact proposed geometry/scenario
+ versioned official data
+ verified deterministic rules
= reproducible decision-support result
```

Then Gemini explains that result.

## 3. Target market

Initial geography: **Estonia only**.

### Primary consumer segments

1. homeowner planning a house/sauna/shed/garage;
2. prospective land buyer;
3. owner planning an extension/reconstruction later.

### Professional segments

1. architect/designer;
2. planning/property consultant;
3. prefab/modular-house seller;
4. broker;
5. developer/land investor;
6. appraiser/lender/due-diligence professional where scope permits.

See `USER_JOURNEYS_AND_PERSONAS.md`.

## 4. Core jobs to be done

### JTBD-1 — Find the correct parcel

When I know an address, cadastral ID or location, I want to identify the exact cadastral parcel without learning another portal first.

### JTBD-2 — Understand the parcel

I want one understandable summary of supported planning, restrictions, official facts and data freshness.

### JTBD-3 — Test my actual building idea

I want to place a house/sauna/etc. at an exact location and see what changes at that location, not merely generic parcel facts.

### JTBD-4 — Compare alternatives

If one location has a conflict, I want to move/rotate the building and compare the result instead of starting over.

### JTBD-5 — Understand administrative path

I want the supported current permit/notice/design-condition path explained as next actions with official links.

### JTBD-6 — Know what is unknown

I want the product to identify missing/private/unsupported/ambiguous data instead of guessing.

### JTBD-7 — Keep evidence

I want the report to remain tied to the exact data/rules/date used when I made the decision.

### JTBD-8 — Buy land more safely

Before buying, I want a supported risk/context screen and a list of questions I still need to resolve.

### JTBD-9 — Continue the project

As data/rules/design variants change, I want to keep history, rerun and see what changed.

### JTBD-10 — Work repeatedly as a professional

I want a faster, denser workflow, reusable templates, many projects, sharing/export and eventually API/batch capabilities.

## 5. Product principles

1. Evidence before explanation.
2. User intent before government terminology.
3. Unknown is better than invented certainty.
4. Map-specific scenario analysis beats generic legal prose.
5. AI explains; deterministic systems decide supported findings.
6. Every important result has provenance/freshness.
7. Every report ends with next actions.
8. Historical reports are immutable.
9. Guest value before registration.
10. Consumer pricing matches episodic use; subscriptions are for recurrent professional value.
11. Commercial partners/ads never influence findings.
12. The product remains useful when Gemini is unavailable.

## 6. Entry and discovery requirements

### PR-001 — Combined parcel search

User can start with:

- official address;
- cadastral identifier;
- map selection.

Address search should use official In-AKS or another approved official address source.

System must handle ambiguous addresses/multiple parcel candidates rather than silently selecting one.

### PR-002 — Free parcel overview

Before signup/payment show:

- selected parcel outline;
- address/cadastral ID;
- area/basic supported facts;
- source/freshness;
- supported analysis categories;
- current product limitations.

The free overview must not imply a reduced check is a complete “all clear”.

### PR-003 — Intent selection

Ask:

`Mida soovid selle krundiga teha?`

At minimum:

- build something;
- consider buying;
- understand restrictions;
- later modify existing building;
- professional workflow.

## 7. Proposal/scenario requirements

### PR-010 — Beginner building templates

For supported types, ordinary users can choose a structure and starting dimensions without drawing GIS polygons.

Initial verified candidates may include:

- detached house;
- sauna;
- shed/auxiliary building;
- garage/auxiliary building.

A candidate is not legally supported until the current rule matrix is verified.

### PR-011 — Proposal parameters

Collect only rule-relevant fields initially:

- structure type;
- footprint/dimensions/area;
- height;
- storeys;
- intended use;
- scenario type where relevant.

### PR-012 — Map placement

User can:

- drag;
- rotate;
- resize numerically;
- reset;
- duplicate variant.

Advanced mode can provide polygon editing/import.

### PR-013 — Authoritative geometry validation

Server/PostGIS validates geometry and computes authoritative metrics.

Browser preview is not legal/spatial authority.

### PR-014 — Scenario versions

Proposal changes create versioned scenarios once tied to analysis history.

Do not overwrite geometry underlying a completed report.

### PR-015 — Variant comparison

User can compare at least two scenario versions and see exact finding differences.

Do not use an opaque “buildability percentage”.

## 8. Official-data platform requirements

### PR-020 — Versioned data releases

Normal analysis reads a verified internal data release rather than querying every upstream source.

Heavy replicated spatial data uses scheduled synchronization; source-specific change watches may be more frequent.

### PR-021 — Source registry

Every supported source/layer declares:

- authority;
- endpoint/access method;
- semantic scope;
- refresh strategy;
- freshness limits;
- replication/retention policy;
- attribution;
- failure impact;
- normalizer version.

### PR-022 — Last-known-good behavior

A failed source update never silently replaces a good production release.

Stale data is labeled and can degrade a category to partial/unknown under policy.

### PR-023 — Legal change detection

Riigi Teataja/current legal sources are monitored for version/hash/effective-date changes without using Gemini.

Detected legal change creates a review candidate; it does not automatically rewrite/promote a production rule.

### PR-024 — Historical data manifest

Each completed analysis identifies exact:

- data release;
- dataset versions;
- rule versions;
- engine/profile version;
- parcel/proposal snapshot.

See `DATA_REFRESH_AND_CACHE.md` and `DATABASE_SCHEMA.md`.

## 9. Core source coverage

A layer/source becomes production-supported only after technical, semantic, attribution/terms and test review.

Priority sources:

- Maa- ja Ruumiamet cadastral/constraint data;
- In-AKS address search;
- PLANIS planning data;
- EELIS/Keskkonnaportaal selected public layers;
- Muinsuskaitse authoritative data where machine-readable path is verified;
- Transpordiamet/official road context;
- EHR/e-ehitus public API fields as verified;
- Riigi Teataja current legal sources;
- later utility/terrain/flood/geology sources.

No scraping shortcut where a suitable official machine-readable source exists.

## 10. GIS requirements

### PR-030 — Parcel containment

- contained;
- crossing;
- touching;
- metric boundary distance.

### PR-031 — Constraint intersection

- correct source/domain-specific spatial predicate;
- intersection/distance measurement where meaningful;
- evidence geometry.

### PR-032 — CRS correctness

Authoritative Estonia metric calculations normally use EPSG:3301 or explicitly justified metric CRS.

### PR-033 — Geometry evidence

Every spatial material finding can point to a user-safe evidence geometry/measurement and source object/version.

### PR-034 — Boundary regression tests

Touching/near-threshold/invalid/multipolygon/hole cases are tested deterministically.

## 11. Rules engine requirements

### PR-040 — Versioned deterministic rules

Rules have:

- stable code;
- immutable version;
- effective dates;
- status draft/verified/retired;
- official source reference;
- deterministic evaluator;
- tests;
- verification metadata.

### PR-041 — No LLM authority

No production legal/spatial status may rely on Gemini/model memory.

### PR-042 — Permit/process path

For supported structure/scenario matrix, derive supported current process implications.

Outside supported scope, return unknown/manual verification.

### PR-043 — Protection-zone semantics

Intersection is a fact; whether it means prohibition, condition, consent/coordination or manual review is determined by verified rule semantics.

Do not turn every protection zone into “cannot build”.

### PR-044 — Planning completeness

Plan polygon presence does not mean all plan textual conditions have been interpreted.

The report explicitly identifies textual/local planning gaps.

## 12. Finding/Ehituspass requirements

### PR-050 — Finding states

- `clear`;
- `condition`;
- `conflict`;
- `unknown`.

Severity/priority is separate.

### PR-051 — Overall summary

Use scope-aware labels:

- Conflict detected;
- Needs further checking;
- No conflict detected within checked scope;
- Analysis incomplete.

No fake probability.

### PR-052 — Finding anatomy

Every material finding exposes:

- title/state;
- factual summary;
- trigger/measurement;
- next action;
- official source;
- source/data date;
- legal/rule reference where relevant;
- map evidence where spatial.

### PR-053 — Next-step plan

Actions are ordered by blocker/dependency and labeled as:

- necessary check;
- likely process step;
- recommendation;
- optional preparation.

### PR-054 — Printable/exportable report

Report retains:

- report ID/date;
- parcel/proposal;
- data/rule basis;
- findings/unknowns;
- sources;
- disclaimer;
- map attribution.

## 13. AI requirements

### PR-060 — Google Gemini provider

Initial production AI provider is Google Gemini API via server-side adapter.

Model ID remains server configuration because provider model lifecycles change.

### PR-061 — Explanation-only

Gemini may:

- explain finding;
- summarize approved evidence;
- answer scoped follow-up;
- produce selected-locale plain language.

It cannot:

- change state;
- invent source;
- invent current price/capacity/permit;
- replace missing evidence.

### PR-062 — Structured validation

AI output schema validated; references restricted to supplied finding/source IDs.

### PR-063 — AI fallback/cache

- factual report works without AI;
- deterministic template fallback;
- explanation cached by result/locale/model/prompt version;
- sync jobs use zero Gemini tokens by default.

## 14. Authentication/onboarding requirements

### PR-070 — Guest-first

No mandatory account before meaningful parcel/proposal value.

Use Supabase anonymous Auth when stateful guest ownership is needed.

### PR-071 — Permanent identity

Primary consumer methods:

- email OTP;
- Google OAuth.

No password required by default.

### PR-072 — Preserve guest work

Anonymous -> permanent conversion retains same project/proposal.

### PR-073 — Production email

Custom SMTP required before public OTP/email auth.

### PR-074 — Account privacy

Projects private by default; share is opt-in/revocable.

See `AUTH_AND_ONBOARDING.md`.

## 15. Localization requirements

### PR-080 — i18n architecture from first UI

No scattered hard-coded user strings.

### PR-081 — Locale priority

- ET canonical/default;
- RU full consumer target;
- EN full consumer/pro target.

Only fully complete critical locales are selectable in production.

### PR-082 — Canonical legal source

Official Estonian legal source remains traceable in every locale.

### PR-083 — Reviewed glossary

Critical legal/state/payment/privacy vocabulary is human controlled/reviewed.

See `LOCALIZATION_AND_LANGUAGE.md`.

## 16. Commerce requirements

### PR-090 — Hybrid product model

Recommended product architecture supports:

- free parcel overview;
- one-time Ostukontroll;
- one-time Ehituspass;
- limited-duration Project Pass;
- professional subscription/usage plan later;
- B2B/API later.

Pricing values are configuration/catalog data, not hard-coded legal/business rules.

### PR-091 — Provider-neutral payment domain

Order/payment/entitlement model is independent from Stripe/Montonio/etc.

### PR-092 — Verified payment state

External payment webhook/server verification grants entitlement; client redirect alone does not.

### PR-093 — Idempotent recovery

- duplicate webhook safe;
- retry safe;
- payment succeeds/browser closes -> recoverable;
- report generation failure does not require second payment.

### PR-094 — No trust-conflicting ads

No programmatic/banner advertising inside report/analysis workspace.

Future sponsored/referral provider content is separate, labeled and cannot affect findings/ranking.

See `BUSINESS_MODEL_AND_PRICING.md`.

## 17. Ostukontroll requirements

Post-core consumer product.

### PR-100 — No exact proposal required

Buyer can analyze supported parcel-level context before selecting a final house.

### PR-101 — Buyer report

Includes:

- planning;
- restrictions;
- environment/heritage/road;
- existing buildings where supported;
- important unknowns;
- questions for seller/KOV;
- source dates;
- `Testi siia maja` upgrade.

### PR-102 — Ownership wording

Never call searched parcel “your property” merely because user analyzed it.

## 18. Project lifecycle/change monitoring requirements

### PR-110 — Persistent project

Project contains proposal versions, analyses, next actions and later files/collaborators.

### PR-111 — New-data signal

When new verified release/rules exist, mark `newer_data_available` without mutating old report.

### PR-112 — Analysis diff

Later compare factual state/source/rule/measurement changes separately from AI wording changes.

### PR-113 — Notifications

Only send useful project/account/payment/security/change notifications; preferences required for non-mandatory types.

## 19. EHR/existing-building requirements

### PR-120 — Official API only

Use documented EHR/e-ehitus APIs; do not scrape UI.

### PR-121 — Public-data limitations

Do not assume document attachments are always public/replicable; access/privacy rules can change.

### PR-122 — Incremental sync

Use source change endpoints such as changed-after where suitable rather than full refetch.

### PR-123 — Separate scenario profiles

Extension/reconstruction/demolition/use-change logic uses explicitly verified rule profiles, not new-building rules by default.

## 20. Utility/site intelligence requirements

Post-core.

### PR-130 — Utility semantics

Always separate:

- infrastructure/proximity;
- service area;
- capacity;
- connection eligibility;
- final quote.

Only supported evidence can populate each.

### PR-131 — Cost estimates

Every price/range has source/date/region/method/assumptions.

### PR-132 — Terrain/flood/geology

Treat as source-backed risk/site context with correct limitations, not engineering certification.

## 21. Professional requirements

### PR-140 — Pro mode

Same truth engine, denser workflow.

### PR-141 — Organizations

Team projects/roles/entitlements/audit later.

### PR-142 — Templates/exports

Reusable building/client templates and client-ready reports.

### PR-143 — Batch/API

Versioned, metered, tenant-isolated and source-attributed.

## 22. Professional-review/marketplace requirements

### PR-150 — User-controlled escalation

User can intentionally share structured report with a professional.

### PR-151 — Separate opinions

Professional review/opinion is stored and labeled separately from automated findings.

### PR-152 — Commercial neutrality

Paid relationship/lead commission never changes automated result or hides an organic next action.

## 23. Accessibility/responsiveness

### PR-160

Target WCAG 2.2 AA.

Core consumer journey works mobile and desktop.

Every map result has a textual equivalent.

## 24. Performance/reliability

### PR-170

- heavy map code lazy-loaded where practical;
- normal analysis uses local data releases;
- source failure never becomes clear/no-result silently;
- source/analysis/cache behavior observable;
- no fake progress;
- Gemini failure isolated.

## 25. Security/privacy

### PR-180

- RLS ownership isolation;
- no secrets browser-side;
- admin server-side;
- input/resource limits;
- SSRF-safe source adapters;
- privacy minimization;
- no parcel-owner identity collection for ordinary analysis;
- deletion/export/retention documented;
- payments/webhooks verified;
- share links high entropy/revocable.

## 26. Analytics/product-quality requirements

### PR-190

Product analytics is data-minimizing and does not send full address/cadastral geometry/project notes to third-party analytics by default.

### PR-191

Measure trust/quality alongside conversion:

- source freshness;
- unknown rate/reason;
- data-error reports;
- user helpfulness;
- refunds/report failures.

### PR-192

A/B tests may not vary factual findings/source/critical-warning visibility.

See `PRODUCT_ANALYTICS_AND_GROWTH.md`.

## 27. Explicit product exclusions/claims

Krunditark must not claim it:

- issues a building permit;
- guarantees authority approval;
- proves parcel ownership;
- replaces required professional design/survey/legal work;
- detects intentionally non-public protected data;
- guarantees utility capacity/connection price;
- provides certified property valuation unless a separate qualified product exists;
- turns AI output into official source text.

## 28. Public paid-launch completion gate

Before charging ordinary users for Ehituspass:

- address/parcel discovery works;
- core supported source data current/versioned;
- legal rule matrix reviewed/current;
- data freshness visible;
- guest->account transition works;
- paid report recoverable;
- RLS/security checks pass;
- no AI dependency for factual result;
- source/unknown limitations clear;
- sample report exists;
- ET production copy complete;
- enabled RU/EN critical flows fully localized;
- commerce/privacy/terms/refund behavior reviewed;
- support can trace a report/order safely;
- accessibility/E2E core journey passes.

## 29. Long-term success definition

Krunditark succeeds when a user can make materially better early property/construction decisions faster, while professionals can reuse the same trustworthy data/analysis engine at scale.

The moat is not that the product can answer a construction question in natural language. It is that it can preserve and compare **exact spatial scenarios with reproducible evidence and current verified rules** throughout a real project lifecycle.
