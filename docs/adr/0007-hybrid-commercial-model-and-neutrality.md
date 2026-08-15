# ADR 0007 — Hybrid commercial model and finding neutrality

Status: **Accepted**

Date: **2026-08-15**

## Context

Consumer Krunditark usage is usually episodic: a person may make one land purchase or one building project over several months rather than need the service forever. Professional users can have recurring monthly usage.

Krunditark also depends on trust. Advertising from builders, architects, brokers or vendors adjacent to findings can create a perceived conflict of interest.

## Decision

Adopt a hybrid commercial architecture:

- free parcel discovery/overview;
- one-time consumer reports such as Ostukontroll and Ehituspass;
- a limited-duration Project Pass for active scenario work;
- recurring subscriptions/usage plans primarily for professional repeat users;
- B2B/API later;
- optional clearly separated professional referral/marketplace revenue later.

Do **not** use programmatic/banner advertising inside the trust-critical analysis/report workspace.

Any future paid/sponsored professional offer:

- is clearly labeled;
- appears separately from automated finding derivation;
- cannot change finding state, next-action semantics or source visibility;
- cannot suppress organic options.

## Consequences

- Commerce requires provider-neutral orders/payments/entitlements rather than a simple `isPro` flag.
- Consumer pricing can be one-off/project scoped rather than subscription-only.
- Professional subscriptions can provide recurring revenue without dark-pattern consumer renewals.
- The product gives up potential display-ad revenue to protect trust and positioning.

## Pricing

Specific euro amounts are hypotheses and are **not** part of this ADR.

See `BUSINESS_MODEL_AND_PRICING.md` for current tests/hypotheses.

## Rejected alternatives

### Consumer subscription only

Rejected because normal homeowner/land-buyer demand is episodic and a permanent subscription adds friction/churn without matching the job.

### Free product funded by banner advertising

Rejected as the primary model because neutrality is core to a regulatory/property decision product.

### Professional referral as the only revenue model

Rejected because it could bias product incentives toward generating uncertainty/leads and would make the core analysis economically dependent on referrals.

## References

- `docs/BUSINESS_MODEL_AND_PRICING.md`
- `docs/COMMERCE_AND_ENTITLEMENTS.md`
- `docs/PRODUCT_REQUIREMENTS.md`
