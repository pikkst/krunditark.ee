# ADR 0006 — Guest-first authentication

Status: **Accepted**

Date: **2026-08-15**

## Context

Krunditark is primarily used by people who are trying to understand whether the product can help with a real parcel. Requiring registration before parcel selection/proposal creation would add friction before the user has received meaningful value.

At the same time, projects/proposals cannot be stored as globally public browser state once server APIs, paid reports and recovery are involved.

Supabase Auth supports anonymous users with real user IDs/JWTs and an `is_anonymous` claim, and supports linking identities later.

## Decision

Use a **guest-first, identity-later** model.

- Public marketing/demo pages require no Auth session.
- When persistent guest project state is needed, create a Supabase anonymous user.
- Guest-owned data is protected by normal ownership RLS plus explicit restrictions where permanent identity is required.
- Do not require signup before parcel overview/proposal value.
- Convert/link guest identity when user saves across devices, purchases, monitors or uses professional functionality.
- Primary permanent consumer methods are email OTP and Google OAuth.
- No password is required in the default flow.
- Production email auth requires custom SMTP.

## Consequences

Positive:

- lower onboarding friction;
- project can be server-owned before PII collection;
- payment/report recovery can use stable identity after conversion;
- RLS applies consistently.

Costs/risks:

- anonymous Auth rows/drafts need retention cleanup;
- anonymous sessions cannot be recovered after local state is lost;
- RLS must distinguish anonymous from permanent users because both use `authenticated`;
- abuse controls/CAPTCHA/rate limits are required.

## Rejected alternatives

### Require registration on landing

Rejected because it asks for identity before demonstrating product value.

### Pure unauthenticated localStorage guest mode until payment

Rejected as the primary architecture because server-owned proposal/project state, rate limits and safe conversion are harder to preserve/recover consistently.

### Password-first accounts

Rejected for default consumer flow due unnecessary friction. Password support can be added later only if user/product need justifies it.

## References

- `docs/AUTH_AND_ONBOARDING.md`
- `docs/USER_JOURNEYS_AND_PERSONAS.md`
- Supabase anonymous Auth: https://supabase.com/docs/guides/auth/auth-anonymous
