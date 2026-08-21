# Environment Configuration — Krunditark

Last reviewed: **2026-08-21**

## 1. Principle

A static frontend has no secrets.

Any variable included in the Vite browser build must be treated as public.

## 2. Frontend variables

Implemented baseline variables:

```dotenv
VITE_APP_ENV=local
VITE_APP_ORIGIN=http://localhost:5173
VITE_BASE_PATH=/
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
```

### Phase 4 planned public map configuration

KT-040 may add the following publishable browser configuration after the owned tile proxy exists:

```dotenv
VITE_MAP_TILE_PROXY_URL=https://example-project.supabase.co/functions/v1/map-tiles
```

The exact route may change consistently during KT-040, but the semantic contract is fixed by ADR 0010 / `MAP_STACK_AND_BASEMAP.md`:

- browser sees only the Krunditark-owned proxy base URL;
- browser does not receive an arbitrary MaRu upstream URL selector;
- the value is public configuration, not a secret;
- no provider/server credential is embedded in the URL.

Do **not** add a direct production MaRu tile-origin URL as the browser's primary map configuration.

### `VITE_BASE_PATH`

Configures the Vite `base` option for asset paths. Read from the environment at build time.

- Local development default: `/`
- GitHub Pages preview: `/krunditark.ee/`
- Production (custom domain): `/`

Only public values use `VITE_` prefix. `VITE_BASE_PATH` is safe to expose because it is deployment routing configuration, not a secret.

### Rules

- only public values use `VITE_` prefix;
- never place secret/elevated keys in a Vite variable;
- never create `VITE_GEMINI_API_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY` or equivalent;
- map proxy configuration is publishable but never an arbitrary-fetch capability;
- `.env.example` contains placeholders only;
- `.env.local` and real environment files remain ignored.

## 3. Supabase Edge Function secrets and server configuration

Planned/implemented server-side configuration is feature-specific.

Conceptual values include:

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

### Phase 4 map-tile proxy configuration

ADR 0010 permits an initial narrowly scoped Supabase Edge Function tile proxy. KT-040 should define explicit server-only configuration rather than a generic arbitrary URL, for example:

```text
KRUNDITARK_MAP_TILE_PROVIDER=maru
KRUNDITARK_MAP_TILE_UPSTREAM_BASE_URL=<verified MaRu tiled-service base>
KRUNDITARK_MAP_TILE_ALLOWED_MODES=kaart,ortofoto
KRUNDITARK_MAP_TILE_TIMEOUT_MS=<bounded timeout>
KRUNDITARK_MAP_TILE_MAX_BYTES=<bounded response size>
```

Exact names may be adjusted once and then documented consistently in KT-040. Requirements:

- upstream provider mapping is server-owned;
- allowed modes are fixed/validated;
- client cannot supply an arbitrary upstream URL;
- credentials, if a future provider ever requires them, remain server-side unless explicitly documented as publishable credentials;
- MaRu proxy/contact/terms requirements are followed.

`GEMINI_API_KEY` is the production AI credential and must exist only in the Supabase Edge Function/server secret environment.

The Gemini model is deliberately configured through `KRUNDITARK_GEMINI_MODEL` instead of being duplicated across source files. Model selection can change independently from deterministic GIS/rules behavior.

Google's Gemini SDK/model lifecycle must be verified from current official documentation before implementation/upgrades.

Supabase automatically provides platform environment values/credentials to Edge Functions; use the current Supabase-supported mechanism and avoid manually copying elevated credentials into frontend config.

## 4. Local map development

Phase 4 local development must distinguish deterministic tests from optional live integration.

Normal unit/component/Playwright CI:

- must not depend on live MaRu tiles;
- may mock/route tile requests or use a deterministic local fixture/placeholder;
- must still prove map container sizing, overlay state, click behavior and degraded-map behavior.

Controlled local/manual integration may point `VITE_MAP_TILE_PROXY_URL` to the local or non-production Krunditark tile proxy.

Do not bypass the intended proxy in production code merely to make local Leaflet setup easier.

## 5. Gemini local development

For local Edge Function development, a developer may provide:

```dotenv
GEMINI_API_KEY=<local-development-key>
KRUNDITARK_GEMINI_MODEL=<approved-current-model-id>
KRUNDITARK_GEMINI_TIMEOUT_MS=15000
KRUNDITARK_GEMINI_MAX_OUTPUT_TOKENS=<approved-limit>
```

Rules:

- the real key never belongs in `.env.example`;
- tests use fake explanation provider by default and do not require this key;
- live Gemini tests are opt-in integration tests only;
- CI must not call Gemini for ordinary unit/build validation;
- never print `GEMINI_API_KEY` in test/debug output.

## 6. Source configuration

Prefer configuration like:

```text
source ID -> approved base URL -> approved layer(s) -> timeout -> max features -> freshness policy
```

Do not expose a generic environment variable that permits a user request to choose any fetch URL.

The visual MaRu basemap/tile proxy is presentation infrastructure with its own contract in `MAP_STACK_AND_BASEMAP.md`; it is not a Phase 5 analytical source release.

## 7. Environment matrix

| Environment | Frontend | Backend | Map | AI | Purpose |
| --- | --- | --- | --- | --- | --- |
| local | Vite localhost | local Supabase | mocked/fixture by default; local proxy for controlled manual integration | fake by default / Gemini opt-in | development/tests |
| preview | GitHub Pages | non-production Supabase | non-production Krunditark tile proxy | Gemini server-side if enabled | integration/demo |
| production | final host/domain | production Supabase | production Krunditark fixed tile proxy -> approved MaRu tiled service | Gemini server-side | public users |

Use separate Supabase projects for preview and production once real user testing begins.

Use separately manageable Gemini credentials for non-production and production when the Google account/project setup permits it.

The production map proxy/domain must match the provider-contact/operational conclusion recorded for MaRu public use.

## 8. Local prerequisites

Expected:

- Git
- Node.js (project-supported version)
- npm
- Supabase CLI
- Docker-compatible runtime for local Supabase/functions
- Playwright browser installation after KT-038

Add `.nvmrc`, `.node-version` or `engines` when the frontend scaffold chooses a Node version.

## 9. `.gitignore` requirements

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

## 10. GitHub Actions configuration

CI should not need production secrets for:

- format;
- lint;
- typecheck;
- unit tests;
- critical Playwright tests with deterministic network fixtures;
- static build if publishable preview values can be safely provided.

Normal CI must not require a live MaRu tile service to prove map behavior.

### Database version alignment

The CI PostgreSQL service image must match the Supabase project target declared in `supabase/config.toml`:

- `supabase/config.toml` `[db] major_version = 17`
- CI service image: `postgis/postgis:17-3.4`

Do not introduce version drift between local Supabase config, CI and production Supabase without a documented compatibility exception.

### Clean-start migration contract

CI applies the full migration chain to an empty database before running tests. SQL errors fail fast with `ON_ERROR_STOP=1`.

### Migration/RLS tests in CI

After clean-start migration, run the migration/RLS regression suite and applicable live-database regression steps.

Deployment variables/secrets should be scoped to the workflow/environment that needs them.

Gemini/live-government integration tests, if ever added, must be explicitly separated from ordinary PR CI.

Never print secrets during CI troubleshooting.

## 11. Auth redirect origins

Maintain approved redirect origins per environment.

Local example:

```text
http://localhost:5173
```

Preview example:

```text
https://pikkst.github.io/krunditark.ee/
```

Production (custom domain, future):

```text
https://krunditark.ee
```

Because the GitHub Pages preview uses a repository-path base, test the actual Supabase Auth callback flow before marking auth complete.

## 12. CORS origins

Edge Functions should load a controlled list from server configuration.

Do not infer trusted origins from arbitrary request headers.

Expected environment-specific allow-list:

```text
local: http://localhost:5173
preview: https://pikkst.github.io/krunditark.ee
production: https://krunditark.ee
```

The Phase 4 map-tile proxy follows the same origin-control policy unless current MaRu/proxy architecture requires an explicitly documented exception.

## 13. Source/provider endpoint changes

Official endpoints can change.

When changing analytical endpoint/layer configuration:

- update `DATA_SOURCES.md`;
- update source definition/migration/config;
- update fixtures if schema changed;
- run contract tests;
- do not silently point a source ID to a semantically different dataset.

When changing map tile provider/upstream/layer mapping:

- verify current official provider documentation/terms;
- update ADR if changing the selected provider/renderer architecture;
- update `MAP_STACK_AND_BASEMAP.md`;
- update environment/deployment configuration;
- preserve attribution/data-age requirements;
- verify the fixed proxy/contact requirement;
- test Kaart/Ortofoto and degraded behavior in the target environment.

## 14. Gemini SDK/model changes

When changing SDK/model:

- verify current official Google AI documentation;
- update lockfile intentionally;
- keep SDK types inside the Gemini adapter;
- run structured-output and adversarial tests;
- confirm timeout/rate/error mapping;
- record selected model in deployment/release configuration;
- do not alter deterministic finding semantics merely because a different Gemini model is selected.

## 15. Secret incident procedure

If a secret is committed or exposed:

1. revoke/rotate it immediately;
2. replace in secret manager;
3. assess logs/use;
4. remove from current repository state/history as appropriate;
5. do not assume deleting the file alone makes the old secret safe;
6. document incident/remediation if production-relevant.
