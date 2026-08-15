# Legal and Compliance Requirements — Krunditark

> Engineering/product compliance specification, not a substitute for professional legal review before public launch.

## 1. Product legal posture

Krunditark is a decision-support/information product.

It must not present itself as:

- an authority issuing permits;
- a substitute for a legally required application/coordination;
- a guarantee that a permit will be granted;
- a legal opinion;
- proof of land ownership;
- a professional engineering/survey/design certification.

## 2. User-facing disclaimer baseline

Every Ehituspass must communicate, in plain Estonian, that:

- analysis is based on the listed data sources and rules available to Krunditark at the stated time;
- some data may be incomplete, non-public or require authority/professional verification;
- official decisions are made by the competent authority;
- the user should verify critical findings through linked official sources/authority before acting.

Do not hide the disclaimer only in Terms of Service.

## 3. Legal source of truth

For Estonian legislation use **Riigi Teataja**:

- https://www.riigiteataja.ee/

Important legal families expected to affect the project include, depending on implemented scope:

- Ehitusseadustik (EhS), especially relevant annexes/tables;
- Planeerimisseadus (PlanS);
- Ehitusseadustiku ja planeerimisseaduse rakendamise seadus;
- Looduskaitseseadus;
- Muinsuskaitseseadus;
- Veeseadus and implementing requirements where relevant;
- Tuleohutuse seadus / fire-safety regulations where relevant;
- road/protection-zone provisions and implementing requirements;
- utility/network protection-zone rules;
- local-government regulations and established plans where applicable.

The list is not itself a ruleset.

## 4. Rule verification requirement

Before a legal rule version can be `verified`:

1. open the current official source in Riigi Teataja/competent authority source;
2. identify exact section/annex/paragraph/table row;
3. record the version/effective date;
4. encode only the supported interpretation;
5. add boundary tests;
6. record verifier + timestamp;
7. preserve the old rule version when law changes.

Do not use model memory or an old blog post to set a legal threshold.

## 5. Effective-date behavior

Law changes are expected.

Rules must support:

- `effective_from`;
- `effective_to`;
- publication/source identifier;
- historical analysis references.

When a law changes:

- add a new rule version;
- retire/end-date prior version as appropriate;
- do not rewrite historical analyses;
- optionally flag old reports as “newer rules are available”.

## 6. Planning-law limitation

National planning geometry may indicate that a plan applies, but detailed plan conditions can exist in drawings/text/files and municipal decisions.

Krunditark must distinguish:

- “plan detected”;
- “structured plan conditions checked”;
- “plan textual conditions not automatically verified”.

Never treat plan-area detection alone as full plan compliance.

## 7. Environmental-data limitation

Some protected nature information is not available in public views/services.

Therefore:

- public-source absence is not universal proof of no protected object;
- the report must identify the limitation where material;
- source access rules must be respected;
- do not attempt to bypass protected-data access controls.

## 8. Heritage limitation

Use official Muinsuskaitse/Kultuurimälestiste registry-linked data.

Where no stable public machine-readable service is verified:

- do not scrape around access controls;
- provide a manual verification path/official link;
- mark automation incomplete.

## 9. Source attribution and data terms

For each source, record:

- authority;
- official endpoint;
- terms/license page where available;
- attribution requirement;
- redistribution/cache constraints;
- update frequency.

Map and report attribution must satisfy source requirements.

See `DATA_SOURCES.md`.

## 10. Personal data / GDPR design

Krunditark will likely process personal data when accounts/projects exist even if underlying parcel geometry is public.

Before production, document:

- controller identity/contact;
- purposes;
- legal basis per purpose;
- categories of data;
- recipients/processors;
- international transfers if any;
- retention;
- data-subject rights;
- deletion process;
- security contact/incident process as appropriate.

Avoid collecting ownership/identity data not needed for product function.

## 11. Privacy notice

Public production requires an understandable privacy notice accessible from every page.

It must reflect actual behavior, including:

- Supabase;
- hosting/CDN as applicable;
- AI provider if enabled;
- email/auth provider behavior;
- analytics if enabled;
- logs/security processing;
- file uploads if enabled.

Do not copy a generic privacy policy that does not match implementation.

## 12. Analytics/cookies

Do not add non-essential tracking merely because a library makes it easy.

Before analytics:

- decide provider;
- document data collected;
- determine applicable consent/legal-basis behavior;
- ensure implementation matches decision;
- update privacy notice.

MVP can launch without analytics.

## 13. Terms of service

Before paid/public production, Terms should address at least:

- informational nature;
- no official approval guarantee;
- user responsibility to verify critical actions;
- account acceptable use;
- limitations around source availability;
- report currency/freshness;
- intellectual property/licensing;
- liability allocation subject to Estonian/EU consumer law review;
- payment/refund terms when paid features exist.

Professional legal review is recommended before monetization.

## 14. AI disclosure

AI-generated explanatory text should be distinguishable from official source text.

Never visually quote generated wording as though it came from an authority.

The factual status must remain available independently from the AI explanation.

## 15. Report provenance

Every report should show:

- analysis generation timestamp;
- parcel ID;
- proposal version;
- source retrieval/freshness summary;
- rule/legal source references;
- limitations/unknown categories;
- engine/report version.

Future downloadable/signed reports must preserve this metadata.

## 16. Cost information

Classify cost entries:

- **official fee** — amount from official source;
- **market estimate** — range from dated market dataset/methodology;
- **provider quote required** — no reliable automatic amount;
- **user quote** — user-supplied.

Never label a market estimate as an official fee.

## 17. Utility information

Network proximity does not equal:

- free capacity;
- guaranteed connection;
- guaranteed price;
- provider approval.

Use wording such as “nearest supported network feature detected” and link to provider verification where appropriate.

## 18. Local authority decisions

When the competent local authority must decide or coordinate:

- Krunditark may identify the likely competent authority from verified data/rules;
- provide official contact/service link;
- list documents/steps only when sourced;
- never say authority approval has been obtained unless an official connected record explicitly proves it.

## 19. Launch legal checklist

Before public production:

- [ ] supported legal rule matrix reviewed against current Riigi Teataja versions;
- [ ] source terms/attribution reviewed;
- [ ] privacy notice published;
- [ ] retention operationally implemented;
- [ ] AI provider privacy/data behavior reviewed if enabled;
- [ ] Terms published if accounts/paid service require them;
- [ ] disclaimer visible in report;
- [ ] critical unknown behavior verified;
- [ ] no claim of official authority status;
- [ ] municipal/source links verified;
- [ ] product owner/legal reviewer approves public wording.

## 20. Re-verification cadence

Because law, services and source schemas change:

- legal rule sources should have scheduled review metadata;
- provider adapters should have schema/source-health monitoring;
- a major source/legal change should trigger new rule/source versions and regression tests;
- do not depend on a foundation document dated 2026-08-15 as proof that law is still current later.
