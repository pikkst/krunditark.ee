# Security and Privacy — Krunditark

## 1. Security objectives

Protect:

- user accounts and saved projects;
- analysis history;
- administrative rule/source controls;
- Supabase/database credentials;
- external provider credentials;
- AI provider credentials;
- integrity of regulatory/spatial analysis;
- service availability from abusive expensive queries.

A public government dataset does not make Krunditark's internal administration, caches or user projects public.

## 2. Frontend trust model

The GitHub Pages/browser application is an untrusted client.

It may contain:

- public frontend configuration;
- Supabase URL;
- Supabase publishable key;
- public map/style configuration.

It must never contain:

- Supabase secret/service-role key;
- database password;
- AI provider key;
- privileged government/provider credential;
- admin bypass token;
- private signing key.

Assume every value bundled by Vite is publicly readable.

## 3. Supabase key policy

Use current Supabase key model for new implementation:

- browser: publishable key;
- server/Edge Functions: secret/elevated credentials only when needed.

Legacy `anon`/`service_role` naming may appear in older tooling, but no elevated/service credential may be sent to a browser.

## 4. Row Level Security

RLS is mandatory on all browser-accessible user tables.

Principles:

- default deny;
- owner access derived from authenticated `auth.uid()` relationships;
- no user can choose `user_id` to gain access to someone else's project;
- profile role changes are not client writable;
- internal tables are not exposed merely because RLS could be added.

Minimum tests:

- anon denied;
- user A own project allowed;
- user A user B project denied;
- user cannot self-promote admin;
- user cannot read internal source/audit/rules mutation tables;
- deleted/expired auth session behavior.

## 5. Admin authorization

Admin action requires both:

1. valid authenticated session/server identity;
2. server-side verified admin role/claim sourced from controlled data.

Never trust:

```json
{"isAdmin": true}
```

from client input.

Admin actions must be audited.

## 6. Edge Function security

Every public Edge Function must implement:

- explicit allowed methods;
- content-type validation;
- input schema validation;
- auth requirement or explicit public classification;
- authorization;
- request/body size limits;
- timeout behavior;
- safe error mapping;
- CORS policy;
- rate/abuse controls when expensive;
- request/trace ID.

Do not proxy arbitrary user-supplied URLs.

## 7. SSRF prevention in source adapters

Government/provider adapters must use allow-listed/configured endpoints.

Never accept a URL from user input and fetch it server-side as part of generic source retrieval.

Prevent:

- internal IP access;
- metadata-service access;
- alternate-protocol fetches;
- redirect escape to unapproved host where relevant.

If following provider redirects, validate final host policy.

## 8. External-source poisoning and integrity

External responses are untrusted input even when the authority is trusted.

Validate:

- content type;
- maximum size;
- schema;
- geometry validity;
- identifiers;
- coordinate system;
- expected layer/source semantics.

Unexpected provider schema => `SOURCE_RESPONSE_INVALID` / `unknown`, not best-effort silent coercion.

Persist source/payload hash or equivalent provenance metadata.

## 9. Geometry resource exhaustion

Apply limits to:

- proposal vertex count;
- polygon size/extent;
- WFS bounding boxes;
- maximum provider features;
- intersection output complexity;
- geometry simplification for client display.

Do not allow a malicious client to request national-scale arbitrary PostGIS intersections through a generic API.

## 10. Rate limiting

Prioritize limits for:

- parcel/source refresh;
- analysis creation;
- AI explanation/questions;
- document upload/parsing;
- future batch APIs.

Use per-user limits for authenticated actions and suitable abuse controls for public endpoints.

Do not retain full IP addresses indefinitely merely for convenience. Document any IP processing/retention used for security.

## 11. CORS

Development may allow documented local origins.

Production allow-list should include only intended origins, for example:

- the current GitHub Pages preview origin;
- `https://krunditark.ee` after launch;
- `https://www.krunditark.ee` only if actually used.

Do not use wildcard origins with credentialed requests.

## 12. Content Security Policy

When hosting capability permits, deploy a restrictive CSP allowing only required sources for:

- self scripts/styles/assets;
- Supabase HTTPS/WebSocket endpoints;
- approved map tile/style endpoints;
- approved images/fonts if used.

Avoid unsafe inline scripts unless technically unavoidable and documented.

GitHub Pages header limitations may require a transition strategy/meta CSP; Cloudflare can later provide stronger response-header controls.

## 13. Authentication

Preferred MVP direction: low-friction Supabase Auth email magic link/OTP unless product owner selects another method.

Requirements:

- approved redirect URLs only;
- secure session handling via official Supabase SDK;
- no token logging;
- logout clears local session state;
- sensitive actions re-check server auth.

## 14. File uploads

Future blueprint/document upload:

- authenticated user only unless explicit public workflow;
- bucket RLS;
- size limit;
- allow-listed MIME/extensions;
- generated storage object names;
- do not trust filename;
- malware/scanning strategy before broad document support;
- no public bucket for private project documents;
- signed URLs with short expiry where needed;
- parser resource/time limits.

## 15. Personal-data minimization

Do not require or store parcel-owner identity for normal analysis.

Possible personal data Krunditark itself may process:

- account email;
- profile name if user adds one;
- project names/notes;
- uploaded plans/documents;
- support/audit/security metadata;
- AI questions/content.

Collect only what a feature requires.

## 16. Public cadastral data and privacy

Do not infer that every piece of land-related information is non-personal in every context. Public availability does not remove obligations around combining, profiling, retention or user-associated project data.

Krunditark should avoid creating unnecessary owner-person profiles.

## 17. Privacy by design

Before production:

- privacy notice available from every page/footer;
- define controller/contact information;
- purposes/legal bases documented;
- subprocessors/providers listed as required;
- retention periods defined;
- account/project deletion implemented;
- data-subject request process defined;
- analytics decision documented;
- AI provider data handling documented.

## 18. Retention baseline

Exact periods require product/legal decision before launch.

Recommended design categories:

- active user projects: until user deletion/account policy;
- analyses: user history, delete with project/account unless legal/security reason requires otherwise;
- source cache: based on freshness/terms, not user identity;
- operational source-fetch logs: short/medium term;
- security audit logs: longer justified term;
- AI raw payloads: minimize and avoid indefinite retention;
- uploaded documents: user-controlled lifecycle.

Retention must be operationally enforceable, not only written in a policy.

## 19. Logging

Use structured logs with:

- request ID;
- user ID only when needed, preferably internal UUID;
- analysis ID;
- adapter/rule code;
- status/duration;
- safe error code.

Redact/never log:

- Authorization headers;
- cookies;
- access/refresh tokens;
- API/secret keys;
- database connection strings;
- complete private documents;
- arbitrary sensitive request bodies.

## 20. Secrets management

- local secrets in ignored `.env`/Supabase local secret mechanism;
- cloud secrets in Supabase secret management;
- GitHub Actions secrets only for deployment values that truly require them;
- frontend publishable variables are not secrets.

Rotate any secret immediately if committed accidentally. Removing a git line is not sufficient once pushed.

## 21. Dependency security

- commit lockfile;
- use `npm ci` in CI;
- review major dependency changes;
- avoid unmaintained map/drawing/auth packages where alternatives exist;
- enable automated dependency/security update tooling when repository policy is ready.

## 22. Threat model summary

### T1 — Cross-user data access

Mitigation: RLS + ownership tests + server authorization.

### T2 — Secret leakage from static bundle

Mitigation: publishable-key-only frontend; server-side privileged APIs.

### T3 — Rule tampering/admin compromise

Mitigation: server-only verification workflow + audit + immutable versions.

### T4 — Upstream source schema manipulation/change

Mitigation: strict validation, fixture/contract monitoring, fail to unknown.

### T5 — Prompt injection

Mitigation: AI separated from deterministic findings; evidence treated as data; output validation.

### T6 — GIS DoS

Mitigation: geometry/query size limits, indexed bounded queries, rate limits.

### T7 — SSRF

Mitigation: allow-listed adapter endpoints; no generic URL fetch API.

### T8 — Misleading stale data

Mitigation: freshness metadata and stale policies.

### T9 — XSS from source/user text

Mitigation: React escaping, sanitize only where rendering rich HTML is unavoidable, never render provider HTML directly.

### T10 — Broken auth callback/deep links on static host

Mitigation: tested GitHub Pages routing strategy and restricted redirect URLs.

## 23. Security launch gate

Do not launch production until:

- RLS tests pass from clean database;
- no elevated secret exists in frontend bundle;
- admin writes require server role verification;
- analysis endpoints have resource/rate controls;
- privacy notice/retention decisions exist;
- dependency/secret scanning is enabled or documented;
- threat review is completed;
- provider/AI errors fail safely.
