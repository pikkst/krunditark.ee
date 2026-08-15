# Authentication and Onboarding — Krunditark

Last product review: **2026-08-15**

## 1. Decision

Krunditark uses a **guest-first, identity-later** onboarding model.

A first-time consumer must not be required to create an account before:

- searching/selecting a parcel;
- seeing the parcel on the map;
- choosing their intent;
- placing a simple building template;
- understanding what Krunditark can check.

Account conversion happens when identity provides obvious value, for example:

- saving work across devices;
- purchasing a report/project entitlement;
- retrieving a purchased report later;
- enabling monitoring/notifications;
- sharing/collaborating;
- entering professional mode.

## 2. Why this is technically feasible

Supabase Auth supports anonymous sign-ins. An anonymous user receives a real Auth user ID and uses the `authenticated` Postgres role, while the JWT exposes an `is_anonymous` claim that can be used by RLS. Supabase also supports linking an email/OAuth identity later.

Official references:

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/auth/users

This maps well to Krunditark's desired flow: an anonymous user can own a temporary project without Krunditark collecting email/name upfront.

## 3. User states

Do not conflate application user state with paid entitlements.

### U0 — Public visitor

No Supabase Auth user is required for:

- landing content;
- public demo;
- static pricing/about/help/privacy pages.

The public parcel-search implementation may either create an anonymous session immediately or only when the first stateful project action occurs. Choose the implementation that avoids creating unnecessary abandoned Auth rows while keeping state recovery simple.

### U1 — Anonymous project user

Created via Supabase anonymous sign-in when needed.

Can:

- create a bounded temporary project;
- select parcel;
- create proposal draft;
- run only explicitly allowed free/pre-check operations;
- preserve state in the same browser/session.

Cannot by default:

- access paid report history after losing session;
- create organization/team;
- use professional/API features;
- receive email notifications;
- create public share links;
- exceed guest abuse/rate limits.

RLS must check `is_anonymous` where permanent identity is required. Anonymous users use `authenticated`, so policies that say only `to authenticated` are not sufficient to distinguish them.

### U2 — Permanent consumer user

Recommended initial methods:

1. **Email OTP**
2. **Google sign-in**

No password is required in the default consumer UX.

Can:

- recover projects across devices;
- purchase/own entitlements;
- view orders/report history;
- receive project notifications;
- delete account/project;
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

## 4. Recommended onboarding flow

```text
Landing
  |
  v
Search address/cadastral ID
  |
  v
Select parcel
  |
  v
Free parcel overview
  |
  v
Choose intent
  |
  v
Place/test idea
  |
  v
Need persistent/full value?
  |              \
  no              yes
  |                |
continue guest     v
              lightweight account sheet
              [Continue with Google]
              [Continue with email]
                      |
                      v
                preserve same project
                      |
                      v
                  pay/save/run
```

Never throw away the user's parcel/proposal when showing auth.

## 5. Account sheet UX

Title depends on context.

For save:

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

## 6. Email OTP UX

Preferred over magic-link-only flow because a numeric OTP can be entered without leaving the project tab and is less affected by mail-link scanners.

Flow:

1. enter email;
2. send OTP;
3. show 6-digit input;
4. verify;
5. link/convert the anonymous identity according to current Supabase-supported account-linking flow;
6. return to exact project/action.

Requirements:

- show masked destination email;
- resend cooldown;
- change-email action;
- paste support;
- mobile `autocomplete=one-time-code`;
- clear expired/incorrect-code errors;
- preserve project state on refresh.

## 7. Google sign-in

Google is a good second primary method because it reduces email-delivery friction and Supabase supports OAuth identity linking for anonymous users.

Requirements:

- approved redirect URLs for local/preview/production;
- return to original project/action;
- handle existing-account/identity-link conflicts safely;
- do not request unnecessary Google scopes;
- use a custom product/auth domain when production infrastructure supports it for trust.

## 8. Production email requirement

Supabase's default SMTP is for testing/demonstration and is not appropriate for public production. Current Supabase documentation states that without custom SMTP, delivery is restricted to project-team addresses and the default service has very low limits/no production SLA.

Official references:

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/deployment/going-into-prod

Before public email OTP:

- configure a production SMTP provider;
- set SPF/DKIM/DMARC;
- use a Krunditark-controlled sender/domain;
- disable email-provider link tracking that can break auth links;
- configure appropriate Auth rate limits;
- monitor delivery failures.

Potential providers may include Resend, Postmark, AWS SES, Brevo or another SMTP provider; selection is operational, not a core domain dependency.

## 9. Abuse prevention

Anonymous project creation and parcel analysis are valuable and therefore abuseable.

Controls:

- per-IP/per-anonymous-user rate limits at Edge Functions;
- bounded guest projects/proposals;
- CAPTCHA/Turnstile after suspicious/burst behavior rather than on every normal first interaction where possible;
- source/analysis cache;
- request size/geometry limits;
- paid entitlements for expensive repeated workflows;
- never allow a guest to trigger national source refresh;
- clean abandoned anonymous users/projects under documented retention policy.

Supabase explicitly recommends CAPTCHA as an additional protection for anonymous sign-ins.

## 10. Anonymous data retention

Anonymous users cannot recover their identity after clearing browser data/signing out unless identity was linked.

Therefore the UI must warn before relying on long-lived guest state:

> `Salvesta projekt, et see ei kaoks brauseriandmete kustutamisel.`

Recommended policy hypothesis:

- anonymous project drafts: 7–30 days of inactivity;
- extend/convert on permanent account;
- abandoned anonymous Auth users cleaned periodically according to Supabase/application capabilities and privacy policy.

Final retention numbers require production privacy review.

## 11. Payment and identity ordering

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

## 12. Entitlements are not Auth roles

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

## 13. Account pages

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

## 14. Organization/team onboarding

Post-consumer launch, Pro/Team flow:

1. permanent account;
2. choose professional plan/trial;
3. optional organization name;
4. invite users by email;
5. roles: owner/admin/member/viewer as product needs mature;
6. team projects belong to organization, not accidentally to one member;
7. audit meaningful billing/membership/project-share changes.

## 15. Sharing and collaboration

Do not make reports public by predictable URL.

Future share model:

- opt-in share link;
- cryptographically strong token;
- report-only or project-view permission;
- optional expiration;
- revocable;
- no account required for read-only shared report if owner chooses;
- exclude private notes/files by default.

## 16. Account deletion

Permanent account deletion must:

- explain what will be deleted and what may need statutory/accounting retention;
- revoke sessions/share links;
- delete/anonymize private project data according to policy;
- retain only legally required billing/accounting records under documented basis;
- not silently delete public-source data shared by the system.

## 17. Authentication analytics

Privacy-approved product metrics:

- anonymous parcel-to-proposal completion;
- auth prompt shown;
- auth method chosen;
- OTP delivery/verification failure rate;
- anonymous-to-permanent conversion;
- checkout recovery after auth;
- account-link conflict/error rate.

Do not send emails, parcel IDs or auth tokens to analytics.

## 18. Acceptance criteria

The onboarding system is correct when:

- a guest reaches meaningful parcel/proposal value without registration;
- guest work is owned by an anonymous Auth ID rather than globally public state;
- account conversion preserves the exact project;
- consumer can use email OTP or Google;
- no password is required by default;
- RLS distinguishes anonymous/permanent users where needed;
- paid report is recoverable after browser/device failure once attached to permanent account;
- public email auth uses custom SMTP;
- abuse controls exist;
- account/project deletion is implemented before public production.
