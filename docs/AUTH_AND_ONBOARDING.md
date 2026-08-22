# Authentication and Onboarding — Krunditark

Last product review: **2026-08-22**

## 1. Decision

Krunditark uses a **guest-first, identity-later** onboarding model.

A first-time consumer must not be required to create a permanent account before:

- searching/selecting a parcel;
- seeing the parcel on the map;
- choosing their intent;
- placing a simple building template;
- understanding what Krunditark can check.

A Supabase **anonymous Auth identity is not a permanent-account/signup wall**. It is the technical owner identity used when stateful guest project/proposal persistence becomes necessary.

Permanent-account conversion happens when identity provides obvious user value, for example:

- durable cross-device recovery;
- purchasing a report/project entitlement;
- retrieving a purchased report later;
- enabling monitoring/notifications;
- sharing/collaborating;
- entering professional mode.

## 2. Phase sequencing decision

The minimum anonymous Auth + guest project ownership slice is a **Phase 4 prerequisite** for owner-RLS proposal persistence.

This resolves the earlier task-order ambiguity where proposal persistence appeared before anonymous Auth work.

### Phase 4 minimum slice

Implement/reuse:

- Supabase anonymous sign-in configuration needed for guest ownership;
- one anonymous `auth.uid()` per guest session as supported by Supabase;
- owner-scoped guest project creation/read/update through RLS;
- bounded guest project/proposal creation;
- selected parcel + intent persistence when the stateful proposal flow starts;
- proposal-version ownership through the existing project relationship;
- same-browser recovery while the anonymous session remains available;
- route/locale state preservation;
- clear failure handling if anonymous session/project bootstrap fails.

### Remains in the later account phase

- email OTP permanent identity;
- Google OAuth permanent identity;
- anonymous -> permanent account conversion UX;
- custom production SMTP;
- account dashboard/privacy pages;
- cross-device project recovery;
- complete account deletion/export workflow;
- full RU/EN auth UX and account settings.

Do not defer safe guest ownership until after KT-048, and do not pull the entire permanent-account product into Phase 4.

See ADR 0006, ADR 0009 and `PHASE_4_READINESS.md`.

## 3. Why this is technically feasible

Supabase Auth supports anonymous sign-ins. An anonymous user receives a real Auth user ID and uses the `authenticated` Postgres role, while the JWT exposes an `is_anonymous` claim that can be used by RLS. Supabase supports identity linking/conversion paths that must be reverified against current official documentation when permanent conversion is implemented.

Official references to re-check at implementation time:

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/auth/users

This maps to Krunditark's desired flow: an anonymous user can own temporary project state without Krunditark collecting email/name upfront.

## 4. User states

Do not conflate application user state with paid entitlements.

### U0 — Public visitor

No Supabase Auth user is required for:

- landing/public content;
- public demo;
- static pricing/about/help/privacy pages;
- parcel address/cadastral search;
- map parcel discovery;
- bounded free parcel overview.

The current product decision is to delay anonymous sign-in until the first **stateful project/proposal action** rather than creating abandoned Auth users for every visitor.

### U1 — Anonymous project user

Created via Supabase anonymous sign-in when the user enters a stateful project/proposal workflow.

Can:

- create a bounded temporary project;
- persist the selected parcel/project parcel reference;
- persist a stable intent code;
- create versioned proposal state allowed by the current free/pre-check product policy;
- run only explicitly allowed free/pre-check operations;
- preserve state in the same browser/session.

Cannot by default:

- rely on cross-device recovery;
- access paid report history after losing the anonymous identity;
- create organization/team;
- use professional/API features;
- receive email notifications;
- create public share links;
- exceed guest abuse/rate limits.

Anonymous users use the `authenticated` Postgres role. Policies that merely say `TO authenticated` do **not** distinguish anonymous from permanent users. Use verified JWT `is_anonymous` semantics where permanent identity is required.

### U2 — Permanent consumer user

Recommended initial methods:

1. **Email OTP**
2. **Google sign-in**

No password is required in the default consumer UX.

Can later:

- recover projects across devices;
- purchase/own entitlements;
- view orders/report history;
- receive project notifications;
- delete account/project according to policy;
- manage language/preferences.

### U3 — Professional user

A permanent user with a professional entitlement/workspace.

Can later:

- create organization workspace;
- invite members;
- manage seats/roles;
- use Pro UI;
- consume professional analysis credits;
- access exports/API according to plan.

### U4 — Admin/internal verifier

Never granted through public signup/profile mutation.

Admin/legal/source-verifier privileges are explicit server-side roles with audit logs and stronger access controls.

## 5. Canonical onboarding flow

```text
Landing / public visitor
  |
  v
Search address/cadastral ID OR select on map
  |
  v
Confirm exact parcel
  |
  v
Free parcel overview
  |
  v
Choose intent
  |
  +--> non-stateful parcel understanding can remain public/bounded
  |
  v
Build/proposal workflow needs state
  |
  v
signInAnonymously() if no session
  |
  v
create/reuse owner-scoped guest project
  |
  v
Place/edit proposal draft
  |
  v
server validates/canonicalizes
  |
  v
persist proposal version
  |
  v
Need durable/paid/cross-device value?
  |              \
  no              yes
  |                |
continue guest     v
              lightweight account sheet
              [Continue with Google]
              [Continue with email]
                      |
                      v
              link/convert identity
                      |
                      v
                preserve same project
```

Never throw away the user's parcel/proposal when creating anonymous ownership or showing permanent Auth.

## 6. Phase 4 state ownership rules

The selected parcel/proposal must not exist only in one page component once the workflow becomes route-based.

Required:

- selected parcel is persisted/referenced by the guest project when stateful flow begins;
- selected intent uses the canonical locale-independent code;
- an in-progress editor footprint may be transient until explicit server validation/persistence;
- persisted proposal versions are the durable project state;
- locale switching preserves project and editor draft;
- browser back/forward behavior is deterministic;
- refresh behavior is explicit and tested;
- anonymous session bootstrap failure never falls back to a globally writable/shared project;
- service-role credentials are never used in the browser to bypass RLS.

## 7. Account sheet UX

Title depends on context.

For durable save:

> **Salvesta oma projekt**
>
> Jätka e-postiga või Google'iga, et saaksid projekti hiljem teisest seadmest avada.

For purchase:

> **Seo raport oma kontoga**
>
> Nii saad ostetud Ehituspassi alati uuesti avada.

Buttons:

- `Jätka Google'iga`
- `Jätka e-postiga`
- `Tagasi projekti`

Do not use “Create account” as the only language when the user's actual goal is saving/buying.

This sheet is **not** shown merely because Phase 4 needed an anonymous technical identity.

## 8. Email OTP UX — later permanent identity phase

Preferred over magic-link-only flow because a numeric OTP can be entered without leaving the project tab and is less affected by mail-link scanners.

Flow:

1. enter email;
2. send OTP;
3. show 6-digit input;
4. verify;
5. link/convert the anonymous identity according to then-current Supabase-supported account-linking flow;
6. return to exact project/action.

Requirements:

- show masked destination email;
- resend cooldown;
- change-email action;
- paste support;
- mobile `autocomplete=one-time-code`;
- clear expired/incorrect-code errors;
- preserve project state on refresh.

## 9. Google sign-in — later permanent identity phase

Requirements:

- approved redirect URLs for local/preview/production;
- return to original project/action;
- handle existing-account/identity-link conflicts safely;
- do not request unnecessary Google scopes;
- use a custom product/auth domain when production infrastructure supports it for trust.

Reverify current Supabase identity-linking behavior before implementation rather than relying on stale provider assumptions.

## 10. Production email requirement

Supabase's default SMTP is for testing/demonstration and is not appropriate for public production.

Before public email OTP:

- configure a production SMTP provider;
- set SPF/DKIM/DMARC;
- use a Krunditark-controlled sender/domain;
- disable email-provider link tracking when it can break auth links;
- configure appropriate Auth rate limits;
- monitor delivery failures.

Potential providers may include Resend, Postmark, AWS SES, Brevo or another justified provider; provider selection is operational and remains an open decision until verified.

## 11. Abuse prevention

Anonymous project creation and parcel analysis are valuable and therefore abuseable.

Phase 4 minimum controls:

- per-IP/per-anonymous-user request budgets at public/stateful boundaries;
- bounded guest projects/proposals;
- no anonymous project creation on every passive page load;
- map point parcel resolution only on explicit user selection/click, not pointer movement;
- source/cache reuse where safe;
- request size/geometry limits;
- never allow a guest to trigger national source refresh.

Later/production controls:

- CAPTCHA/Turnstile after suspicious/burst behavior rather than on every normal first interaction where possible;
- abandoned anonymous users/projects cleaned under documented retention policy;
- paid entitlements for expensive repeated workflows.

Do not treat frontend debounce/disabled buttons as the only abuse control.

## 12. Anonymous data retention

Anonymous users cannot recover their identity after clearing browser data/signing out unless identity was linked.

Therefore the UI must warn before relying on long-lived guest state:

> `Salvesta projekt, et see ei kaoks brauseriandmete kustutamisel.`

Recommended policy hypothesis:

- anonymous project drafts: 7–30 days of inactivity;
- extend/convert on permanent account;
- abandoned anonymous Auth users cleaned periodically according to Supabase/application capabilities and privacy policy.

Final retention numbers require production privacy review.

Phase 4 may implement only the minimum bounded guest-state behavior; it must not present a temporary anonymous project as guaranteed long-term storage.

## 13. Payment and identity ordering

Default paid consumer path:

```text
anonymous project
 -> permanent identity
 -> create order
 -> payment provider checkout
 -> verified payment webhook
 -> entitlement issued
 -> report generated/unlocked
```

Why identity before external checkout:

- report can be recovered if browser closes;
- webhook can attach order to stable user/project;
- duplicate/retry handling is simpler;
- receipt/report history is available.

A payment-provider customer object is not the Krunditark identity source of truth.

## 14. Entitlements are not Auth roles

Do not store product access as a mutable client-controlled profile flag.

Conceptual entities:

```text
User
Organization
Membership
Product
Order
PaymentAttempt
Entitlement
UsageLedger / CreditGrant (professional plans later)
```

Examples:

- `EHITUSPASS_REPORT` entitlement scoped to one paid analysis/report;
- `PROJECT_PASS` scoped to one project + time window/limits;
- `PRO_SUBSCRIPTION` scoped to user/org + billing period;
- `API_PLAN` scoped to organization.

Server APIs enforce entitlements independently from frontend UI.

## 15. Account pages

### `/konto`

- name/email/linked identities;
- language;
- notification settings;
- billing/orders;
- privacy/export/delete;
- sign out.

### `/projektid`

- projects;
- status;
- latest data/report date;
- newer-data-available indicator;
- active Project Pass/monitoring state.

### `/ostud`

- order number;
- product;
- amount/VAT display as legally/accounting appropriate;
- date;
- payment status;
- linked report/project;
- invoice/receipt when available;
- support/refund state.

These are later permanent-account product surfaces, not Phase 4 prerequisites.

## 16. Organization/team onboarding

Post-consumer launch, Pro/Team flow:

1. permanent account;
2. choose professional plan/trial;
3. optional organization name;
4. invite users by email;
5. roles: owner/admin/member/viewer as product needs mature;
6. team projects belong to organization, not accidentally to one member;
7. audit meaningful billing/membership/project-share changes.

## 17. Sharing and collaboration

Do not make reports public by predictable URL.

Future share model:

- opt-in share link;
- cryptographically strong token;
- report-only or project-view permission;
- optional expiration;
- revocable;
- no account required for read-only shared report if owner chooses;
- exclude private notes/files by default.

## 18. Account deletion

Permanent account deletion must:

- explain what will be deleted and what may need statutory/accounting retention;
- revoke sessions/share links;
- delete/anonymize private project data according to policy;
- retain only legally required billing/accounting records under documented basis;
- not silently delete public-source data shared by the system.

Anonymous cleanup/retention is a separate lifecycle and must not accidentally delete another user's project.

## 19. Authentication analytics

Privacy-approved product metrics may later include:

- anonymous parcel-to-proposal completion;
- auth prompt shown;
- auth method chosen;
- OTP delivery/verification failure rate;
- anonymous-to-permanent conversion;
- checkout recovery after auth;
- account-link conflict/error rate.

Do not send emails, parcel IDs, exact addresses, geometry or auth tokens to third-party analytics by default.

## 20. Required tests

### Phase 4 guest ownership

- public visitor can search/select parcel without permanent account;
- entering stateful proposal flow creates/reuses anonymous Auth safely;
- anonymous user creates/reads own bounded project;
- anonymous A cannot access B project/proposals;
- project carries canonical parcel/intent state across route/locale changes;
- anonymous bootstrap failure does not create an insecure fallback;
- owner-RLS proposal persistence works with anonymous user JWT;
- no service-role credential is present in browser paths.

### Later permanent conversion

- email OTP/Google conversion preserves exact project/proposal;
- existing-account conflict handled safely;
- cancelled/failed conversion returns to project;
- cross-device recovery works after permanent identity;
- permanent-only actions reject anonymous users.

## 21. Acceptance criteria

The onboarding system is correct when:

- a guest reaches meaningful parcel/proposal value without permanent registration;
- stateful guest work is owned by an anonymous Auth ID rather than globally public state;
- Phase 4 proposal persistence does not precede safe owner identity;
- anonymous A cannot access anonymous B;
- later account conversion preserves the exact project;
- consumer can later use email OTP or Google;
- no password is required by default;
- RLS distinguishes anonymous/permanent users where needed;
- paid report is recoverable after browser/device failure once attached to permanent account;
- public email auth uses custom SMTP;
- abuse controls exist;
- account/project deletion is implemented before public production.
