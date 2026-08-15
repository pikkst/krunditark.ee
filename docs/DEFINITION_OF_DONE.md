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
- [ ] Source sync/promotion endpoints cannot be called by ordinary users.

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
- [ ] source failure produces stale/`unknown`/partial semantics where appropriate;
- [ ] refresh policy and freshness thresholds are defined;
- [ ] replication/retention policy is defined;
- [ ] `DATA_SOURCES.md` updated.

## 7. Scheduled source synchronization

If replicated source data, synchronization, freshness or data releases change:

- [ ] behavior matches `docs/DATA_REFRESH_AND_VERSIONING.md`;
- [ ] normal user analysis does not bulk-refresh the source;
- [ ] scheduled/manual sync is server-side and privileged;
- [ ] duplicate invocation is idempotent;
- [ ] overlapping sync runs are prevented;
- [ ] ingestion writes to staging/candidate state before promotion;
- [ ] incomplete fetch cannot imply object deletion;
- [ ] schema/CRS/required-field sanity checks run before promotion;
- [ ] added/changed/removed change detection is tested;
- [ ] abnormal large diffs fail or quarantine safely;
- [ ] failed candidate leaves the previous verified source version active;
- [ ] source version promotion is atomic;
- [ ] composite data release references exact source dataset versions;
- [ ] carried-forward/stale source state is visible in release metadata;
- [ ] historical source versions referenced by analyses remain reproducible;
- [ ] monitoring records last success, run failure and freshness state;
- [ ] normal scheduled source synchronization uses zero Gemini tokens.

## 8. Rules

If a rule changes:

- [ ] stable rule code exists;
- [ ] new rule version created when semantics/legal basis changed;
- [ ] official source/section recorded;
- [ ] effective dates reviewed;
- [ ] draft/verified lifecycle respected;
- [ ] tests cover trigger/non-trigger/boundaries/missing facts;
- [ ] historical rule version remains available;
- [ ] no LLM output is used as rule authority.

If a legal-source sync detects changed official text:

- [ ] legal change candidate is recorded;
- [ ] affected rules are reviewed explicitly;
- [ ] no verified rule was silently overwritten;
- [ ] no rule was promoted solely from Gemini/AI output.

## 9. Analysis provenance

If a material finding is created:

- [ ] exact promoted `data_release_id` is traceable;
- [ ] exact source dataset version(s) are traceable;
- [ ] exact rule version is traceable;
- [ ] source evidence is traceable;
- [ ] parcel/proposal snapshot is traceable;
- [ ] measurements/geometry evidence are reproducible;
- [ ] engine/profile version stored;
- [ ] completed factual result does not depend on retaining AI prose.

## 10. AI

If AI behavior changes:

- [ ] deterministic analysis still works with AI disabled;
- [ ] API key is server-side;
- [ ] input contains only necessary approved evidence;
- [ ] output schema validated;
- [ ] model cannot modify finding state;
- [ ] prompt injection case tested;
- [ ] provider failure has deterministic fallback;
- [ ] provider/model metadata handling matches privacy policy;
- [ ] repeated page loads do not create unnecessary Gemini calls for the same immutable analysis unless explicitly required.

## 11. UI/UX

If user-facing behavior changes:

- [ ] Estonian copy is understandable;
- [ ] loading/empty/error/unknown states implemented;
- [ ] not-found is distinct from provider unavailable;
- [ ] status is not color-only;
- [ ] keyboard/mobile behavior reviewed;
- [ ] official source/data-release freshness visible for material findings;
- [ ] carried-forward/stale source state is not presented as freshly checked data;
- [ ] no wording implies official approval unless actually sourced.

## 12. Tests

- [ ] unit tests pass;
- [ ] relevant adapter fixture tests pass;
- [ ] relevant source-sync/versioning tests pass;
- [ ] relevant database/RLS tests pass;
- [ ] relevant GIS tests pass;
- [ ] Edge Function tests pass;
- [ ] E2E updated for critical user-flow changes where applicable;
- [ ] no normal unit test requires public internet;
- [ ] no normal test suite requires the live Gemini API.

## 13. CI/build

Required when scripts exist:

- [ ] `npm ci`
- [ ] format check
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] production build
- [ ] clean migration/RLS checks when Supabase is initialized

## 14. Documentation

- [ ] API spec updated for contract changes.
- [ ] database spec updated for material model changes.
- [ ] source registry updated for provider changes.
- [ ] data refresh/versioning spec updated for sync/freshness changes.
- [ ] ADR added/superseded for architectural decisions.
- [ ] environment/deployment docs updated for variables/workflow changes.
- [ ] `TASKS.md` status updated only after verification.

## 15. Observability

For server/provider features:

- [ ] typed error code exists;
- [ ] request/source timing can be observed;
- [ ] logs do not contain secrets;
- [ ] provider failures can be diagnosed without dumping sensitive raw data.

For scheduled source synchronization additionally:

- [ ] sync run status is observable;
- [ ] record counts/diff summary are observable;
- [ ] last successful sync is observable;
- [ ] stale critical source can trigger an admin-visible alert;
- [ ] release promotion/rejection is auditable.

## 16. Legal/trust check

For any regulatory user-facing output:

- [ ] current verified official source/rule basis was reviewed at implementation/review time;
- [ ] source/effective date is recorded;
- [ ] data release/freshness is recorded;
- [ ] uncertainty is preserved;
- [ ] result does not overstate legal certainty;
- [ ] applicable disclaimer/source link remains available.

## 17. Completion evidence

A coding agent/PR should summarize:

- what was implemented;
- tests/checks run;
- migrations added;
- source/data-release/rule versions affected;
- known limitations/unknowns;
- screenshots for meaningful UI changes when workflow supports them.

“Works on my machine” without these gates is not complete.
