# ADR 0003 — Frontend Hosting / Supabase Server Boundary

- Status: Accepted
- Date: 2026-08-15

## Context

The project owner wants development/preview delivery through GitHub Pages while using Supabase Cloud as backend. Production hosting has moved to Cloudflare Pages.

GitHub Pages serves static files and cannot safely hold server secrets. Cloudflare Pages supports SPA history routing with a fallback rewrite.

## Decision

Treat the deployed frontend as an untrusted static client.

### Browser may use

- public application config;
- Supabase URL;
- Supabase publishable key;
- authenticated user session through official Supabase browser SDK;
- RLS-protected Data API where intentionally exposed;
- Krunditark Edge Function APIs.

### Browser may not use

- secret/service-role Supabase key;
- AI/provider private API key;
- privileged government-source credentials;
- admin bypass credentials.

### Server-side location

Supabase Edge Functions own:

- external official-source adapters;
- privileged operations;
- AI calls;
- secret-bearing integrations;
- analysis orchestration that should not be client-controlled.

PostgreSQL/PostGIS owns authoritative spatial calculations and persisted rule/evidence state.

## Routing decision

Production uses BrowserRouter with clean paths, served from Cloudflare Pages with SPA fallback routing. GitHub Pages preview uses repository-path base with clean routes.

Route format is not part of core domain IDs/API and may change with hosting environment.

## Consequences

- Frontend can be moved later to Cloudflare Pages without rewriting backend/domain logic.
- Public provider CORS behavior does not control critical analysis reliability.
- RLS remains mandatory even though Edge Functions exist.
- CORS/auth redirect configuration must include preview and production origins separately.

## Domain consequence

The domain can remain registered at Zone while DNS/hosting later moves through Cloudflare. Registrar and authoritative DNS are separate concerns.

## Change policy

Any move of privileged logic into browser code violates this ADR and requires redesign, not an exception.
