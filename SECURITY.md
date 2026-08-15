# Security Policy — Krunditark

Krunditark processes user project data and produces regulation-adjacent property analysis. Security issues that could expose user data, secrets, administrative controls or analysis integrity are high priority.

## Sensitive areas

Especially sensitive components include:

- Supabase Auth/session handling;
- Row Level Security policies;
- Supabase secret/elevated credentials;
- Google Gemini API credentials;
- source-adapter credentials/configuration;
- admin role verification;
- analysis/rule integrity;
- uploaded project documents;
- SSRF-capable external fetch code;
- source-response validation;
- prompt-injection boundaries.

## Never publish secrets

Do not place real credentials in:

- commits;
- pull requests;
- issues;
- screenshots;
- CI logs;
- fixtures;
- frontend `VITE_*` variables.

This includes `GEMINI_API_KEY`, Supabase elevated keys, database passwords and provider credentials.

If a secret is exposed, rotate/revoke it immediately. Removing it from the latest commit does not make the previous value safe.

## Reporting

Until a dedicated security contact/process is configured, do not open a public issue containing exploit details or live credentials.

The project owner should configure a private security-reporting route before public production launch, preferably GitHub private vulnerability reporting if available for the repository.

## Security completion requirements

Implementation must follow:

- `docs/SECURITY_PRIVACY.md`;
- `AGENTS.md`;
- `docs/DEFINITION_OF_DONE.md`.

Security-related fixes must add regression tests when practical.

## Supported versions

The project is pre-MVP. Only the current `main` line is expected to receive security fixes until formal releases/version support are introduced.
