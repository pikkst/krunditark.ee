# Product and Market Research Evidence — Krunditark

Research snapshot: **2026-08-15**

This file records external evidence used in product/architecture decisions. It is not a substitute for adapter-specific source verification or legal advice.

Because APIs, prices, laws and product capabilities change, implementation agents must re-check current official documentation when a task depends on a detail here.

## 1. MaRu / e-ehitus strategic direction

Maa- ja Ruumiamet publicly describes e-ehitus as a platform intended to bring building/planning information into a clearer user experience and acknowledges the complexity of construction-related regulation.

Official:

- https://maaruum.ee/blogi/mis-e-ehituse-platvorm
- https://www.maaruum.ee/ruumiloome-ehitus-ja-planeerimine/e-ehitus/e-ehitus

### Product implication

The public sector is actively improving the same broad information problem. Krunditark should not rely on “we aggregate public links” as its long-term differentiation.

## 2. EHR chatbot validates demand and creates competitive pressure

On 6 January 2026 MaRu described a future EHR chatbot vision that includes analyzing:

- whether a property can be built on and under what conditions;
- problems/opportunities visible in registry data;
- what a homeowner should do next.

Official:

- https://maaruum.ee/blogi/maru-asub-ehitisregistri-kasutamist-lihtsamaks-muutma-appi-tuleb-vestlusrobot

The same public post described substantial early usage of the assistant.

### Product implication

Krunditark must differentiate through:

- exact proposal geometry;
- variant comparison;
- persistent project history;
- immutable evidence;
- pre-purchase workflow;
- change monitoring;
- professional/B2B workflows;
- professional escalation.

Do not build “a better cadastral chatbot” as the product moat.

## 3. Address-first entry is feasible

MaRu introduced **In-AKS** in production from 27 April 2026, replacing In-ADS. Official documentation exposes API/Gazetteer endpoints for integrated address/location search.

Official:

- https://geoportaal.maaruum.ee/est/teenused/in-ads-in-aks/nb-muudatused-in-adsis-p1038.html
- https://geoportaal.maaruum.ee/est/teenused/integreeritav-aadressiotsing-in-ads-p504.html

The official predecessor documentation describes the integrated search service as free, fast and based on frequently updated official address data.

### Product implication

Landing should ask for **address or cadastral ID**, with map selection secondary. Requiring a cadastral ID alone would impose unnecessary friction.

## 4. PLANIS is a structured national planning dependency

PLANIS became the current planning workflow environment in 2026 and official guidance states WMS/WFS services remain available for established planning data.

Official:

- https://planeerimine.ee/digi/menetluse-infosysteem/
- https://planeerimine.ee/plank-juhendid/
- https://planeerimine.ee/juhendid-ja-uuringud/planeeringute-andmekogu-planis-juhendid/planeeringute-andmekogu-wms-ja-wfs-teenused/

### Product implication

Planning-area/metadata automation is realistic, but geometric overlap does not equal automatic interpretation of every textual plan condition.

## 5. EHR supports incremental change-oriented integration

The current EHR Buildings Actual Data API includes:

- `GET /v2/find/ehrcodes/dateafter` — returns up to 1000 current building EHR codes changed after a specified time;
- current building-data endpoints;
- version/change comparison endpoints.

Official:

- https://swaggerui.ehr.ee/ehitise_kehtivate_andmete_teenus

### Product implication

EHR integration should use an incremental cursor/change queue where permitted instead of refetching a national building corpus for every analysis.

Exact production access, rate limits, field/publicity and replication terms still require task-specific verification.

## 6. Riigi Teataja supports machine-readable legal change monitoring

Riigi Teataja FAQ documents public legal API/search use and current XML access. From 1 June 2026 individual act XML moved to a `/public-api/api/v1/akt/{id}/xml` path while general API use remains available.

Official:

- https://www.riigiteataja.ee/kkk

### Product implication

Run cheap daily legal version/hash/effective-date checks without Gemini. A detected law change becomes a review candidate; it does not automatically become a new production rule.

## 7. Current legal change risk is real

Kliimaministeerium stated that important construction-law changes entered into force on **1 August 2026**, including process simplifications and expanded cases where design conditions can replace a lengthy detailed-plan process.

Official:

- https://kliimaministeerium.ee/uudised/ehitamine-muutub-lihtsamaks

### Product implication

Static guidance can become obsolete quickly. Rule versions/effective dates/legal change watches and report timestamps are product necessities, not optional audit decoration.

## 8. Supabase anonymous Auth matches guest-first UX

Supabase supports `signInAnonymously()`:

- creates a real anonymous Auth user;
- uses the `authenticated` Postgres role;
- JWT contains `is_anonymous` for RLS distinction;
- user can later link an OAuth identity;
- anonymous account is not recoverable after session/browser state is lost unless linked.

Official:

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/auth/users

Supabase recommends abuse protection such as CAPTCHA for anonymous sign-ins.

### Product implication

A guest can own a temporary project securely before providing PII. Permanent identity is requested only when it adds value (save/pay/monitor/share/pro).

## 9. Production Auth email requires custom SMTP

Supabase's default SMTP is explicitly intended for exploration/testing, is restricted and has no production delivery SLA. Supabase recommends custom SMTP for production Auth email.

Official:

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/deployment/going-into-prod

### Product implication

Email OTP is a good UX, but public launch requires a Krunditark-controlled transactional email provider/domain setup and delivery monitoring.

## 10. ET/RU/EN localization has market basis

Statistics Estonia's 2021 census publication reports:

- Estonian is spoken/understood by about 84% of the population (67% native + 17% foreign language);
- English became the most common foreign language;
- Estonia is broadly multilingual.

Official:

- https://stat.ee/et/uudised/rahvaloendus-76-eesti-rahvastikust-oskab-monda-voorkeelt

Russian remains a major language in Estonia and existing property/planning businesses commonly provide ET/RU/EN service.

### Product implication

- ET canonical/default;
- RU and EN full localization targets;
- do not make RU/EN merely runtime model translation;
- critical legal/status/payment/privacy terminology is reviewed.

## 11. Existing professional services validate the problem/value

Examples of current Estonian private-sector services:

### Nord Property

Public pricing includes, among other items:

- municipality consultation around possible building rights/restrictions;
- building-rights/restrictions/constraints analysis for certain planning contexts around the hundreds-of-euros level;
- design-condition services.

Official company page:

- https://www.nordproperty.ee/teenused/hinnakiri

### CityEE

Public pricing lists document checks/consultations and permit-process management at materially higher prices than a proposed automated first-pass report.

Company page:

- https://cityee.ee/konsultatsioon/

### Vanarc

Offers land-use/building-right/risk/planning analysis and services to owners/developers/appraisers, with ET/EN/RU service.

Company page:

- https://vanarc.ee/

### Eri Kinnisvara

Public valuation/consulting prices provide another signal that due-diligence/property advice commands meaningful professional fees.

Company page:

- https://eri.ee/

### Product implication

These services are **not direct SaaS equivalents** and do not prove a specific Krunditark price.

They do show that users already pay meaningful amounts to reduce property/building uncertainty. A tens-of-euros automated source-backed first pass has a plausible value proposition if it is reliable and clearly scoped.

## 12. Payment-provider reality in Estonia

### Stripe

Current Estonia Checkout page lists:

- one-time payment support;
- subscription support through Stripe Billing;
- cards/wallets;
- standard European card price at 1.5% + €0.25 as of this research date.

Official:

- https://stripe.com/en-ee/payments/checkout

### Montonio

Current Estonian pricing advertises local bank payments, cards, Apple Pay/Google Pay with plan-based fees.

Official:

- https://www.montonio.com/et/hinnapaketid

### Product implication

Both are credible candidates; select one through an implementation-time ADR using current prices/capabilities/accounting requirements. Do not couple entitlements directly to a provider.

## 13. Supabase cost baseline

As of this review, Supabase lists:

- Free: $0;
- Pro from $25/month;
- Pro includes 100,000 MAU and 8 GB disk per project before stated overage pricing.

Official:

- https://supabase.com/pricing

### Product implication

Base infrastructure can begin modestly, but national PostGIS dataset size/compute must be benchmarked. Database/source maintenance is likely a more important cost driver than short Gemini explanations.

## 14. Gemini cost and lifecycle

Google's current Gemini API pricing lists low-cost Flash/Flash-Lite options, with per-million-token pricing. The same official page also documents model deprecations/shutdowns over time.

Official:

- https://ai.google.dev/gemini-api/docs/pricing

### Product implication

- Gemini text explanation cost is likely small relative to the value of a paid report;
- cache explanations;
- send compact structured evidence, not entire legal corpora;
- configure model server-side;
- re-evaluate model before releases;
- do not price the product based on pennies of LLM token usage.

## 15. Research-backed decisions summary

The external evidence supports these current product decisions:

1. **Address-first UX** is technically feasible through official MaRu services.
2. **Scenario modeling** is a stronger differentiator than a generic chatbot because the official e-ehitus direction already includes conversational buildability guidance.
3. **Hybrid refresh** is justified: different sources expose different freshness/change capabilities.
4. **Guest-first Auth** is supported by Supabase's anonymous user/RLS model.
5. **ET/RU/EN architecture** matches the Estonian user market better than Estonian-only hard-coded UI.
6. **One-time/project consumer pricing + Pro subscriptions** better matches episodic vs recurring jobs.
7. **No banner ads in findings** protects trust; professional referrals can be a separate later revenue line.
8. **Versioned rules/data** are necessary because construction law and official systems actively change.

## 16. Revalidation rule

Re-check external facts when:

- implementing an adapter;
- choosing payment/SMTP/analytics/provider;
- releasing a legal rule;
- changing Gemini model;
- preparing paid production launch;
- a source health monitor detects schema/version change;
- this evidence snapshot is older than the implementation team's defined review threshold.
