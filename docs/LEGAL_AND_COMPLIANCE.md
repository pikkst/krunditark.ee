# Legal and Compliance Requirements — Krunditark

Last product/legal architecture review: **2026-08-15**

> Engineering/product compliance specification, not a substitute for professional Estonian/EU legal review before public paid launch.

## 1. Product legal posture

Krunditark is a decision-support/information product.

It must not present itself as:

- an authority issuing permits/approvals;
- a guarantee that construction is permitted;
- a substitute for required application/coordination;
- a legal opinion;
- proof of parcel ownership/title;
- professional engineering/survey/design certification;
- certified property valuation unless a separate qualified product is created.

This boundary must be visible in product copy, not buried only in Terms.

## 2. User-facing report disclosure

Every Ehituspass/Ostukontroll communicates in plain language:

- which parcel/scenario was checked;
- analysis date;
- exact data-release/source freshness;
- what categories were checked;
- what was not checked/unknown;
- deterministic finding state;
- official source/verification link;
- that competent authorities make official decisions.

Do not use “approved”, “legal to build”, or equivalent unless a connected official record actually proves that status and the feature is designed for it.

## 3. Legal source of truth

For Estonian legislation use **Riigi Teataja** and competent official authority sources.

Expected legal families, depending on implemented scope:

- Ehitusseadustik and annexes;
- Planeerimisseadus;
- EhS/PlanS implementation law;
- Looduskaitseseadus;
- Muinsuskaitseseadus;
- Veeseadus;
- fire-safety requirements;
- roads/protection zones;
- utility/network protection rules;
- KOV regulations/plans/decisions.

The list is not itself a ruleset.

## 4. Current-law volatility

Construction rules change. In 2026 significant Ehitusseadustik amendments entered into force on **1 August 2026**, including process simplifications described by Kliimaministeerium.

Official context:

- https://kliimaministeerium.ee/uudised/ehitamine-muutub-lihtsamaks
- https://www.riigiteataja.ee/

Therefore:

- never hard-code law from old memory/blog;
- legal watch checks current versions/effective dates;
- detected change creates review candidate;
- verified production rule changes only after human/admin review + tests;
- historical report retains original rule version.

## 5. Rule verification

Before `verified`:

1. open current official source;
2. identify exact section/annex/table row;
3. record act/document identifier and effective dates;
4. encode only supported interpretation;
5. add boundary/missing-fact tests;
6. record verifier/time;
7. preserve old version.

If a known law change may invalidate an active rule and review is incomplete, affected output must degrade safely rather than silently rely on known-obsolete semantics.

## 6. Planning-law limitation

National PLANIS geometry/metadata can show that a plan applies, but textual/drawing/local decision conditions may require additional interpretation.

Distinguish:

- plan detected;
- structured conditions checked;
- plan textual conditions not automatically verified;
- authority/manual review required.

Plan polygon intersection alone is not full compliance.

## 7. Environmental/sensitive data

Some environmental/protected data may be intentionally non-public.

- do not bypass access controls;
- public absence is not universal proof of no protected object;
- label limitation/unknown where material;
- respect source access/redistribution rules.

## 8. Heritage/roads/utilities

Only automate from verified authoritative machine-readable sources.

Where source/semantics incomplete:

- show official manual verification path;
- use `unknown`/condition;
- do not substitute an unofficial dataset as authority.

Utility proximity must never be presented as guaranteed capacity/connection/price.

## 9. Source attribution/terms

For every source:

- authority;
- official endpoint;
- terms/license page where available;
- attribution;
- replication/cache/redistribution constraints;
- semantic scope;
- refresh/freshness policy.

Map/report attribution must meet source requirements.

See `DATA_SOURCES.md` and `DATA_REFRESH_AND_CACHE.md`.

## 10. GDPR/privacy posture

Accounts/projects create personal data even when parcel geometry is public.

Private project intent may include:

- relationship between person and a parcel they are considering;
- planned home/sauna/building location;
- notes;
- uploads;
- reports/questions;
- billing/order history.

Before production document:

- controller identity/contact;
- purposes/legal bases;
- data categories;
- processors/recipients;
- international transfers;
- retention;
- data-subject rights;
- deletion/export;
- incident/security contact.

Do not collect landowner identity merely to analyze a parcel.

## 11. Privacy notice

Accessible from every public/app page and accurately reflects actual providers/features:

- Supabase;
- hosting/CDN;
- Gemini if enabled;
- SMTP/Auth;
- payment provider if enabled;
- analytics if enabled;
- logs/security;
- file uploads/sharing;
- professional partner handoff later.

No generic copied privacy policy.

## 12. Anonymous Auth/privacy

Guest-first Auth does not mean anonymous project data can be treated as non-personal by default.

Document:

- anonymous identifier/session handling;
- draft retention/cleanup;
- conversion to permanent account;
- abuse/CAPTCHA/security processing;
- loss/recovery limitations.

## 13. Analytics/cookies

Before non-essential analytics/tracking:

- choose provider;
- document data;
- determine consent/legal-basis/cookie behavior;
- minimize parcel/project detail;
- update privacy notice;
- implement preference/consent controls where required.

Do not add analytics just because SDK is convenient.

## 14. ET/RU/EN legal localization

Estonian is canonical for official Estonian legal-source identity.

For RU/EN product:

- critical terms/privacy/terms/payment/refund/disclaimer copy require reviewed translation;
- Gemini runtime translation is not sufficient for fixed legal/commercial text;
- translated explanation is not official translated authority text;
- official Estonian source remains linked/identifiable;
- if service Terms have multiple language versions, legal review must specify governing-version behavior before paid launch.

## 15. Terms of service

Before account/public paid launch address:

- service identity/contact;
- informational/decision-support nature;
- no authority approval guarantee;
- current-data/supported-scope limitations;
- acceptable use/abuse;
- account/security;
- intellectual property/source licensing;
- AI explanation boundary;
- payment/product entitlement;
- refunds/technical failure;
- digital content/service delivery;
- liability allocation subject to mandatory Estonian/EU consumer law;
- dispute/support process;
- professional/B2B differences later.

Professional legal review is required/recommended before monetization.

## 16. Paid consumer product / seller identity

Before taking money publish and configure the actual legal seller:

- legal entity/name;
- registry/contact details as required;
- VAT status/price presentation;
- support channel;
- payment methods;
- order confirmation/receipt/invoice behavior;
- refund/technical non-delivery process.

Do not finalize commercial legal copy until the owner identifies the operating entity and accounting/VAT setup.

## 17. Price presentation

Consumer pricing must clearly show:

- what product/analysis scope is purchased;
- one-time vs recurring nature;
- total price/tax presentation as applicable;
- duration/usage limits for Project Pass;
- renewal/cancellation for subscription products;
- what happens if report generation technically fails.

Do not preselect recurring subscription for an episodic purchase through dark patterns.

## 18. Digital content / withdrawal / refunds

Before paid launch obtain legal review for applicable EU/Estonian consumer rules concerning digital services/content, performance starting immediately, withdrawal rights/consent where relevant and refund obligations.

Engineering must support the resulting policy rather than invent it.

Technical principles independent of final legal policy:

- duplicate purchase can be identified;
- paid-but-unfulfilled report recoverable;
- no second charge required for technical retry;
- refunds auditable;
- order/report history retained as required.

## 19. Payment provider/compliance boundary

Prefer provider-hosted/secure checkout so Krunditark does not process raw payment credentials.

- provider terms/privacy reviewed;
- signed webhook verified;
- order price server-controlled;
- payment IDs kept only as needed;
- accounting records retained according to applicable law;
- payment provider listed in privacy/terms as appropriate.

See `COMMERCE_AND_ENTITLEMENTS.md`.

## 20. AI disclosure

AI-generated explanation must be visually distinguishable from official source wording.

Never quote generated text as authority quote.

Factual findings/source links remain accessible if AI is disabled/unavailable.

Private uploaded plans must not be sent to Gemini until the specific privacy/data-handling workflow is reviewed and disclosed as needed.

## 21. Report provenance

Every retained/downloadable report contains or can resolve:

- report/analysis ID;
- generated date;
- parcel;
- proposal version/scenario;
- data release/source dates;
- rule/effective references;
- unknown/unsupported categories;
- engine/report version;
- disclaimer.

Old reports are not silently rewritten.

## 22. Cost information

Every number classified:

- official fee;
- dated market estimate/range;
- provider quote required;
- user-supplied quote.

No Gemini-memory current pricing as factual cost.

## 23. Professional marketplace/referrals — future

Commercial partner relationship cannot affect automated findings.

Before launch define:

- partner qualification;
- clear sponsorship/referral disclosure;
- ranking neutrality;
- user consent before report/contact data shared;
- commission/lead model;
- complaints/conflicts of interest;
- professional opinion separate from automated report;
- liability/scope.

No programmatic/banner ads inside trust-critical Ehituspass/analysis workspace.

## 24. Share links — future

User opt-in only.

Legal/privacy design includes:

- scope;
- expiry/revocation;
- noindex;
- private notes/files excluded;
- recipient access disclosure;
- deletion behavior.

## 25. Existing-building/EHR privacy

Use only fields/data that current official access rules permit.

Do not assume attachments/documents are public because basic building facts are public.

Adapter implementation must re-check current EHR access/replication terms.

## 26. Product content/SEO

Law-dependent public content must show review/currentness and official sources.

Do not generate thousands of thin AI pages for cadastral parcels or municipalities.

Private project/report URLs are noindex by default.

## 27. Accessibility/transparency

Important legal/status information cannot rely on color/map alone.

Translated and accessible textual result must preserve:

- state;
- uncertainty;
- source;
- next action.

## 28. Launch legal/compliance checklist

Before free public beta:

- [ ] supported source terms/attribution reviewed;
- [ ] current legal rule matrix reviewed;
- [ ] privacy notice/controller identity;
- [ ] retention/deletion behavior;
- [ ] Auth/SMTP provider behavior disclosed as needed;
- [ ] AI privacy/data behavior reviewed if enabled;
- [ ] disclaimer/source freshness visible;
- [ ] enabled locale critical legal copy reviewed.

Before paid public launch additionally:

- [ ] seller legal entity/contact;
- [ ] VAT/accounting/price presentation reviewed;
- [ ] Terms published;
- [ ] payment provider terms/privacy/webhooks;
- [ ] refund/digital-content/withdrawal legal review;
- [ ] order confirmation/receipt/invoice behavior;
- [ ] paid technical-failure recovery;
- [ ] support/dispute path;
- [ ] translated commercial/legal pages for enabled locales.

Before marketplace/B2B later:

- [ ] partner/referral neutrality/disclosure;
- [ ] professional data sharing/consent;
- [ ] B2B terms/API licensing/attribution;
- [ ] organization/user roles/privacy.

## 29. Re-review triggers

Re-run legal/compliance review when:

- supported construction scenario changes;
- law/effective rules change;
- new official source is added;
- new locale is enabled;
- payment/provider/pricing model changes;
- private uploads/AI document parsing starts;
- analytics provider changes;
- partner/marketplace starts;
- official submission/delegation is considered;
- expansion outside Estonia is proposed.
