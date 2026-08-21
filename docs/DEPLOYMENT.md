# Deployment — Krunditark

Last reviewed: **2026-08-21**

## 1. Deployment stages

Krunditark intentionally separates frontend hosting from backend infrastructure.

### Current preview/development target

- Repository: GitHub
- Static frontend preview: GitHub Pages (repository path)
- Backend: Supabase Cloud / local Supabase as appropriate
- Domain registration: Zone

### Public production direction

- Primary domain: `krunditark.ee`
- Backend: Supabase Cloud unless an ADR changes it
- Static frontend/edge hosting: **not finally selected**; OQ-013 remains open between justified static/edge options, with Cloudflare as a strong direction rather than an already-final contract
- Domain can remain registered at Zone while DNS/hosting changes independently

Do not let documentation for a future Cloudflare deployment imply that the production-hosting open question is already resolved.

## 2. GitHub Pages architecture

GitHub Pages hosts **static generated assets only**.

Therefore:

- build React/Vite to static assets;
- do not create server-only routes in the frontend project;
- all secure API behavior goes to Supabase Edge Functions or another explicitly accepted server/edge boundary;
- browser receives only publishable configuration;
- route handling must work without an origin application server.

GitHub Pages preview does not host the map tile proxy. The Phase 4 browser calls a separately deployed Krunditark-owned proxy URL as defined in ADR 0010 / `MAP_STACK_AND_BASEMAP.md`.

## 3. Preview URL and Vite base path

During repository Pages preview the site is served under:

```text
https://pikkst.github.io/krunditark.ee/
```

The Vite build reads `VITE_BASE_PATH` to configure the asset base path. Default is `/`.

### Preview build

```text
VITE_BASE_PATH=/krunditark.ee/ npm run build
```

### Future custom-domain production build

```text
VITE_BASE_PATH=/ npm run build
```

Do not hardcode production domain paths into application source.

## 4. Routing

Production target uses clean BrowserRouter paths. The chosen static host must provide an SPA fallback equivalent to serving `index.html` for application routes while serving assets directly.

Examples:

```text
/et/landing
/ru/landing
/en/landing
/et/kaart
/et/projekt/:projectId
```

For GitHub Pages preview, React Router uses a basename derived from `VITE_BASE_PATH`.

### GitHub Pages deep-link strategy

The build output includes a `404.html` copy/fallback so locale-prefixed deep links can mount the SPA at the requested URL under the repository base path.

Locale switching must preserve the deployment base path and active project/application route.

## 5. GitHub Actions preview deployment

A dedicated workflow deploys the static build to GitHub Pages.

Expected quality sequence:

```text
npm ci
 -> format check
 -> lint
 -> typecheck
 -> unit/integration tests
 -> critical Playwright gate once KT-038 lands
 -> production-like static build
 -> Pages artifact/deploy
```

Deployment must not bypass failing quality checks.

Repository-level branch protection remains tracked separately by issue #32.

## 6. Frontend environment configuration

Baseline publishable variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_ENV
VITE_APP_ORIGIN
VITE_BASE_PATH
```

Phase 4 may add:

```text
VITE_MAP_TILE_PROXY_URL
```

This URL points to the **Krunditark-owned fixed tile proxy**, not directly to an arbitrary MaRu tile source. It is public configuration, not a secret.

No secret value should use `VITE_`.

Keep `ENVIRONMENT.md` synchronized with the actual KT-040 implementation.

## 7. Phase 4 map tile proxy deployment

ADR 0010 selects Maa- ja Ruumiamet `Kaart` + optional `Ortofoto` through a fixed Krunditark-owned proxy.

### Initial Phase 4 implementation

A narrowly scoped Supabase Edge Function is an acceptable initial proxy because Supabase is already the backend boundary.

The deployed proxy must:

- expose only approved `kaart`/`ortofoto` modes;
- map those modes to fixed verified upstream configuration;
- validate tile/zoom coordinates;
- never accept an arbitrary upstream URL;
- enforce bounded upstream timeout/response size/content type;
- preserve safe cache semantics compatible with MaRu terms;
- avoid project/address/proposal information in tile URLs/logs;
- expose appropriate CORS only to intended environments;
- return provider failure independently from parcel-resolution semantics.

### Public production operational gate

Before sending public production traffic, follow current MaRu tiled-service guidance:

- use the agreed/fixed Krunditark proxy address;
- preserve source and data-age attribution;
- avoid mass/offline tile prefetch;
- complete the documented service-contact step (`kaardirakendus@maaruum.ee`) and record only the operational conclusion needed for deployment.

Do not commit private correspondence, credentials or internal provider data.

### Future Cloudflare option

A future Cloudflare Worker/edge proxy may improve tile latency/caching, but it is **not required to begin Phase 4**. Moving the proxy requires:

- OQ-013/Cloudflare hosting decision as relevant;
- current MaRu terms/proxy/cache re-verification;
- same allow-list/security semantics;
- documented environment migration.

## 8. Supabase deployment

### Database

- all schema changes through committed migrations;
- test migrations against a clean database;
- apply through Supabase CLI/approved CI deployment process;
- never use untracked dashboard-only production SQL as the normal workflow;
- CI/local target PostgreSQL 17 to match `supabase/config.toml`.

### Edge Functions

- source code committed under `supabase/functions/`;
- deploy from version-controlled code;
- production secrets/config outside git;
- avoid dashboard editor as source of truth;
- Phase 4 map-tile proxy follows the narrow provider contract above.

### Storage

Buckets/policies should be represented through migration/config where supported rather than remembered manual state.

## 9. Local development

Expected prerequisites:

- Node.js supported project version;
- npm;
- Supabase CLI;
- Docker-compatible runtime for local Supabase/Edge Function development;
- Git;
- Playwright browsers after KT-038.

Typical workflow:

```text
npm ci
supabase start
npm run dev
```

Normal automated tests should mock/fixture map tiles and official provider calls. Controlled manual integration can point the frontend to a local/non-production map-tile proxy.

## 10. Environment separation

Use distinct configuration for:

- local;
- preview/development;
- production.

Prefer separate Supabase projects for production and non-production once real user testing begins.

Do not let preview builds write into production project data by default.

Do not let preview map configuration accidentally bypass the fixed-proxy architecture and become an undocumented production dependency.

## 11. Domain/DNS strategy

Current registrar: **Zone**.

Domain registration, authoritative DNS and frontend hosting are separate decisions.

Krunditark can keep the `.ee` domain at Zone while delegating DNS/hosting elsewhere later. Do not assume registrar transfer is required.

Cloudflare registrar/DNS details remain a later operational decision (OQ-014 / KT-286).

## 12. Cloudflare direction — not yet final production host contract

If Cloudflare is selected later, it may provide:

- static assets/SPA hosting;
- CDN;
- DNS;
- WAF;
- Turnstile;
- redirects/security headers;
- potentially the map tile proxy after terms review.

Any `wrangler.jsonc` or Cloudflare configuration currently in the repository is implementation groundwork/direction and must not override OQ-013 by documentation implication.

Before finalizing Cloudflare production deployment:

- verify the current product/API (Pages vs Workers/static assets) being used;
- verify build/deploy commands against current Cloudflare documentation;
- verify SPA fallback/deep links;
- verify preview environments;
- verify Supabase Auth callback/CORS behavior;
- verify map proxy location/provider conditions.

## 13. Public custom-domain launch checklist

- [ ] OQ-013 production frontend hosting decision resolved.
- [ ] production Supabase project/config ready.
- [ ] production Auth redirect URLs include canonical domain.
- [ ] Edge Function CORS allow-list updated.
- [ ] map tile proxy public endpoint deployed and tested.
- [ ] MaRu provider-contact/fixed-proxy operational requirement completed.
- [ ] `Kaart` + `Ortofoto` attribution/data age visible.
- [ ] `krunditark.ee` DNS correct.
- [ ] `www` policy decided.
- [ ] HTTPS valid; no mixed content.
- [ ] CSP/security headers configured.
- [ ] sitemap/robots/privacy/terms ready.
- [ ] source attribution visible.
- [ ] monitoring/source/map-proxy health enabled.
- [ ] rollback instructions tested.

## 14. Rollback

Frontend deployments must be reversible to a known-good commit/build.

Database migrations are forward-only; corrective rollback is a new migration once a migration has been applied outside disposable development.

Map proxy/provider rollback must preserve the allow-list and attribution policy. Do not fall back automatically to a random public tile endpoint.

For DNS migration, preserve prior records and avoid changing registrar + DNS + hosting simultaneously unless necessary.

## 15. Production secrets

Potential server-only secrets:

- Supabase elevated/secret keys where required;
- Gemini API key;
- future external provider credentials;
- email/webhook/payment secrets.

Rules:

- never git;
- never `VITE_*`;
- environment-specific;
- least privilege;
- rotate after suspected disclosure.

The current MaRu basemap design is based on a fixed proxy/terms contract rather than a browser secret/API key.
