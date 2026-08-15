# Environment Configuration — Krunditark

## 1. Principle

A static frontend has no secrets.

Any variable included in the Vite browser build must be treated as public.

## 2. Frontend variables

Planned variables:

```dotenv
VITE_APP_ENV=local
VITE_APP_ORIGIN=http://localhost:5173
VITE_BASE_PATH=/
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
```

Optional future public variables may include approved map-style URLs or public feature flags.

### Rules

- only public values use `VITE_` prefix;
- never place secret/elevated keys in a Vite variable;
- never create `VITE_GEMINI_API_KEY` or equivalent;
- `.env.example` contains placeholders only;
- `.env.local` and real environment files remain ignored.

## 3. Supabase Edge Function secrets and server configuration

Planned server-side configuration:

```text
KRUNDITARK_ALLOWED_ORIGINS
KRUNDITARK_APP_ENV
KRUNDITARK_MARU_WFS_URL
KRUNDITARK_PLANIS_WFS_URL
KRUNDITARK_EELIS_WFS_URL
KRUNDITARK_EHR_API_BASE_URL

GEMINI_API_KEY
KRUNDITARK_GEMINI_MODEL
KRUNDITARK_GEMINI_TIMEOUT_MS
KRUNDITARK_GEMINI_MAX_OUTPUT_TOKENS
```

`GEMINI_API_KEY` is the production AI credential and must exist only in the Supabase Edge Function/server secret environment.

The Gemini model is deliberately configured through `KRUNDITARK_GEMINI_MODEL` instead of being duplicated across source files. Model selection can change independently from deterministic GIS/rules behavior.

Google's current Gemini JavaScript documentation uses the Google GenAI SDK and supports `GEMINI_API_KEY` as the API-key environment variable. Implementation must verify the current official Google documentation before SDK/model upgrades:

- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/migrate

Exact government-provider layer configuration should be explicit rather than arbitrary user-controlled URLs.

Supabase automatically provides platform environment values/credentials to Edge Functions; use the current Supabase-supported key mechanism and avoid manually copying elevated credentials into frontend config.

## 4. Gemini local development

For local Edge Function development, a developer may provide:

```dotenv
GEMINI_API_KEY=<local-development-key>
KRUNDITARK_GEMINI_MODEL=<approved-current-model-id>
KRUNDITARK_GEMINI_TIMEOUT_MS=15000
KRUNDITARK_GEMINI_MAX_OUTPUT_TOKENS=<approved-limit>
```

Rules:

- the real key never belongs in `.env.example`;
- tests use `FakeExplanationProvider` by default and do not require this key;
- live Gemini tests are opt-in integration tests only;
- CI must not call Gemini for ordinary unit/build validation;
- never print `GEMINI_API_KEY` in test/debug output.

## 5. Source configuration

Prefer configuration like:

```text
source ID -> approved base URL -> approved layer(s) -> timeout -> max features -> freshness policy
```

Do not expose a generic environment variable that permits a user request to choose any fetch URL.

## 6. Environment matrix

| Environment | Frontend | Backend | AI | Purpose |
|---|---|---|---|---|
| local | Vite localhost | local Supabase | fake by default / Gemini opt-in | development/tests |
| preview | GitHub Pages | non-production Supabase | Gemini server-side if enabled | integration/demo |
| production | final host/domain | production Supabase | Gemini server-side | public users |

Use separate Supabase projects for preview and production once real user testing begins.

Use separately manageable Gemini credentials for non-production and production when the Google account/project setup permits it, so a development leak does not automatically compromise production.

## 7. Local prerequisites

Expected:

- Git
- Node.js (project-supported version)
- npm
- Supabase CLI
- Docker-compatible runtime for local Supabase/functions

Add `.nvmrc`, `.node-version` or `engines` when the frontend scaffold chooses a Node version.

## 8. `.gitignore` requirements

Must ignore at least, according to generated tool layout:

```text
.env
.env.local
.env.*.local
node_modules/
dist/
Supabase local state/temporary secrets
coverage/
Playwright local artifacts where appropriate
```

Do not ignore `.env.example`.

## 9. GitHub Actions configuration

CI should not need production secrets for:

- format;
- lint;
- typecheck;
- unit tests;
- static build if publishable preview values can be safely provided.

Deployment variables/secrets should be scoped to the workflow/environment that needs them.

Gemini live integration tests, if ever added, must be explicitly separated from ordinary PR CI and use a non-production restricted key.

Never print secrets during CI troubleshooting.

## 10. Auth redirect origins

Maintain approved redirect origins per environment.

Local example:

```text
http://localhost:5173
```

Preview example:

```text
https://pikkst.github.io/krunditark.ee/
```

Production:

```text
https://krunditark.ee
```

Because the GitHub Pages phase may use hash routing, test the actual Supabase Auth callback flow before marking auth complete.

## 11. CORS origins

Edge Functions should load a controlled list from server configuration.

Do not infer trusted origins from arbitrary request headers.

Expected environment-specific allow-list:

```text
local: http://localhost:5173
preview: https://pikkst.github.io
production: https://krunditark.ee
```

Use exact behavior appropriate to the deployed path and Supabase CORS implementation.

## 12. Source endpoint changes

Official government endpoints can change.

When changing endpoint/layer configuration:

- update `DATA_SOURCES.md`;
- update source definition/migration/config;
- update fixtures if schema changed;
- run contract tests;
- do not silently point a source ID to a semantically different dataset.

## 13. Gemini SDK/model changes

Gemini API and model availability can change independently of Krunditark releases.

When changing SDK/model:

- verify current official Google AI documentation;
- update lockfile intentionally;
- keep SDK types inside the Gemini adapter;
- run structured-output and adversarial tests;
- confirm timeout/rate/error mapping;
- record selected model in deployment/release configuration;
- do not alter deterministic finding semantics merely because a different Gemini model is selected.

## 14. Secret incident procedure

If a secret is committed or exposed:

1. revoke/rotate it immediately;
2. replace in secret manager;
3. assess logs/use;
4. remove from current repository state/history as appropriate;
5. do not assume deleting the file alone makes the old secret safe;
6. document incident/remediation if production-relevant.
