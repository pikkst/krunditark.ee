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
- `.env.example` contains placeholders only;
- `.env.local` and real environment files remain ignored.

## 3. Supabase Edge Function secrets

Potential server-side configuration:

```text
KRUNDITARK_ALLOWED_ORIGINS
KRUNDITARK_APP_ENV
KRUNDITARK_MARU_WFS_URL
KRUNDITARK_PLANIS_WFS_URL
KRUNDITARK_EELIS_WFS_URL
KRUNDITARK_EHR_API_BASE_URL
KRUNDITARK_LLM_PROVIDER
KRUNDITARK_LLM_API_KEY
KRUNDITARK_LLM_MODEL
```

Exact provider/layer configuration should be explicit rather than arbitrary user-controlled URLs.

Supabase automatically provides platform environment values/credentials to Edge Functions; use the current Supabase-supported key mechanism and avoid manually copying elevated credentials into frontend config.

## 4. Source configuration

Prefer configuration like:

```text
source ID -> approved base URL -> approved layer(s) -> timeout -> max features -> freshness policy
```

Do not expose a generic environment variable that permits a user request to choose any fetch URL.

## 5. Environment matrix

| Environment | Frontend | Backend | Purpose |
|---|---|---|---|
| local | Vite localhost | local Supabase | development/tests |
| preview | GitHub Pages | non-production Supabase | integration/demo |
| production | final host/domain | production Supabase | public users |

Use separate Supabase projects for preview and production once real user testing begins.

## 6. Local prerequisites

Expected:

- Git
- Node.js (project-supported version)
- npm
- Supabase CLI
- Docker-compatible runtime for local Supabase/functions

Add `.nvmrc`, `.node-version` or `engines` when the frontend scaffold chooses a Node version.

## 7. `.gitignore` requirements

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

## 8. GitHub Actions configuration

CI should not need production secrets for:

- format;
- lint;
- typecheck;
- unit tests;
- static build if publishable preview values can be safely provided.

Deployment variables/secrets should be scoped to the workflow/environment that needs them.

Never print secrets during CI troubleshooting.

## 9. Auth redirect origins

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

## 10. CORS origins

Edge Functions should load a controlled list from server configuration.

Do not infer trusted origins from arbitrary request headers.

Expected environment-specific allow-list:

```text
local: http://localhost:5173
preview: https://pikkst.github.io
production: https://krunditark.ee
```

Use exact behavior appropriate to the deployed path and Supabase CORS implementation.

## 11. Source endpoint changes

Official government endpoints can change.

When changing endpoint/layer configuration:

- update `DATA_SOURCES.md`;
- update source definition/migration/config;
- update fixtures if schema changed;
- run contract tests;
- do not silently point a source ID to a semantically different dataset.

## 12. Secret incident procedure

If a secret is committed or exposed:

1. revoke/rotate it immediately;
2. replace in secret manager;
3. assess logs/use;
4. remove from current repository state/history as appropriate;
5. do not assume deleting the file alone makes the old secret safe;
6. document incident/remediation if production-relevant.
