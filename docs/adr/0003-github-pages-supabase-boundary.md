# ADR 0003 — GitHub Pages Frontend / Supabase Server Boundary

- Status: Accepted
- Date: 2026-08-15

## Context

The project owner wants current development/preview delivery through GitHub Pages while using Supabase Cloud as backend.

GitHub Pages serves static files and cannot safely hold server secrets.

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

Use a GitHub-Pages-safe SPA route strategy during preview, with HashRouter preferred unless implementation demonstrates an equally robust static-host solution.

Clean browser routes may be adopted when hosting changes, without changing domain/API IDs.

## Consequences

- Frontend can be moved later to Cloudflare Pages without rewriting backend/domain logic.
- Public provider CORS behavior does not control critical analysis reliability.
- RLS remains mandatory even though Edge Functions exist.
- CORS/auth redirect configuration must include preview and production origins separately.

## Domain consequence

The domain can remain registered at Zone while DNS/hosting later moves through Cloudflare. Registrar and authoritative DNS are separate concerns.

## Change policy

Any move of privileged logic into browser code violates this ADR and requires redesign, not an exception.
