# Contributing to Krunditark

Krunditark is currently an agent-assisted, specification-first project.

## Before making changes

Read in this order:

1. `AGENTS.md`
2. `TASKS.md`
3. relevant files under `docs/`
4. relevant ADRs under `docs/adr/`
5. `docs/DEFINITION_OF_DONE.md`

Do not implement a later task by bypassing an incomplete security/data foundation.

## Branch and change scope

Recommended branch format:

```text
feat/KT-031-maru-cadastre-adapter
fix/KT-061-intersection-boundary
chore/KT-003-ci
```

A change set should normally cover one task or a small group of tightly coupled tasks.

Avoid unrelated formatting/refactors in feature changes.

## Implementation sequence

For each task:

1. confirm prerequisites in `TASKS.md`;
2. read the linked specification;
3. inspect existing code and migrations;
4. implement the smallest complete vertical slice;
5. add tests before calling the task complete;
6. run local quality gates;
7. update documentation/contracts when behavior changes;
8. summarize limitations and unknowns.

## Required checks

Once the frontend is initialized, the baseline is expected to become:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Once Supabase is initialized, also run the documented clean migration/RLS/PostGIS checks.

Do not invent commands that do not exist yet; update this document when real scripts are established.

## Database changes

- all production schema changes use `supabase/migrations/`;
- migrations apply successfully from a clean database;
- never edit an already-applied production migration to fix it;
- fixes use forward migrations;
- RLS and indexes are reviewed with every relevant schema change.

## Regulatory/rule changes

A rule change is not ordinary copy editing.

Before marking a rule version verified:

- verify the current official source;
- capture exact legal/source reference;
- record effective dates;
- add boundary tests;
- preserve historical versions.

Never source production legal rules from AI/model memory.

## External-source changes

When adding/changing an adapter:

- use the responsible authority's official machine-readable source where possible;
- add the source to `docs/DATA_SOURCES.md`;
- validate payloads;
- keep deterministic fixtures;
- distinguish empty results from source errors;
- persist provenance/freshness;
- respect attribution/terms.

## Gemini changes

Google Gemini is the selected production AI provider.

- Gemini calls are server-side only;
- use `GEMINI_API_KEY` as a Supabase/server secret;
- never add a `VITE_GEMINI_*` secret;
- keep Google SDK types inside the Gemini adapter;
- use fake providers in normal CI;
- a Gemini/model/SDK change must not change deterministic finding semantics.

## Pull request expectations

A useful PR description includes:

- task ID(s);
- what changed;
- acceptance criteria addressed;
- migrations added;
- source/rule versions affected;
- tests run;
- screenshots for meaningful UI changes;
- known limitations/unknowns;
- any required manual deployment/configuration steps.

## Documentation

Documentation is executable project intent. Update it in the same change when modifying:

- API contracts;
- database schema;
- rule semantics;
- source adapters;
- environment variables;
- architecture;
- deployment behavior;
- user-facing terminology.

## Security

Report/handle security-sensitive changes according to `SECURITY.md` and `docs/SECURITY_PRIVACY.md`.

Never place real secrets in issues, PR descriptions, screenshots or test fixtures.
