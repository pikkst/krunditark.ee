# Product Analytics and Growth — Krunditark

Last product review: **2026-08-15**

## 1. Principle

Krunditark should measure whether it helps people make better next decisions, not merely whether they clicked more buttons.

Analytics must never incentivize hiding uncertainty or overstating buildability.

Before any third-party analytics SDK is enabled, complete the privacy/legal-basis decision in `SECURITY_PRIVACY.md` and `LEGAL_AND_COMPLIANCE.md`.

## 2. North-star outcome

A useful primary product outcome is:

> **Completed decision-ready project check**

Definition: a user selected a real parcel, defined a relevant intent/proposal, received a completed supported analysis, and viewed at least one next action/source or meaningfully compared a variant.

This is more useful than raw page views or chat-message count.

## 3. Funnel

### Discovery funnel

```text
landing visit
 -> search started
 -> parcel result found
 -> parcel selected
 -> free parcel overview viewed
```

### Intent/proposal funnel

```text
parcel selected
 -> intent selected
 -> building template/proposal started
 -> valid proposal placed
 -> analysis pre-check reached
```

### Commercial funnel

```text
paid product shown
 -> auth conversion
 -> checkout started
 -> payment confirmed
 -> paid report completed
 -> paid report reopened/shared/action taken
```

### Value/retention funnel

```text
report completed
 -> source/next action viewed
 -> proposal variant created OR project saved
 -> reanalysis after new data
 -> monitoring retained / Pro repeat use
```

## 4. Key metrics

### Acquisition

- unique privacy-safe sessions;
- source/referrer/campaign where consent/legal basis allows;
- organic search landing pages;
- direct/partner/referral distribution.

### Activation

- search success rate;
- parcel-selection completion;
- time to first parcel overview;
- intent-selection rate;
- valid proposal-placement rate;
- analysis-start rate.

### Trust/quality

- percentage of reports with critical `unknown`;
- unknown reason distribution;
- source link click-through;
- `Teata võimalikust andmeveast` rate;
- analysis result helpful/not-helpful feedback;
- false-positive/false-negative reports after review;
- stale-source exposure;
- rule/source version incidents.

A rising `unknown` rate is not automatically bad; it may indicate safer semantics or a broken source. Diagnose it rather than optimizing it blindly downward.

### Commercial

- free-to-paid conversion;
- conversion by product (Ostukontroll/Ehituspass/Project Pass);
- average order value;
- refund rate;
- paid report completion failure rate;
- contribution margin per paid report;
- Project Pass variant utilization;
- Pro trial/subscription conversion later;
- churn/cancellation for professional plans;
- B2B API usage/revenue later.

### Retention

B2C retention is project-based rather than daily-app retention.

Useful metrics:

- project reopened within 7/30/90 days;
- variant comparison used;
- newer-data reanalysis rate;
- report/share/export reuse;
- Project Pass active-period engagement.

Do not judge consumer product health by daily active user/monthly active user ratios designed for social apps.

### Professional

- active projects/user/month;
- analyses/project;
- repeat parcels/clients;
- templates reused;
- exports/shared reports;
- seats active;
- API calls/useful result rate later.

## 5. Event taxonomy

Use semantic versioned events, not ad-hoc component click names.

Examples:

```text
landing_viewed
parcel_search_started
parcel_search_succeeded
parcel_search_failed
parcel_selected
parcel_overview_viewed
intent_selected
proposal_template_selected
proposal_placed
proposal_validated
analysis_started
analysis_completed
analysis_partial
finding_opened
source_link_opened
next_action_opened
proposal_variant_created
variant_comparison_viewed
account_conversion_started
account_converted
checkout_started
payment_confirmed
report_paid_completed
report_reopened
report_shared
newer_data_available_shown
reanalysis_started
feedback_submitted
source_error_reported
```

Properties should use coarse/domain-safe values:

```text
locale
intent
structure_type
analysis_state
unknown_category_count
product_code
anonymous_or_permanent
platform/mobile-desktop
```

Do **not** send to a third-party analytics provider by default:

- full address;
- cadastral ID;
- proposal coordinates/GeoJSON;
- user notes;
- uploaded plans;
- source documents;
- email/name;
- AI prompt/answer;
- payment identifiers;
- auth/session tokens.

## 6. First-party analytics preference

Because parcel/project data can reveal personal plans even when public cadastral information is involved, prefer a data-minimizing analytics approach.

Options at implementation time should be evaluated for:

- EU data location/processing;
- cookie requirements;
- IP handling;
- consent mode;
- self-hosted/first-party feasibility;
- cost;
- deletion/export;
- SDK bundle size.

The project may initially use server-side first-party product-event tables for core funnel/quality metrics and add a public-web analytics provider only after privacy review.

Do not select Google Analytics or another provider by default merely because it is common.

## 7. Experimentation rules

A/B tests may optimize:

- landing message;
- search CTA;
- auth timing;
- pricing presentation;
- product bundle presentation;
- onboarding help;
- report information hierarchy.

A/B tests must **not** vary:

- factual finding state;
- legal rule application;
- source visibility;
- critical unknown visibility;
- warning severity;
- official source attribution.

Trust/safety presentation is not a dark-pattern playground.

## 8. Pricing experiments

Recommended early tests:

- Ehituspass €19.90 vs €24.90 vs €29.90 by controlled periods/cohorts;
- one-off Ehituspass vs Project Pass upsell;
- Ostukontroll price credit toward later Project Pass;
- Pro waitlist pricing interviews before implementing billing.

Track:

- conversion;
- total contribution, not just conversion;
- refund/support burden;
- report usefulness;
- variant usage;
- acquisition channel.

Do not permanently personalize legal-service price based on inferred vulnerability or parcel value without explicit ethical/legal review.

## 9. User research program

Analytics cannot explain all friction.

Before public beta, recruit at least:

- 5–10 homeowners/small-building planners;
- 5 prospective land buyers;
- 3–5 architects/designers;
- 2–3 brokers/prefab sellers/developers.

Tasks:

- find a real parcel without being told where the cadastral ID is;
- place a sauna/house;
- interpret one conflict and one unknown;
- identify next action;
- compare a second placement;
- explain in their own words what Krunditark does/does not guarantee;
- assess willingness to pay.

Record themes, not just opinions about colors.

## 10. Feedback loops

### Report feedback

Small component:

`Kas see kontroll aitas sul otsustada, mida edasi teha?`

- Jah
- Osaliselt
- Ei

Optional reason categories:

- explanation unclear;
- important data missing;
- result seems wrong;
- next step unclear;
- source outdated;
- other.

### Data error feedback

`Teata võimalikust andmeveast`

Automatically attach safe:

- analysis ID;
- finding ID;
- source/version IDs;
- application version.

Do not ask user to retype technical context.

### Professional feedback

Allow a reviewer to flag:

- source mapping issue;
- rule semantic issue;
- local condition not captured;
- false conflict;
- missing restriction.

These flags feed the rule/source improvement backlog, not automatic rule changes.

## 11. Growth loops

### Share loop

A user shares a read-only report with:

- partner/family;
- architect;
- broker;
- seller;
- bank adviser.

Shared report contains Krunditark branding and `Kontrolli teist krunti` CTA, but no aggressive upsell.

### Professional handoff loop

Consumer report -> professional review -> professional adopts Pro workspace -> creates more reports for clients.

### Prefab loop

House seller -> customer parcel fit check -> qualified lead/project -> report shared back to seller.

### Content loop

Source/rule research -> reviewed explanatory content -> organic search -> parcel check -> real project.

Articles must remain versioned/date-reviewed so content does not become stale legal SEO spam.

### Change-monitoring loop

Project saved -> new data/rule release -> useful notification -> reanalysis -> project retained.

## 12. SEO architecture

Useful public pages:

- product/use-case pages;
- reviewed guides;
- glossary;
- municipality/process explanations only where maintained;
- source/methodology pages.

Do not index private project/report pages.

Do not generate one public page per cadastral unit.

Use ET/RU/EN hreflang/canonical metadata when localized content is complete.

## 13. Partner attribution

For B2B/referral links, support first-party partner attribution:

- partner code/campaign;
- signed/referrer context;
- order attribution;
- no access to unrelated user project data;
- partner only receives lead/project info after explicit user action/consent.

## 14. Operational product dashboard

Internal dashboard should eventually show:

### Product

- search -> parcel -> proposal -> report funnel;
- paid conversion;
- report outcomes;
- variant usage;
- language breakdown.

### Trust

- source freshness;
- source failures;
- unknown rates;
- error reports;
- rule-review backlog;
- stale legal candidates.

### Economics

- revenue;
- payment fees;
- refunds;
- Gemini cost/tokens;
- Supabase/infra cost allocation;
- contribution/report;
- professional MRR later.

Never give product managers a conversion dashboard without the trust-quality dashboard next to it.

## 15. Launch targets vs hard promises

Do not encode arbitrary growth targets as engineering acceptance criteria.

At beta, use thresholds as investigation signals, for example:

- unusually low parcel-search success -> investigate search/data;
- high proposal abandonment -> usability study;
- high paid report failure -> stop/repair checkout/report flow;
- high `result seems wrong` feedback -> source/rule audit;
- high refund -> reassess product promise/pricing.

## 16. Analytics implementation requirements

- event schema versioned;
- typed client/server event helpers;
- consent/privacy mode respected;
- no secrets/PII in event payload;
- server events for payment/report completion are authoritative;
- client events cannot grant entitlements;
- data retention documented;
- user deletion/export behavior documented;
- staging/test events separated from production;
- analytics failure never blocks product flow.

## 17. Definition of growth success

Krunditark grows sustainably when:

- users can find a parcel without expert knowledge;
- users understand and trust the result;
- enough real decision-makers are willing to pay for a report/project workflow;
- professional users return with new projects;
- source/rule quality improves with usage;
- growth does not depend on hiding uncertainty or adding intrusive advertising.
