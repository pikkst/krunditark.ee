# Definition of Done — Krunditark

A task is complete only when all applicable items below are satisfied.

## 1. Scope

- [ ] Implementation matches the task acceptance criteria.
- [ ] No unrelated refactor or feature expansion was added without documentation.
- [ ] Unsupported behavior remains explicit rather than silently guessed.

## 2. Code quality

- [ ] TypeScript strict checks pass.
- [ ] No unjustified `any`.
- [ ] Code comments are in English and explain non-obvious reasoning.
- [ ] External/provider types do not leak into core domain models.
- [ ] No duplicated legal/rule logic across UI and backend without a deliberate shared abstraction.

## 3. Security

- [ ] No secret/elevated key in frontend/source/logs/fixtures.
- [ ] Input validation exists at trust boundaries.
- [ ] Authorization is server-side for privileged behavior.
- [ ] RLS is added/updated and tested for new client-accessible tables.
- [ ] New external fetch behavior is SSRF-safe/allow-listed.
- [ ] Resource limits exist for expensive geometry/file/provider operations.

## 4. Database

If schema changes:

- [ ] ordered migration committed;
- [ ] clean database applies all migrations;
- [ ] prior production migrations were not edited;
- [ ] foreign keys/constraints added;
- [ ] indexes reviewed;
- [ ] RLS/grants reviewed;
- [ ] timestamps/SRID conventions followed.

## 5. GIS

If spatial behavior changes:

- [ ] authoritative calculation is server/PostGIS-side;
- [ ] CRS explicitly correct;
- [ ] geometry validity handled;
- [ ] spatial predicate semantics documented;
- [ ] GiST/index impact reviewed;
- [ ] boundary/touching/near-threshold tests added;
- [ ] browser evidence matches server result.

## 6. Official source adapter

If a source integration changes:

- [ ] official source documented;
- [ ] endpoint/layer verified;
- [ ] terms/attribution considered;
- [ ] timeout/retry/size controls exist;
- [ ] response schema validated;
- [ ] fixture tests added;
- [ ] source retrieval timestamp/provenance persisted;
- [ ] zero results differ from source failure;
- [ ] source failure produces `unknown`/partial where appropriate;
- [ ] `DATA_SOURCES.md` updated.

## 7. Rules

If a rule changes:

- [ ] stable rule code exists;
- [ ] new rule version created when semantics/legal basis changed;
- [ ] official source/section recorded;
- [ ] effective dates reviewed;
- [ ] draft/verified lifecycle respected;
- [ ] tests cover trigger/non-trigger/boundaries/missing facts;
- [ ] historical rule version remains available;
- [ ] no LLM output is used as rule authority.

## 8. Analysis provenance

If a material finding is created:

- [ ] exact rule version is traceable;
- [ ] source evidence is traceable;
- [ ] parcel/proposal snapshot is traceable;
- [ ] measurements/geometry evidence are reproducible;
- [ ] engine/profile version stored;
- [ ] completed factual result does not depend on retaining AI prose.

## 9. AI

If AI behavior changes:

- [ ] deterministic analysis still works with AI disabled;
- [ ] API key is server-side;
- [ ] input contains only necessary approved evidence;
- [ ] output schema validated;
- [ ] model cannot modify finding state;
- [ ] prompt injection case tested;
- [ ] provider failure has deterministic fallback;
- [ ] provider/model metadata handling matches privacy policy.

## 10. UI/UX

If user-facing behavior changes:

- [ ] Estonian copy is understandable;
- [ ] loading/empty/error/unknown states implemented;
- [ ] not-found is distinct from provider unavailable;
- [ ] status is not color-only;
- [ ] keyboard/mobile behavior reviewed;
- [ ] official source/freshness visible for material findings;
- [ ] no wording implies official approval unless actually sourced.

## 11. Tests

- [ ] unit tests pass;
- [ ] relevant adapter fixture tests pass;
- [ ] relevant database/RLS tests pass;
- [ ] relevant GIS tests pass;
- [ ] Edge Function tests pass;
- [ ] E2E updated for critical user-flow changes where applicable;
- [ ] no normal unit test requires public internet.

## 12. CI/build

Required when scripts exist:

- [ ] `npm ci`
- [ ] format check
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] production build
- [ ] clean migration/RLS checks when Supabase is initialized

## 13. Documentation

- [ ] API spec updated for contract changes.
- [ ] database spec updated for material model changes.
- [ ] source registry updated for provider changes.
- [ ] ADR added/superseded for architectural decisions.
- [ ] environment/deployment docs updated for variables/workflow changes.
- [ ] `TASKS.md` status updated only after verification.

## 14. Observability

For server/provider features:

- [ ] typed error code exists;
- [ ] request/source timing can be observed;
- [ ] logs do not contain secrets;
- [ ] provider failures can be diagnosed without dumping sensitive raw data.

## 15. Legal/trust check

For any regulatory user-facing output:

- [ ] current official source was verified at implementation/review time;
- [ ] source/effective date is recorded;
- [ ] uncertainty is preserved;
- [ ] result does not overstate legal certainty;
- [ ] applicable disclaimer/source link remains available.

## 16. Completion evidence

A coding agent/PR should summarize:

- what was implemented;
- tests/checks run;
- migrations added;
- source/rule versions affected;
- known limitations/unknowns;
- screenshots for meaningful UI changes when workflow supports them.

“Works on my machine” without these gates is not complete.
