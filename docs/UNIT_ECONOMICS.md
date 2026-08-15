# Unit Economics and Break-even Model — Krunditark

Research/model date: **2026-08-15**

This file provides a more explicit financial planning model than the high-level pricing hypotheses in `BUSINESS_MODEL_AND_PRICING.md`.

It is **not accounting, VAT or tax advice**. Before public paid launch, the actual operating company, VAT status, customer type/country and accounting treatment must be reviewed.

## 1. Important distinction: customer price is not net revenue

Estonia's standard VAT rate in 2026 is **24%**. If Krunditark's consumer price is VAT-inclusive and the seller is required to charge Estonian standard VAT, the net amount before payment/variable costs is:

```text
net_revenue_before_costs = gross_customer_price / 1.24
```

Official Estonian Tax and Customs Board sources:

- https://www.emta.ee/ariklient/maksud-ja-tasumine/kaibemaks/kaibemaksumaarad-ja-maksuvaba-kaive/uldine-kaibemaksumaar
- https://www.emta.ee/uudised/maksumuudatused-2026

Do not use the gross checkout amount as “revenue per report” in break-even planning.

## 2. Payment-fee example

Stripe's current Estonia Checkout page lists standard European cards at **1.5% + €0.25** as of this research date.

Official:

- https://stripe.com/en-ee/payments/checkout

This is only an example variable-fee model. The actual first provider remains an open implementation decision and may be Montonio or another provider.

## 3. Gross-to-contribution examples

Assumptions for illustration:

- customer price includes 24% VAT;
- payment fee uses the current Stripe standard-European-card example;
- `technical variable reserve` = €1/report for compute/storage/AI/operational allocation;
- `support/refund reserve` = €2/report for a one-off Ehituspass;
- excludes fixed staff/founder salary, marketing CAC, accounting, legal, office and corporate income-tax effects;
- actual Gemini variable cost may be much lower than €1, but the reserve intentionally covers more than AI tokens.

### Ehituspass candidate prices

| Gross customer price | Net after 24% VAT | Example payment fee | After payment | After €1 tech + €2 support reserve | Planning contribution |
| -------------------: | ----------------: | ------------------: | ------------: | ---------------------------------: | --------------------: |
|               €19.90 |           ~€16.05 |              ~€0.55 |       ~€15.50 |                            ~€12.50 |           **~€12.50** |
|               €24.90 |           ~€20.08 |              ~€0.62 |       ~€19.46 |                            ~€16.46 |           **~€16.46** |
|               €29.90 |           ~€24.11 |              ~€0.70 |       ~€23.41 |                            ~€20.41 |           **~€20.41** |

These are not forecasts. They show why a seemingly small consumer-price change can materially change contribution after VAT and fixed payment fees.

## 4. Break-even examples for €24.90 Ehituspass

Using the illustrative ~**€16.46 planning contribution/report**:

```text
reports_to_cover_fixed_cost
  = monthly_fixed_cost / 16.46
```

| Monthly fixed operating cost | Approx. paid reports/month to cover it | Approx. reports/day (30d) |
| ---------------------------: | -------------------------------------: | ------------------------: |
|                         €500 |                                     31 |                       1.0 |
|                       €1,000 |                                     61 |                       2.0 |
|                       €3,000 |                                    183 |                       6.1 |
|                       €6,000 |                                    365 |                      12.2 |
|                      €10,000 |                                    608 |                      20.3 |

This is **contribution break-even before customer-acquisition cost and founder/team compensation assumptions unless they are included in fixed cost**.

## 5. Why €24.90 is still a reasonable test point

It is not because the model proves €24.90 is optimal.

Reasons it is a useful hypothesis:

- low enough compared with manual professional analysis in the hundreds of euros;
- high enough to provide meaningful contribution if analysis is reliable;
- a property/building decision can be financially material;
- leaves room for a higher-value Project Pass;
- can be tested against €19.90 and €29.90.

Do not optimize price before users believe and understand the result.

## 6. Professional/manual value anchors

Current public Estonian service pages show materially higher human-service pricing for related work.

Examples from research date:

- Nord Property: building-right/restriction/constraint analysis for a certain planning context listed at €200 + VAT; municipal consultation listed separately.
- CityEE: document checks/consultations in roughly the €150–€200+ range and permit-process management much higher.
- Eri Kinnisvara: land valuation from hundreds of euros and consultant hourly pricing.

Sources:

- https://www.nordproperty.ee/teenused/hinnakiri
- https://cityee.ee/konsultatsioon/
- https://eri.ee/

These are not direct substitutes. They only demonstrate that reducing property/regulatory uncertainty has an existing willingness-to-pay context.

## 7. Project Pass economics

Illustrative Project Pass price hypothesis: **€49.90 gross / 90 days / one project**.

If 24% VAT applies:

```text
49.90 / 1.24 ≈ 40.24 net before payment/variable costs
```

Using the same example card fee:

```text
payment fee ≈ 49.90 * 1.5% + 0.25 ≈ 1.00
```

Net after payment ≈ **€39.24**.

A Project Pass has higher variable/support burden because it may include several variants/reanalyses. Planning model should reserve, for example, a measured amount for:

- multiple analyses;
- AI questions;
- report storage;
- notifications;
- support;
- change monitoring.

Do not assume five variants cost exactly five times one Ehituspass; most data/GIS inputs are cached/local and AI explanations are cacheable. Measure real usage first.

## 8. Pro subscription economics

Professional pricing should be based on repeated workflow value and included usage.

Example hypothesis:

- Pro: €69–€89/month;
- Team: €179–€249/month.

Do not offer unlimited analyses until measured:

- average active projects/user;
- analyses/project;
- source/GIS compute;
- report/AI usage;
- support minutes;
- storage;
- payment fees;
- professional churn.

Use a usage allowance/credit concept internally if needed, but do not force consumer users to think in “tokens”.

## 9. CAC changes the break-even point

If paid acquisition is used:

```text
fully_loaded_contribution
  = report_contribution - average_CAC_per_paid_customer
```

Example only:

If contribution is €16.46 and blended CAC is €8:

```text
remaining contribution ≈ €8.46
```

Then €3,000 fixed cost would require roughly:

```text
3000 / 8.46 ≈ 355 paid reports/month
```

This is why organic search, partner distribution, report sharing and professional/B2B channels matter.

## 10. Refund/support risk

Track separately:

- payment fee not recovered on refund depending provider terms;
- customer support time;
- source outage technical refunds;
- duplicate purchase;
- misunderstanding (“I expected permission, not analysis”);
- report quality disputes.

High refund/support rate is not merely a financial problem; it signals product promise/UX mismatch.

## 11. Infrastructure cost measurement

Do not allocate all Supabase monthly cost equally to every report without measuring actual drivers.

Track:

- database size by source;
- PostGIS query CPU/duration;
- source ingestion bandwidth/compute;
- Edge Function invocations;
- map/evidence egress;
- report storage;
- Gemini input/output tokens;
- email volume;
- scheduled job costs.

Google's current Gemini pricing shows low per-million-token Flash/Flash-Lite costs relative to a €20+ report, reinforcing that legal/source maintenance/support can be much more important than LLM tokens.

Official:

- https://ai.google.dev/gemini-api/docs/pricing

## 12. Recommended commercial KPI set

Per product track:

```text
gross checkout value
VAT/tax amount
net recognized sales basis
payment fee
refund/chargeback
technical variable cost allocation
AI cost
support cost allocation
contribution
CAC
contribution after CAC
```

Then track:

- free -> paid conversion;
- report completion success;
- refund rate;
- support minutes/order;
- repeat/project-pass upgrade;
- paid variant usage;
- Pro MRR/churn later.

## 13. Break-even dashboard

Internal dashboard should let owner enter:

- current product gross price;
- VAT rate/treatment;
- blended payment rate/fixed fee;
- measured variable cost;
- support reserve;
- CAC;
- fixed monthly costs.

Outputs:

- contribution/order;
- break-even orders/month/day;
- revenue at break-even;
- sensitivity by price/conversion/CAC.

Do not hard-code the planning assumptions from this document into production billing logic.

## 14. Initial decision recommendation

For launch validation:

1. Keep free parcel overview.
2. Test Ehituspass at **€19.90 / €24.90 / €29.90** in controlled cohorts/periods.
3. Default internal planning case can use €24.90, but treat ~€16–17/report as a more realistic **illustrative** pre-CAC contribution than €20 when 24% VAT + payment + simple reserves are considered.
4. Offer Project Pass only when variant/reanalysis value is real.
5. Do not use ads to subsidize a low report price.
6. Add Pro after repeat professional demand is validated.
7. Recalculate with the actual legal entity/VAT/payment provider before accepting real money.
