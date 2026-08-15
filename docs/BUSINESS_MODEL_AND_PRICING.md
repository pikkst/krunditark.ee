# Business Model, Pricing and Unit Economics — Krunditark

Last product review: **2026-08-15**

This document defines the recommended commercial model. Prices are **launch hypotheses**, not permanent architecture constants. They must be validated with real customers and can be changed without changing analysis semantics.

## 1. Core commercial principle

Krunditark solves an episodic but financially meaningful problem for consumers and a recurring workflow problem for professionals.

Therefore the recommended model is **hybrid**:

- free parcel discovery / trust-building;
- one-time paid reports for consumers;
- project-duration package for active builders;
- recurring subscription/credits for professionals;
- B2B/API plans later;
- clearly separated professional referral/marketplace revenue later;
- **no programmatic/banner advertising inside the trust-critical product**.

A single consumer monthly subscription should **not** be the main model. Most private users do not need parcel/buildability analysis every month indefinitely.

## 2. Why not advertising as the primary model

Krunditark needs users to trust that a finding is neutral.

Ads from:

- prefab-house companies;
- architects;
- utility vendors;
- contractors;
- real-estate brokers

next to a regulatory finding can create the perception that findings or recommendations are influenced by advertisers.

Therefore:

- no display/programmatic ads in Ehituspass;
- no paid partner can change a finding, source, risk state or ranking;
- sponsored/referral offers, if introduced, appear in a clearly separate `Leia spetsialist` / `Küsi pakkumist` area;
- sponsorship must be visibly labeled;
- organic next-action guidance comes before commercial providers.

Trust is a more valuable asset than short-term ad CPM revenue.

## 3. Recommended consumer product ladder

### Free — Krundi ülevaade

Price: **€0**

Goal: remove uncertainty and prove the product works before asking for money.

Includes:

- search by address/cadastral ID/map;
- parcel boundary;
- basic supported parcel facts;
- data freshness;
- available analysis categories;
- ability to start placing a building template;
- sample/demo Ehituspass.

Do not intentionally display an incomplete check as a green “all clear”.

### Ostukontroll

Initial price hypothesis: **€14.90–€19.90 per parcel**

Target:

- land buyer;
- broker client;
- investor doing early screening.

Includes supported parcel-level risk/context checks without requiring a final building footprint:

- planning context;
- registered restrictions;
- environmental/heritage/road context where supported;
- existing EHR building context where supported;
- important unknowns;
- questions to ask seller/KOV;
- source dates and links.

Upgrade path:

`Testi siia konkreetset maja` -> Ehituspass / Project Pass.

### Ehituspass

Recommended launch test price: **€24.90**

A/B willingness-to-pay test candidates:

- €19.90;
- €24.90;
- €29.90;
- later €39.90 if completion/value data supports it.

Includes:

- one exact proposal version;
- full supported deterministic checks;
- permit/process path for supported structure type;
- all evidence/source links;
- AI/plain-language explanation;
- next-step checklist;
- printable/PDF-friendly report;
- limited rerun window for technical correction/recovery, not unlimited new projects.

This is the default one-off product.

### Projektipass

Recommended launch hypothesis: **€49.90 per parcel/project for 90 days**

Target:

- family planning a house;
- active homeowner comparing placement variants.

Includes:

- one parcel/project;
- up to a reasonable number of proposal variants (initial hypothesis: 5);
- compare variants;
- reanalysis when a new supported data/rule release appears during active period;
- report history;
- share/export;
- larger AI question allowance;
- project-change notification.

This solves the “I need this for a few months, not forever” problem better than a permanent consumer subscription.

### Krundivalvur — later

Optional annual monitoring add-on hypothesis: **€19–29/year per project/parcel**.

Only useful after the change-detection engine can tell a user something meaningful.

Includes notifications for:

- newer Krunditark data release;
- material rule change;
- supported plan/restriction change affecting saved proposal.

Do not sell monitoring before the product can reliably compute material diffs.

## 4. Professional plans

Professional pricing should be based on recurring workflow value, not Gemini token cost.

### Pro

Initial hypothesis: **€69–€89/month**

Target:

- architect;
- designer;
- broker;
- consultant;
- small prefab seller.

Possible included value:

- multiple active projects;
- included analysis credits;
- professional/advanced mode;
- client-ready exports;
- saved templates;
- report sharing;
- change alerts;
- priority support;
- lower incremental analysis price.

Do not promise unlimited expensive analyses before real workload metrics are known.

### Team

Initial hypothesis: **€179–€249/month**

Target:

- design office;
- developer;
- prefab manufacturer;
- brokerage/development team.

Possible:

- several seats;
- shared workspace;
- larger included usage pool;
- team roles;
- audit/activity log;
- organization billing;
- priority data/support;
- CSV export.

### Developer / API

Later starting hypothesis: **from €299/month + usage**.

Use cases:

- batch parcel pre-screening;
- prefab fit-check widget;
- broker listing enrichment;
- internal developer pipeline;
- land portfolio screening.

B2B API must have:

- versioned `/v1` contract;
- explicit usage units;
- rate limits;
- data-source attribution obligations;
- no redistribution rights beyond source terms;
- SLA only when infrastructure supports it.

## 5. Professional review and marketplace revenue

Automation will not resolve every planning/legal case.

A future **human verification upgrade** is strategically valuable:

```text
Automated Ehituspass
       |
       +-- clear supported result -> user continues
       |
       +-- complex / unknown -> offer professional review
```

Potential partner categories:

- architect/planner;
- geodesist;
- legal/planning consultant;
- surveyor;
- utility specialist;
- prefab-house vendor.

Commercial options to test:

- fixed qualified-lead fee;
- disclosed referral commission;
- paid professional marketplace subscription;
- request-for-quote transaction fee later.

Never make a paid-provider relationship change a deterministic recommendation.

## 6. Market value anchors

Existing Estonian professional services show that people already pay materially more for manual analysis/consulting than the proposed automated first pass.

Examples observed in August 2026:

- CityEE lists document checks from approximately €150–€200 and building-permit process management at much higher prices.
- Nord Property lists an analysis of building rights/restrictions/constraints in a €200 + VAT service range for one listed category.
- Eri Kinnisvara lists land valuation from €400 and consultant time at €70/hour.
- Vanarc and architecture/planning firms offer bespoke building-rights and planning-risk analysis, usually quoted individually.

Sources:

- https://cityee.ee/konsultatsioon/
- https://www.nordproperty.ee/teenused/hinnakiri
- https://eri.ee/
- https://vanarc.ee/
- https://standup.ee/teenused/

These are **not direct equivalent products** and must not be represented as competitor price comparisons. They are willingness-to-pay/value anchors for professional human work.

The commercial opportunity is:

> give the user a useful, immediate, source-backed first answer for tens of euros, then escalate only the difficult part to a human.

## 7. Why pricing should not be based on AI cost

Google's current Gemini API pricing makes short text explanations inexpensive relative to the value of a property/construction decision. For example, Gemini 2.5 Flash-Lite is priced per million tokens and a compact structured explanation uses only a tiny fraction of that unit.

Official pricing:

- https://ai.google.dev/gemini-api/docs/pricing

Krunditark also caches explanations by analysis/model/prompt version.

Therefore the main cost/risk drivers are likely to be:

- PostGIS/storage/compute as national datasets grow;
- data ingestion/normalization;
- source breakage maintenance;
- legal/rule verification;
- support;
- payment fees;
- marketing/customer acquisition;
- professional expertise;
- engineering time.

Do not optimize pricing around saving fractions of a cent in LLM tokens while ignoring rule maintenance or acquisition cost.

## 8. Current infrastructure cost anchors

### Supabase

As of August 2026, Supabase lists:

- Free plan: $0;
- Pro: from $25/month;
- Pro includes 100,000 MAU, 8 GB database, 250 GB egress, 100 GB storage and 2 million Edge Function invocations before overage pricing shown in the official pricing/billing documentation.

Sources:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase

National PostGIS datasets may require more than the base included database/compute; benchmark actual imported sizes before estimating long-term infrastructure cost.

### Cloudflare Pages

Cloudflare currently lists static asset requests as free/unlimited on Pages, with Functions/Workers charged under their applicable quotas.

Sources:

- https://developers.cloudflare.com/pages/functions/pricing/
- https://pages.cloudflare.com/

### Payments

Current examples:

**Stripe Checkout Estonia:**

- Estonia is a supported Stripe country;
- Stripe's Estonia Checkout page lists standard European cards at 1.5% + €0.25;
- Checkout supports one-time payments and subscriptions.

Sources:

- https://stripe.com/en-ee/payments/checkout
- https://stripe.com/global

**Montonio Estonia:**

The public Estonian pricing page currently advertises local bank-payment and card pricing with a small monthly plan fee. This may be economically attractive for Estonia-heavy consumer checkout, but exact product/recurring-payment requirements must be verified before selection.

Source:

- https://www.montonio.com/et/hinnapaketid

### Payment-provider architecture decision

Do not couple product entitlements directly to one provider SDK.

Use Krunditark concepts:

```text
Order
PaymentAttempt
PaymentProvider
Entitlement
Invoice/receipt reference
Refund
```

Potential first-provider decision should compare:

- Estonian bank-payment conversion;
- cards/Apple Pay/Google Pay;
- subscriptions;
- invoices/receipts;
- webhook quality;
- refunds;
- accounting workflow;
- total fees;
- development time.

Do not implement multiple providers on day one unless there is demonstrated need.

## 9. Example unit economics

These are **planning scenarios**, not forecasts and not tax/accounting advice.

Use a simple formula:

```text
contribution_per_report
  = collected_price
  - payment_cost
  - variable_compute/data_cost
  - variable_AI_cost
  - variable_support/refund allowance

break_even_paid_reports
  = monthly_fixed_operating_cost / contribution_per_report
```

For planning, if a €24.90 report produces a deliberately conservative **€20 contribution** after variable costs (before company taxes/VAT/accounting treatment and before founder/team salary), then:

| Monthly fixed operating cost | Reports to cover it at €20 contribution |
| ---------------------------: | --------------------------------------: |
|                         €500 |                                      25 |
|                       €1,000 |                                      50 |
|                       €3,000 |                                     150 |
|                       €6,000 |                                     300 |
|                      €10,000 |                                     500 |

The point of this table is not to claim that contribution is exactly €20. It gives the team an operational break-even model.

Implement real cost attribution before launch:

- payment fee/order;
- source/data compute allocation;
- AI tokens/cost;
- report generation cost;
- refunds;
- support minutes;
- acquisition channel/CAC.

## 10. Revenue mix target

A healthy long-term model should avoid dependence on one revenue type.

Desired direction after product-market validation:

```text
B2C one-off reports        -> acquisition + broad market
Project passes             -> higher B2C ARPU
Professional subscriptions -> recurring revenue
B2B/API                    -> scalable high-value revenue
Professional referrals     -> monetise complex/unknown cases
```

Programmatic ads are intentionally excluded.

## 11. Pricing-page UX

Do not present a confusing SaaS matrix to an occasional homeowner.

Consumer pricing page first asks:

> Mida sa teha tahad?

Then show three simple choices:

### Kontrollin krunti enne ostu

`Ostukontroll`

### Tahan testida ühte ehitusideed

`Ehituspass`

### Planeerin projekti ja tahan variante võrrelda

`Projektipass`

Below a divider:

`Töötad kinnisvara või projekteerimisega? Vaata Pro pakette.`

## 12. Paywall rules

Paywall must never distort safety information.

Allowed:

- free basic parcel preview;
- show that detailed analysis is a paid product;
- show which categories will be checked;
- show sample report.

Avoid:

- showing “all clear” from a reduced free subset;
- hiding a known severe warning behind deceptive copy after it has already been computed solely to force payment;
- countdown timers/fake discounts;
- recurring subscription preselected for an episodic purchase.

## 13. Refund/support policy design

Before payments launch, define at least:

- duplicate purchase handling;
- technical failure/refund path;
- provider/source outage behavior;
- report cannot-complete behavior;
- right-of-withdrawal/digital-content consumer-law review;
- business invoice requirements;
- order history.

Do not mark a paid order fulfilled merely because payment succeeded if report creation failed.

## 14. Pricing experiments

Measure instead of guessing.

Suggested experiments:

1. Free parcel preview -> €19.90 vs €24.90 Ehituspass.
2. Ehituspass only vs Ehituspass + €49.90 Project Pass choice.
3. Pre-purchase Ostukontroll standalone vs crediting some of its price toward Project Pass.
4. Pro waitlist pricing interview at €49/€79/€129 anchors.
5. Professional “human review” click-through before building marketplace infrastructure.

Primary metrics:

- paid conversion;
- report completion;
- refund rate;
- support burden;
- repeat/variant use;
- user-rated decision usefulness;
- gross contribution;
- CAC payback.

## 15. Commercial launch gates

Do not charge for a category unless:

- supported source coverage is disclosed;
- report shows unknowns;
- current rules are verified;
- source freshness is visible;
- payment recovery/refunds work;
- user can retrieve purchased report later;
- support can identify analysis/order by safe ID;
- terms/privacy/payment disclosures are reviewed.

## 16. Recommended initial commercial decision

For the Estonia-first launch:

1. Keep parcel discovery free.
2. Sell **Ehituspass as a one-time report** rather than forcing subscription.
3. Add **Project Pass** for users actively planning for several months.
4. Add subscriptions only for professional repeat users.
5. Do not use banner/programmatic ads.
6. Build professional referrals only after Krunditark has earned trust.
7. Treat €24.90 / €49.90 as testable starting hypotheses, not sacred prices.
