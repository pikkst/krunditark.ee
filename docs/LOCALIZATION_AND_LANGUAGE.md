# Localization and Language Strategy — Krunditark

Last product review: **2026-08-15**

## 1. Decision

Krunditark is Estonia-only initially, but Estonia is multilingual.

Product-language priority:

1. **Estonian (`et`) — canonical product/legal terminology and default.**
2. **Russian (`ru`) — full consumer-product localization target.**
3. **English (`en`) — full consumer/professional localization target.**

The codebase must be i18n-ready from the first frontend implementation even if the first development build contains only Estonian copy.

Do not hard-code user-facing strings throughout components and plan to “translate later”.

## 2. Why ET/RU/EN

Statistics Estonia's 2021 census language results show a genuinely multilingual market: Estonian is spoken/understood by about 84% of the population; Russian is spoken as a mother tongue by 29% and as a foreign language by 38%; English is the most common foreign language and is especially important among younger users and international residents/professionals.

Official source:

- https://www.stat.ee/et/uudised/rahvaloendus-76-eesti-rahvastikust-oskab-monda-voorkeelt

Current Estonian building-rights/planning professional firms also commonly market services in Estonian, Russian and English. That is supporting market evidence, not an official requirement.

## 3. Canonical legal language

The authoritative legal source is the official Estonian source/version.

Riigi Teataja states that English translations are unofficial and only the Estonian text has legal force.

Therefore:

- deterministic rule metadata references the Estonian official act/section/version;
- user may read an RU/EN Krunditark explanation;
- translated text is explanatory, not a replacement for the official Estonian source;
- source link should lead to the official version; an unofficial translation may be offered as a convenience link when available and labeled appropriately.

## 4. What must be professionally/human controlled

Do not rely on runtime machine translation for safety-critical fixed product vocabulary.

Maintain a reviewed glossary for:

- building permit / building notice;
- use permit / use notice;
- design conditions;
- detailed plan / comprehensive plan;
- cadastral unit;
- restriction/protection zone;
- building exclusion zone;
- authority/coordination/consent;
- conflict / condition / unknown;
- data freshness;
- official source;
- analysis limitation;
- next action;
- legal disclaimer;
- payment/consumer terms.

Static UI, legal state labels, transactional email templates, privacy/terms and payment copy require reviewed translations before that locale is declared production-ready.

## 5. Role of Gemini in localization

Gemini may produce a plain-language explanation in the user's selected locale from the same deterministic structured finding.

It must not translate by reinterpreting the law independently.

Input should include:

- finding state/code;
- approved localized terminology;
- exact measurements;
- next action;
- official source metadata;
- limitations.

Output is validated and visibly an AI explanation when applicable.

Cache explanations by:

```text
analysis result hash
+ locale
+ prompt template version
+ Gemini model/config
```

Thus ET/RU/EN explanations do not require rebuilding the factual analysis.

## 6. Locale architecture

Recommended route strategy for production:

```text
/et/...
/ru/...
/en/...
```

The root `/` can detect browser preference for the initial presentation, but should use an explicit deterministic redirect/fallback and allow immediate manual switching.

During GitHub Pages/hash-router preview, equivalent locale state may be represented inside the hash route, but components and translation keys must not depend on the preview URL design.

Recommended application representation:

```ts
type AppLocale = "et" | "ru" | "en";
```

Use a mature i18n library compatible with React/TypeScript and lazy-loaded namespaces. Exact package can be chosen during implementation.

## 7. Locale fallback

Fallback order:

```text
selected locale
 -> Estonian canonical UI translation
 -> explicit missing-translation development error/log
```

Do not silently fall back to English for legal/status labels in production.

Development/CI should detect missing required keys.

## 8. Translation key design

Do not build keys from English sentences.

Prefer semantic keys:

```text
analysis.state.conflict.title
analysis.state.unknown.description
parcel.search.label
proposal.type.sauna
nextAction.verifyWithMunicipality
source.freshness.stale
billing.product.ehituspass.name
```

Rule/finding codes remain language-independent.

Example:

```text
Finding code: ROAD_PROTECTION_ZONE_INTERSECTION
State: condition

et: Kavandatav ehitis puudutab tee kaitsevööndit
ru: <reviewed localized label>
en: The proposed building intersects a road protection zone
```

Do not persist the rendered label as the domain fact.

## 9. Content categories

### A — Domain facts

Language-independent:

- IDs;
- geometry;
- measurements;
- states;
- rule codes;
- source object IDs;
- timestamps;
- source versions.

### B — Controlled localized product text

Translation catalog:

- navigation;
- forms;
- finding titles/templates;
- next-action labels;
- validation/errors;
- pricing UI;
- transactional templates;
- glossary.

### C — AI-generated explanation

Generated per locale, grounded in the same facts.

### D — Official-source content

Preserve source language and identity. Do not rewrite an official quote and present it as official translated text.

## 10. User locale selection

Selection precedence:

1. signed-in saved preference;
2. current URL locale;
3. explicit prior local preference;
4. supported browser language;
5. `et` default.

Changing language must:

- preserve current parcel/project/analysis;
- not rerun deterministic analysis;
- fetch/generate locale-specific explanation only if needed;
- change date/number/currency formatting appropriately.

## 11. Dates, numbers and units

Use `Intl` APIs rather than hand-built formatting.

Store canonical values:

- timestamps UTC;
- metric values as numbers;
- prices/currency as structured values;
- percentages only where the metric truly is a percentage.

Display examples must follow locale conventions.

Estonia product units remain metric in all three locales:

- m;
- m²;
- km;
- ha where useful.

Do not convert to imperial solely because UI language is English.

## 12. Address and names

Official address strings and place names come from official data and should generally not be machine-translated.

Do not translate:

- official street names;
- cadastral identifiers;
- plan titles unless a source provides a translated name;
- authority names in a way that makes source identity ambiguous.

A UI may provide an explanatory English/Russian description separately.

## 13. Search behavior

Address search uses official In-AKS data.

Search should tolerate user typing patterns as supported by the official service and should not require translated Estonian place names.

Do not build a second, model-generated address search layer.

## 14. SEO/localized public pages

Public marketing/help pages should eventually exist in ET/RU/EN with locale-specific metadata:

- page title;
- description;
- canonical/hreflang links;
- OpenGraph metadata;
- structured data where appropriate;
- sitemap entries.

Avoid thin auto-generated SEO pages for every cadastral parcel.

Parcel/project pages containing user analysis are private/noindex by default.

## 15. Legal documents

Before RU/EN production launch, localize at least:

- privacy notice;
- terms/service limitations;
- cookie/analytics consent if applicable;
- payment/refund information;
- AI disclosure;
- report disclaimer.

For legal terms, a qualified review is preferable to raw model translation.

If terms conflict, the service must state which version governs; this requires legal review before public commerce.

## 16. Email/notification localization

Auth and product emails must use user locale where known.

Examples:

- OTP/auth;
- payment receipt/order confirmation;
- report ready;
- newer data available;
- material project change;
- share invitation;
- account/privacy events.

Never put a material finding only in an email subject without enough context; link to the private report.

## 17. Support localization

Initial operational target:

- product UI: ET first, then RU/EN;
- support can accept ET/EN initially;
- do not advertise full RU human support unless staffing/process supports it.

AI may help translate support drafts internally, but privacy-sensitive tickets require controlled handling.

## 18. Release stages

### Development foundation

- i18n framework installed;
- all strings keyed;
- ET complete;
- pseudo-locale/missing-key CI available.

### Public beta

Preferred: ET complete and EN/RU core journey complete.

If launch capacity requires staging:

- ET launches first;
- language selector shows only fully supported locales;
- RU/EN are not shown as “coming soon” inside critical flows unless there is a real planned release.

### General availability

Target full ET/RU/EN coverage for:

- landing;
- parcel/proposal flow;
- Ehituspass;
- auth/account;
- pricing/payment;
- help/legal notices;
- transactional messages.

## 19. Translation QA

Every locale release tests:

- long labels/no overflow;
- Cyrillic font rendering;
- mobile layouts;
- map popup layout;
- status meaning unchanged;
- glossary consistency;
- source link remains correct;
- number/date/currency formatting;
- PDF/print layout;
- email templates;
- accessibility labels.

Automated snapshots can detect layout regressions, but domain translation should receive human review.

## 20. Acceptance criteria

Localization is production-ready when:

- no component contains scattered hard-coded user strings except explicitly exempt content;
- ET is canonical and complete;
- RU/EN only become selectable when the complete critical journey is translated;
- deterministic codes/states are locale-independent;
- official Estonian legal source remains identifiable from every translated finding;
- changing locale preserves project state and does not rerun GIS/rules;
- critical glossary terms are reviewed;
- translated AI explanation cannot change finding state/requirements;
- legal/payment/privacy pages have reviewed translations for enabled locales.
