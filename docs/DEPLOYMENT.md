# Deployment — Krunditark

## 1. Deployment stages

Krunditark intentionally separates frontend hosting from backend infrastructure.

### Current production target

- Repository: GitHub
- Static frontend: Cloudflare Pages
- Backend: Supabase Cloud
- Domain registration: Zone
- Primary production domain: `krunditark.ee`

### Preview target

- Repository: GitHub
- Static frontend: GitHub Pages (repository path)
- Backend: Supabase Cloud

## 2. GitHub Pages architecture

GitHub Pages hosts **static generated assets only**.

Therefore:

- build React/Vite to static assets;
- do not create server-only routes in the frontend project;
- all secure API behavior goes to Supabase Edge Functions;
- browser receives only publishable configuration;
- route handling must work without an origin application server.

GitHub supports custom domains for Pages, including apex domains, but the project does not need to attach `krunditark.ee` immediately during early development.

Official GitHub Pages custom-domain documentation:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages

## 3. Preview URL and Vite base path

During repository Pages preview the site is served under a repository path:

```text
https://pikkst.github.io/krunditark.ee/
```

The Vite build reads `VITE_BASE_PATH` to configure the asset base path. Default is `/`.

### Preview build

```text
VITE_BASE_PATH=/krunditark.ee/ npm run build
```

### Future production build (custom domain)

```text
VITE_BASE_PATH=/ npm run build
```

Do not hardcode production `krunditark.ee` paths into application source. The base path is deployment configuration only.

The custom domain `krunditark.ee` is reserved for production and is not attached to the preview deployment.

## 4. Routing

Production frontend is served from Cloudflare Pages with clean BrowserRouter paths. Deep links work on refresh because the SPA fallback rewrites unknown paths to `index.html`:

```text
/et/landing
/ru/landing
/en/landing
/et/projekt/:projectId
```

Static assets (JS, CSS, images) are served directly and are not rewritten.

For the preview stage on GitHub Pages, the repository-path base (`VITE_BASE_PATH=/krunditark.ee/`) is used with clean routes. GitHub Pages deep links may require the repository-path prefix.

Do not make route format part of core domain IDs/API.

## 5. GitHub Actions deployment pipeline

A dedicated workflow (`.github/workflows/deploy-pages.yml`) deploys the static build to GitHub Pages.

### Trigger

- Push to `main`
- Manual `workflow_dispatch`

### Steps

```text
push/PR to main
  -> npm ci
  -> format check
  -> lint
  -> typecheck
  -> unit tests
  -> production build with Pages base path
  -> upload Pages artifact
  -> deploy GitHub Pages
```

The workflow runs quality checks before deploying. A separate CI workflow (`ci.yml`) also runs on every PR and push to main.

Deployment must not bypass failing quality checks.

### GitHub Pages source

The repository must be configured to use **GitHub Actions** as the Pages source in the repository settings (`Settings -> Pages -> Build and deployment -> Source`).

## 6. Environment configuration

Frontend build receives only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_ENV
VITE_APP_ORIGIN
VITE_BASE_PATH
```

Names may be adjusted once implementation starts; keep `ENVIRONMENT.md` synchronized.

No secret value should begin with `VITE_`.

Supabase Edge Function secrets are managed through Supabase, not embedded in Pages build.

## 7. Supabase deployment

### Database

- all schema changes through committed migrations;
- test migrations against clean local database;
- apply through Supabase CLI/approved CI deployment process;
- never copy/paste untracked production-only SQL as the normal workflow.

### Edge Functions

- source code committed under `supabase/functions/`;
- deploy from version-controlled code;
- production secrets configured outside git;
- avoid using dashboard editor as source of truth.

### Storage

Buckets/policies should be created by migration/config where supported/documented, not remembered manual state.

## 8. Local development

Expected prerequisites:

- Node.js supported LTS/current project version;
- npm;
- Supabase CLI;
- Docker-compatible runtime for local Supabase/Edge Function development;
- Git.

Typical future workflow:

```text
npm ci
supabase start
npm run dev
```

Exact commands belong in README after scaffold exists.

## 9. Environment separation

Use distinct configuration for:

- local;
- preview/development;
- production.

Prefer separate Supabase projects for production and non-production once public testing begins.

Do not let preview builds write into production project data by default.

## 10. Domain strategy

Current registrar: **Zone**.

There are two separate concepts:

1. domain registration/registrar;
2. authoritative DNS/hosting/CDN.

Krunditark can keep the `.ee` domain registered at Zone while delegating authoritative nameservers to Cloudflare later.

Do not assume a registrar transfer is required.

As of this foundation review (2026-08-15), Cloudflare's public Registrar TLD policy list should be re-checked before attempting any `.ee` registrar transfer. The project plan therefore assumes **Zone can remain registrar**.

## 11. Cloudflare DNS migration plan

When product owner requests migration:

1. inventory all Zone DNS records;
2. export/back up records if possible;
3. create Cloudflare zone for `krunditark.ee`;
4. reproduce/verify A/AAAA/CNAME/MX/TXT and other required records;
5. identify current DNSSEC/DS state;
6. follow Cloudflare's current DNSSEC/nameserver migration guidance;
7. change nameservers at Zone to Cloudflare-assigned nameservers;
8. wait for zone Active;
9. validate website, auth redirects, email records and HTTPS;
10. enable/reconfigure DNSSEC after the migration according to current guidance.

Official Cloudflare full DNS setup guidance:

- https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/

Do not change nameservers until existing email/service DNS records are accounted for.

## 12. Cloudflare Pages migration option

If selected later:

```text
GitHub repo
   -> Cloudflare Pages build/deploy
   -> krunditark.ee
   -> browser
   -> Supabase backend
```

Benefits to evaluate at that time:

- custom-domain integration;
- response-header controls;
- SPA routing;
- CDN/edge performance;
- WAF/security features;
- preview deployments.

The move should not require backend/domain rewrite.

Add an ADR before replacing GitHub Pages production hosting.

## 13. Custom domain launch checklist

- [ ] production Supabase project/config ready;
- [ ] production auth redirect URLs include canonical domain;
- [ ] Edge Function CORS allow-list updated;
- [ ] `krunditark.ee` DNS correct;
- [ ] `www` policy decided (redirect or supported hostname);
- [ ] HTTPS valid;
- [ ] no mixed content;
- [ ] CSP/security headers configured where possible;
- [ ] sitemap and robots policy;
- [ ] privacy/terms pages live;
- [ ] source attribution visible;
- [ ] monitoring/source-health checks enabled;
- [ ] rollback instructions tested.

## 14. Rollback

Frontend deployments must be reversible to a known-good commit/build.

Database migrations are forward-only; rollback means a new corrective migration unless a migration is still exclusively local/unapplied.

For DNS migration:

- preserve previous records;
- avoid simultaneous registrar + DNS + hosting changes where unnecessary;
- verify email records before/after.

## 15. Production secrets

Potential server-only secrets:

- Supabase elevated/secret keys where required;
- AI provider keys;
- future external provider credentials;
- email/webhook signing secrets.

Rules:

- never git;
- never `VITE_*`;
- rotate after suspected disclosure;
- environment-specific;
- least privilege where provider supports it.
