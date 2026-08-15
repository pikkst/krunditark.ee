# Commerce and Entitlements Architecture — Krunditark

Last product review: **2026-08-15**

This document defines how paid products, payments, subscriptions and access rights should work. It deliberately does **not** select the first payment provider; see `OPEN_QUESTIONS.md`.

## 1. Core rule

Payment provider state is not product authorization.

Krunditark owns the commercial domain:

```text
Product catalog
 -> Order
 -> PaymentAttempt
 -> verified provider event
 -> Entitlement
 -> permitted product action
```

The browser never grants an entitlement because a checkout redirect says `success=true`.

## 2. Initial product catalog

Codes are stable; display names/prices are versioned/configured.

Potential initial catalog:

```text
PARCEL_OVERVIEW_FREE
PURCHASE_CHECK
EHITUSPASS_SINGLE
PROJECT_PASS_90D
```

Later:

```text
PROJECT_MONITOR_YEARLY
PRO_MONTHLY
PRO_YEARLY
TEAM_MONTHLY
API_USAGE_PLAN
PROFESSIONAL_REVIEW
```

Do not encode prices in TypeScript conditionals throughout the UI.

## 3. Product semantics

### `PARCEL_OVERVIEW_FREE`

- price €0;
- no commerce flow;
- limited product scope, not a reduced “all clear”.

### `PURCHASE_CHECK`

- one parcel-level buyer report;
- scoped to exact data/rule profile and generated report;
- may offer upgrade credit later as a pricing experiment.

### `EHITUSPASS_SINGLE`

- one exact proposal/report entitlement;
- report remains accessible after purchase;
- technical regeneration/recovery does not consume a second purchase;
- moving the building materially creates a new proposal and may require another entitlement unless product policy includes a limited correction.

### `PROJECT_PASS_90D`

- scoped to one project/parcel;
- active time window;
- bounded proposal variants/analyses according to catalog terms;
- historical reports remain viewable after pass expiry;
- creating new paid analyses after expiry requires new entitlement/upgrade.

### `PRO_*`

- recurring entitlement for user/organization;
- usage allowance and overage policy separate from subscription lifecycle;
- do not promise unlimited analyses before measured economics.

## 4. Suggested data model

Exact SQL belongs in migrations when commerce is promoted into `TASKS.md`.

### `commerce.products`

```text
id uuid PK
code text UNIQUE
kind enum/free|one_time|project_pass|subscription|usage
active boolean
default_entitlement_type text
metadata jsonb (noncritical presentation/config only)
created_at
```

### `commerce.product_prices`

Version prices instead of overwriting history.

```text
id uuid PK
product_id FK
currency char(3)
amount_minor bigint
valid_from timestamptz
valid_to timestamptz nullable
billing_interval nullable
provider_price_refs jsonb nullable
price_version integer
```

A completed order always references the exact price row.

### `commerce.orders`

```text
id uuid PK
order_number text UNIQUE
user_id uuid FK auth.users
project_id uuid nullable
product_id uuid FK
product_price_id uuid FK
currency
subtotal_minor
tax_minor
total_minor
status enum draft|awaiting_payment|paid|fulfilling|fulfilled|cancelled|refunded|partially_refunded|failed
locale
created_at
paid_at nullable
fulfilled_at nullable
```

Do not recalculate historical order price from current product catalog.

### `commerce.payment_attempts`

```text
id uuid PK
order_id uuid FK
provider text
provider_checkout_id text nullable
provider_payment_id text nullable
status enum created|pending|succeeded|failed|cancelled|refunded|disputed
amount_minor
currency
idempotency_key text
safe_provider_metadata jsonb
created_at
updated_at
```

Unique provider identifiers where appropriate.

### `commerce.payment_events`

Webhook audit/dedupe:

```text
id uuid PK
provider text
provider_event_id text
received_at
verified_at nullable
processed_at nullable
status
payload_hash
safe_metadata
```

Unique `(provider, provider_event_id)`.

Raw payload retention follows provider/privacy/audit need and must never store secrets unnecessarily.

### `commerce.entitlements`

```text
id uuid PK
user_id uuid nullable
organization_id uuid nullable
product_id uuid FK
order_id uuid nullable
scope_type enum analysis|project|user|organization|api
scope_id uuid/text nullable
status enum active|expired|revoked|consumed
starts_at
expires_at nullable
limits jsonb validated
created_at
revoked_at nullable
```

Important limitations should eventually be typed rather than arbitrary JSON if enforcement becomes complex.

### `commerce.usage_events`

For Pro/API/project limits:

```text
id uuid PK
entitlement_id uuid FK
usage_type text
quantity numeric
analysis_id uuid nullable
idempotency_key text
occurred_at
```

Unique/idempotent operation key.

Do not derive billing-critical usage from mutable analytics events.

### `commerce.refunds`

```text
id uuid PK
order_id uuid FK
payment_attempt_id uuid FK
provider_refund_id text nullable
amount_minor
reason_code
status
created_at
completed_at nullable
```

## 5. Tax/VAT/accounting boundary

Exact Estonian/EU VAT/invoicing behavior requires accounting/legal review before paid launch.

Architecture must support:

- B2C vs B2B customer details if needed;
- country/VAT ID where needed;
- tax amount captured on order;
- invoice/receipt reference;
- immutable historical totals;
- credit/refund records;
- accounting export/provider integration later.

Do not implement tax rules from model memory.

## 6. Checkout workflow

Recommended consumer flow:

```text
anonymous project
 -> convert/link permanent identity
 -> POST create order
 -> server selects current valid product price
 -> create provider checkout/payment intent using server secret
 -> browser redirected/embedded checkout
 -> provider verifies payment
 -> signed webhook arrives
 -> dedupe event
 -> transaction marks payment/order paid
 -> create entitlement atomically with fulfillment state
 -> enqueue/run report fulfillment if required
 -> order fulfilled
 -> user can recover via account
```

The browser return page may poll order status but may not mark it paid.

## 7. Payment webhook requirements

Every provider adapter must:

- verify signature/authentication exactly according to current provider docs;
- preserve raw request bytes where signature scheme requires them;
- use provider event ID for dedupe;
- be idempotent;
- tolerate retries/out-of-order events according to provider semantics;
- map provider state into Krunditark domain state;
- never trust amount/product/user identifiers only from client metadata;
- record safe audit data;
- return appropriate status quickly;
- move heavy fulfillment outside webhook transaction if necessary.

## 8. Atomic entitlement grant

For one-time purchase:

Payment success processing should ensure the following become transactionally consistent where possible:

- payment event processed;
- payment attempt succeeded;
- order paid;
- entitlement created.

Report generation may happen after that transaction.

If report generation fails:

- entitlement/order remains recognized as paid;
- fulfillment status becomes failed/retryable;
- user is not charged again;
- retry is idempotent.

## 9. Idempotency

Required idempotency keys for:

- create order/checkout;
- provider event processing;
- entitlement fulfillment;
- paid analysis consumption;
- refunds;
- subscription renewal mapping.

Same idempotency key with a different semantic payload must fail safely.

## 10. Entitlement authorization

Server-side APIs call a single owned authorization service, conceptually:

```ts
interface EntitlementService {
  canRunAnalysis(input: AnalysisEntitlementRequest): Promise<Decision>
  consumeUsage(input: UsageConsumption): Promise<UsageResult>
  canAccessReport(input: ReportAccessRequest): Promise<Decision>
}
```

Frontend may hide unavailable actions for UX, but server is authoritative.

## 11. Consumer entitlement examples

### Single Ehituspass

Before new paid analysis:

- if exact paid report already exists -> return it;
- if current order entitlement applies to exact proposal -> consume/use it idempotently;
- do not consume twice on retry.

### Project Pass

Policy checks:

- same project scope;
- within time window;
- within allowed analysis/variant limits;
- rerun due solely to a Krunditark technical failure should not consume an extra unit;
- rerun after system data update may be included according to product terms.

## 12. Subscription model

Professional subscription has two separate concepts:

```text
Billing subscription state
+
Krunditark entitlement/usage allowance
```

Provider webhooks update the internal subscription mirror/entitlement.

Handle:

- trial if used;
- active;
- payment past due;
- cancelled at period end;
- cancelled;
- grace period if product chooses;
- renewal;
- plan change;
- refund/dispute.

Do not delete professional project history when a subscription expires.

## 13. Payment provider adapter

Conceptual boundary:

```ts
interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  verifyWebhook(request: RawWebhookRequest): Promise<VerifiedProviderEvent>
  refund(input: RefundInput): Promise<RefundResult>
}
```

Provider-specific SDK/types end at adapter boundary.

Potential implementations:

```text
StripePaymentProvider
MontonioPaymentProvider
FakePaymentProvider (tests)
```

Only implement the selected provider initially.

## 14. Stripe current capability snapshot

As of August 2026, Stripe Checkout supports one-time payments and subscriptions, mobile wallets such as Apple Pay/Google Pay, and its Estonia Checkout page lists standard European card pricing at 1.5% + €0.25.

Official:

- https://stripe.com/en-ee/payments/checkout

This is research input, not a permanent pricing assumption.

## 15. Montonio current capability snapshot

As of August 2026, Montonio's Estonian pricing page advertises local bank payments plus cards/wallets, with several monthly packages and low per-bank-payment fees on some plans.

Official:

- https://www.montonio.com/et/hinnapaketid

This is research input. Verify API/webhook/subscription fit and current fees before choosing.

## 16. Refund policy architecture

Support reason codes:

- duplicate purchase;
- technical service failure;
- user-requested refund under applicable terms;
- goodwill;
- fraud/dispute resolution;
- partial service issue later.

Never automatically refund merely because an Ehituspass contains a conflict/unknown. The product purchased is the analysis, not a positive answer.

But if Krunditark fails to deliver the paid product technically, provide clear recovery/refund behavior.

## 17. Chargebacks/disputes

Store provider dispute state and prevent risky automated behavior without locking user out of legally required records.

Do not expose internal risk/fraud flags to client.

## 18. Orders/account UX

Order page shows:

- product;
- project/report;
- date;
- total;
- payment status;
- fulfillment status;
- receipt/invoice when available;
- support/refund action.

Avoid provider terminology such as `PaymentIntent` in UI.

## 19. Pricing configuration

Pricing is versioned catalog data.

Features such as:

- promotional codes;
- partner credits;
- upgrade credits;
- Pro included usage;

must be represented as structured commercial rules with tests if introduced.

Do not create arbitrary frontend coupon logic.

## 20. Advertising/referral boundary

No display/programmatic ads within analysis/report UI.

Future professional referral:

```text
Automated finding / next action
        |
        v
User chooses “Leia spetsialist”
        |
        v
separate provider/quote marketplace
```

Partner/sponsorship data never enters rules/GIS finding derivation.

## 21. Security

- provider secret keys only server-side;
- webhook secrets only server-side;
- least privilege;
- never log raw card/bank credentials;
- do not collect payment instrument data directly if provider-hosted/secure components can handle it;
- validate prices/product on server;
- protect order access by user/org RLS/server checks;
- verify redirect URLs;
- rate-limit checkout creation;
- audit refunds/admin entitlement changes.

## 22. Tests

Required before public commerce:

- create order correct price;
- client cannot change amount/product entitlement;
- payment success webhook;
- invalid signature;
- duplicate webhook;
- out-of-order events where provider can do so;
- payment failed/cancelled;
- browser never returns after successful payment;
- report fulfillment fails/retries;
- entitlement not double-granted;
- usage not double-consumed;
- refund full/partial if supported;
- unauthorized order/report access;
- subscription renewal/cancel/past-due when subscriptions launch;
- webhook secret not leaked;
- clean migration/RLS.

Use fake provider in normal unit tests; live provider sandbox only in isolated integration tests.

## 23. Commerce launch gate

Do not accept real money until:

- legal seller identity is published;
- tax/accounting approach reviewed;
- privacy/terms/refund/digital-content behavior reviewed;
- product price/catalog is configured;
- payment adapter/webhook tests pass;
- order/entitlement RLS passes;
- paid report recovery passes E2E;
- support can resolve an order safely;
- payment provider production account/webhooks configured;
- monitoring/alerting exists for paid-but-unfulfilled orders.
