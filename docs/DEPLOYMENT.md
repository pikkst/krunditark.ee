# Deployment — Krunditark

## 1. Deployment stages

Krunditark intentionally separates frontend hosting from backend infrastructure.

### Current development/preview target

- Repository: GitHub
- Static frontend: GitHub Pages
- Backend: Supabase Cloud
- Domain registration: Zone
- Primary production domain reserved: `krunditark.ee`

### Later production edge target

Potential:

- Cloudflare authoritative DNS;
- Cloudflare CDN/WAF;
- Cloudflare Pages for frontend if chosen;
- Supabase remains backend unless a separate ADR changes it.

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

During repository Pages preview the site may be served under a repository path such as:

```text
https://pikkst.github.io/krunditark.ee/
```

The build must account for that base path.

Recommended implementation approach:

- make Vite base configurable per deployment environment;
- do not hardcode production `krunditark.ee` paths into source;
- test asset loading in Pages preview.

## 4. Routing on GitHub Pages

GitHub Pages does not provide an application server that rewrites arbitrary SPA paths to `index.html`.

For the preview stage, prefer **HashRouter** or another static-host-safe strategy rather than relying on an undocumented 404 rewrite hack for critical auth/project routes.

Example:

```text
/#/kaart
/#/projekt/<id>
/#/ehituspass/<id>
```

If production later moves to Cloudflare Pages with SPA routing support, an ADR may switch to clean BrowserRouter paths.

Do not make route format part of core domain IDs/API.

## 5. GitHub Actions deployment pipeline

Expected pipeline:

```text
push/PR
  -> npm ci
  -> format check
  -> lint
  -> typecheck
  -> unit tests
  -> production build

push main after green build
  -> upload Pages artifact
  -> deploy GitHub Pages
```

Deployment must not bypass failing quality checks.

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
