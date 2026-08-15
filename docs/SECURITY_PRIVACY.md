# Security and Privacy — Krunditark

Last security architecture review: **2026-08-15**

## 1. Security objective

Krunditark combines public official parcel/spatial facts with **private user intent**: selected parcels, proposed building locations, notes, report history, identity, future files and payments.

Public source data does not make a user's project public.

Protect:

- anonymous and permanent user projects;
- analysis/report history;
- rule/source administration;
- source/data-release integrity;
- Supabase/Gemini/SMTP/payment credentials;
- future uploaded plans;
- payment/entitlement integrity;
- availability against expensive source/GIS/AI abuse.

## 2. Trust boundaries

### Browser — untrusted

Never trust client-supplied:

- role/admin flags;
- `is_anonymous` booleans;
- project ownership IDs;
- geometry measurements;
- price/currency/product entitlement;
- payment success query parameters;
- source URLs;
- uploaded MIME/filename;
- AI/source text as instructions.

### Supabase Auth

Identifies a session. Authorization still comes from RLS/server checks.

### Edge Functions/server

Privileged boundary for:

- source adapters/ingestion;
- analysis orchestration;
- admin operations;
- Gemini calls;
- payment webhook/checkout later;
- entitlement checks;
- future file parsing.

### Official sources

Authoritative for their documented scope only. Payload shape/content is external and must be validated.

### Gemini

Untrusted generative component. Output can never modify deterministic state.

### Payment provider — future

Payment authority only after exact server-side webhook/signature verification; browser redirect is not proof of payment.

## 3. Secrets

Never expose in browser/Git/logs/fixtures:

- Supabase elevated/service credentials;
- `GEMINI_API_KEY`;
- SMTP credentials;
- payment-provider secret/API keys;
- webhook signing secrets;
- restricted source credentials;
- admin/service tokens.

Any `VITE_*` value is public.

## 4. Authentication model

See ADR 0006.

### Public

Static marketing/help/sample content can be unauthenticated.

### Anonymous Auth user

Supabase anonymous user:

- has unique Auth ID;
- uses PostgreSQL `authenticated` role;
- JWT exposes `is_anonymous`;
- can own a bounded guest project;
- cannot recover after losing local/session identity unless linked.

A policy only saying `to authenticated` does **not** distinguish guest from permanent user.

### Permanent consumer

Email OTP/Google-linked account for cross-device recovery, commerce, monitoring, sharing and Pro.

### Admin/internal verifier

Explicit server-side role; never client-elevated.

## 5. RLS requirements

- RLS on every client-accessible user table;
- default deny;
- ownership via `auth.uid()`;
- anonymous A cannot access anonymous B;
- permanent A cannot access B;
- permanent-only operations explicitly require non-anonymous verified identity;
- internal `geo`, `rules`, ingestion, audit and commerce-event tables not broadly exposed;
- admin role cannot be changed through ordinary profile update;
- orders/entitlements private to user/org;
- future organization data checks membership/role;
- share access uses controlled token/scope, not public table SELECT.

RLS tests are mandatory on clean DB.

## 6. Anonymous abuse prevention

Controls:

- rate limits per IP/session/user as appropriate;
- CAPTCHA/Turnstile on suspicious/burst or policy-defined guest Auth flows;
- bounded guest projects/proposals/analyses;
- geometry/body limits;
- no user-triggered national sync;
- abandoned anonymous user/draft cleanup;
- permanent identity required for paid history/monitoring/sharing/Pro.

Avoid long-term raw IP retention without a justified operational/legal reason.

## 7. Guest -> permanent conversion

Must:

- use supported Supabase identity-link/conversion flow;
- preserve exact project;
- handle existing identity conflicts safely;
- be retry/idempotency safe;
- never copy a project based on a client-provided target user ID;
- prevent duplicate/incorrect ownership.

## 8. Auth email security

Public email OTP requires custom SMTP.

Requirements:

- SPF/DKIM/DMARC;
- Krunditark-controlled sender/domain;
- sensible OTP expiry/resend/rate limits;
- delivery failure monitoring;
- no secrets/sensitive report details in Auth mail;
- disable provider link tracking if it alters Auth links.

## 9. Authorization dimensions are separate

Do not conflate:

```text
identity
role
resource ownership
paid entitlement
organization membership
share permission
```

Examples:

- authenticated != paid;
- paid != admin;
- share recipient != owner;
- Pro subscriber != member of every organization.

Server is authoritative.

## 10. External source fetching / SSRF

Never build a generic server fetch proxy.

Every adapter has:

- fixed/allow-listed host/base path;
- controlled layer/endpoint/query construction;
- protocol restrictions;
- timeout/retry;
- max response size;
- redirect policy;
- content/schema validation;
- typed failure.

User input may select a cadastral ID/search value, never an arbitrary URL.

## 11. Source-response/parser safety

Validate:

- content type/encoding;
- response size;
- XML external-entity/parser behavior;
- JSON/schema;
- identifier/text length;
- geometry/SRID;
- unexpected codes/enums.

Provider/source text is output-escaped; never render raw untrusted HTML.

Source text sent to Gemini is evidence, not instructions.

## 12. GIS resource controls

Before PostGIS:

- geometry type;
- coordinate count/range;
- Estonia/sensible bounds where applicable;
- max area/extent;
- request size;
- topology validity;
- complexity limits.

Use query/statement timeouts where appropriate. Client-computed area/distance is never authoritative.

## 13. Scheduled ingestion security

- privileged jobs separate from user traffic;
- source registry controls endpoints;
- locking/idempotency/checkpoints;
- staging before promotion;
- schema/CRS/geometry validation;
- abnormal-diff quarantine;
- failed/incomplete fetch cannot replace/delete active good release;
- admin manual promotion/refresh audited;
- routine sync uses zero Gemini calls.

## 14. Legal/rule administration

High-trust operations:

- draft/verify/retire server/admin only;
- exact official source/effective date;
- actor/time/audit;
- versions already used by reports remain immutable;
- detected legal change creates candidate, never auto-promotes;
- stronger MFA for internal high-trust admins should be required/decided before production.

## 15. Gemini security/privacy

Server-side only.

Send minimum necessary:

- selected structured findings;
- measurements;
- approved source identifiers/short excerpts where permitted;
- locale/current question.

Do not send by default:

- account/billing identity;
- unrelated project history;
- private notes;
- private plan uploads until a separate privacy decision approves it.

Output rules:

- schema validated;
- references limited to supplied IDs;
- reject invented source URL/state change;
- deterministic fallback;
- no autonomous web-search as authoritative project source without future ADR.

## 16. AI logging/retention

Prefer metadata:

- provider/model;
- prompt-template/schema version;
- analysis/finding IDs;
- latency/status;
- token/cost metadata when available;
- cache hit/miss.

Do not indefinitely retain/log unrestricted raw prompts/responses.

## 17. Commerce security — future

See `COMMERCE_AND_ENTITLEMENTS.md`.

Client never controls:

- authoritative price;
- entitlement grant;
- paid/subscription state;
- refund state.

### Webhook

- verify current provider signature scheme;
- use raw body if provider requires;
- unique provider event ID/dedupe;
- amount/currency/order relationship validated;
- replay/idempotency safe;
- secrets excluded from logs;
- provider event maps to Krunditark order/payment/entitlement state.

Prefer provider-hosted/secure checkout so Krunditark never handles raw card/bank credentials.

Never store PAN/CVV/payment instrument secrets.

## 18. Entitlement integrity

- server checks entitlement on paid operation;
- consumption atomic/idempotent;
- concurrent requests cannot overconsume;
- technical retry does not consume twice;
- client UI flags are not authorization;
- admin manual grant/revoke/refund audited;
- subscription expiry does not silently delete report/project history.

## 19. Share-link security — future

- opt-in;
- cryptographically strong token;
- ideally hashed token storage where design permits;
- exact read-only scope by default;
- optional expiry;
- revocable;
- private notes/files excluded by default;
- noindex;
- revoke on relevant delete/security event;
- avoid leaking token to analytics/referrers.

Use an appropriate `Referrer-Policy` on private/shared views.

## 20. File upload security — future

For PDF/DXF/DWG/IFC:

- private Storage bucket;
- ownership/org RLS;
- random object keys;
- extension not trusted;
- MIME/content validation;
- file/decompression/parser time-memory limits;
- no path traversal;
- safe content disposition;
- malware scanning if risk/scale justifies;
- retention/delete;
- never automatically send private upload to Gemini before approved privacy flow.

Treat extracted document text as prompt-injection capable.

## 21. Data classification

### Public-source facts

Parcel geometry, public restrictions/plans/building facts etc. Still subject to source terms/attribution.

### Account PII

Email, display name, linked identity/billing information.

### Private project intent

Selected parcel-user association, proposed geometry, notes, variants, questions, reports, files.

### Commerce/accounting

Orders, totals, provider IDs, invoice/refund records.

### Security/operations

Audit, errors, rate/abuse state, source health.

## 22. Data minimization

Do not collect by default:

- landowner identity just because a parcel is checked;
- personal code;
- phone/postal address when not needed;
- raw payment instrument data;
- exact device location unless user explicitly uses a feature needing it;
- analytics copies of full cadastral ID/geometry/notes.

## 23. Privacy defaults

- projects private;
- parcel search does not publish user interest;
- no public profile required;
- sharing off by default;
- monitoring opt-in where non-mandatory;
- uploads private;
- professional/partner sees report only after explicit user share/lead action.

## 24. Analytics privacy

Before enabling a provider, decide legal basis/consent/cookie behavior.

Do not send to third-party analytics by default:

- full address;
- cadastral ID;
- exact proposal GeoJSON;
- user notes/files;
- email/name;
- AI prompt/answer;
- payment/order identifiers.

Prefer coarse semantic events and first-party authoritative server events for payments/report completion.

Analytics failure never blocks product.

## 25. Logging

Allow:

- trace/request ID;
- safe internal project/analysis/source/order IDs;
- error code/status/latency;
- data release/rule version;
- sync metrics;
- commerce fulfillment state.

Do not log:

- Authorization/cookies;
- API/SMTP/webhook secrets;
- raw card data;
- full private plan;
- unrestricted provider response;
- full raw AI prompt/response by default.

## 26. Retention

Define separately before production:

- anonymous users/drafts;
- permanent projects/reports;
- source datasets/evidence;
- raw source diagnostics;
- audit/security logs;
- AI content/metadata;
- uploads;
- orders/accounting/refunds;
- share links;
- analytics.

Do not delete evidence needed for a retained historical report without an equivalent reproducibility mechanism.

## 27. User deletion/export

Before production:

- account/project deletion workflow;
- revoke sessions/share links;
- delete private files;
- erase/anonymize project PII as applicable;
- transparently retain only justified statutory accounting/security records;
- explain that national public-source records are not removed by deleting a Krunditark account;
- support appropriate data export/DSAR process.

## 28. Admin security

- permanent verified account;
- server-verified role;
- MFA requirement/review for high-trust admin;
- no role via profile PATCH;
- audit rule/source/refund/entitlement changes;
- least privilege;
- avoid broad service-role use in browser/admin UI.

## 29. CORS and security headers

Production:

- explicit allowed origins;
- no wildcard credentialed CORS;
- CSP compatible with map/Supabase/selected providers;
- HSTS after production HTTPS readiness;
- `X-Content-Type-Options: nosniff` where supported;
- suitable `Referrer-Policy`;
- `frame-ancestors` restriction except future deliberately embeddable widget.

## 30. Supply-chain/security operations

- lockfile + `npm ci`;
- deliberate dependency upgrades;
- avoid unnecessary parser/GIS/AI/payment packages;
- secret scanning;
- branch protection/required CI before production;
- protect GitHub/Supabase organization accounts with MFA;
- production/staging access minimized.

## 31. Threat scenarios

At minimum test/review:

1. IDOR with guessed project/report/order UUID;
2. anonymous user accessing permanent-only action;
3. client role/admin spoof;
4. forged cheap checkout amount;
5. fake `payment=success` redirect;
6. replayed/invalid payment webhook;
7. guessed share report URL;
8. SSRF arbitrary URL;
9. huge/malicious geometry;
10. malicious XML/source payload;
11. source/upload prompt injection;
12. Gemini invented legal source;
13. source sync suddenly removes most objects;
14. stale data shown current;
15. account delete with active shares/payments;
16. analytics receiving private parcel/project data;
17. upload parser resource exhaustion.

## 32. Production readiness gate

Before public paid production:

- no secret in frontend/repo/logs;
- production/non-production Supabase separation/backup decision;
- owner/admin MFA policy;
- RLS tests green;
- anonymous abuse controls;
- custom SMTP;
- Auth redirects/CORS correct;
- source allow-lists/health/last-known-good release;
- current verified rules;
- Gemini privacy/config reviewed;
- payment webhook/idempotency tests if commerce enabled;
- account deletion/retention implemented;
- privacy/terms/refund/payment disclosures reviewed;
- CSP/headers tested;
- incident/support path.

Security is part of each feature's Definition of Done, not a launch-week task.
