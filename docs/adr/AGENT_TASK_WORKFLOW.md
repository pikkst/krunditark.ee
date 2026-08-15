Work on the Krunditark repository:

https://github.com/pikkst/krunditark.ee

Task to implement:
<TASK_ID_AND_TITLE>

Follow this workflow exactly.

1. UPDATE LOCAL REPOSITORY

- Inspect the current git status first.
- Do not discard or overwrite unrelated local changes.
- Switch to the default branch (`main`).
- Fetch the latest remote state.
- Update local `main` using a safe fast-forward-only pull.
- Confirm that the working tree is clean before starting new work.
- If unrelated local changes exist, stop modifying them and preserve them.

2. READ PROJECT INSTRUCTIONS BEFORE CODING

Before implementing anything, read at minimum:

- `AGENTS.md`
- `TASKS.md`
- `docs/INDEX.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/USER_JOURNEYS_AND_PERSONAS.md`
- `docs/UX_UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEFINITION_OF_DONE.md`

Then read all task-specific documents referenced by the task.

Also inspect relevant ADRs under:

- `docs/adr/`

Do not invent product, security, GIS, AI, authentication, pricing, localization, or data-source behavior that conflicts with the existing documentation.

If implementation and documentation disagree, preserve the intended architecture and update the documentation as part of the same task when appropriate.

3. VALIDATE THE TASK

Find the task in `TASKS.md`.

Before coding:

- confirm the task is not already completed;
- identify its dependencies;
- confirm required dependencies are satisfied;
- understand its acceptance criteria;
- identify affected frontend, backend, database, GIS, rules, auth, AI, localization, security, and test areas.

Do not implement unrelated future tasks.

Keep the change focused on the selected task.

4. CREATE A NEW BRANCH

Create a new branch from the latest `main`.

Use a descriptive branch name such as:

feat/<task-id>-short-description
fix/<task-id>-short-description
chore/<task-id>-short-description

Example:

feat/KT-031-maru-cadastral-adapter

Never implement directly on `main`.

5. IMPLEMENT THE TASK

Implement the task completely according to:

- task acceptance criteria;
- `AGENTS.md`;
- relevant architecture documents;
- security requirements;
- existing code conventions.

Important Krunditark rules:

- AI must never replace deterministic GIS/rules decisions.
- Google Gemini is explanation-only unless documentation explicitly says otherwise.
- Never expose Gemini API keys or elevated Supabase credentials in frontend code.
- Supabase RLS must remain enabled and least-privilege.
- Authoritative spatial calculations belong in PostGIS/server-side logic.
- Public-source absence must never silently become “no restriction”.
- `unknown` is a valid result.
- Every material finding must preserve provenance.
- Historical analyses and rule/data versions must remain reproducible.
- User-facing primary language is Estonian.
- ET/RU/EN localization architecture must be respected.
- Do not hard-code user-facing text where translation keys are required.
- Guest-first onboarding must remain possible where defined.
- Do not introduce a signup wall unless the task explicitly requires one.
- Do not introduce advertisements into trust-critical findings or Ehituspass.
- Do not make live official-source or Gemini requests from normal unit tests.

Write clean, production-quality code.

Use TypeScript strict mode.

Avoid `any` unless there is a justified boundary reason.

Code comments must be in English and explain non-obvious reasoning.

6. ADD OR UPDATE TESTS

Add all tests required by the task.

Depending on the implementation, consider:

- unit tests;
- component tests;
- API/Edge Function tests;
- Supabase migration tests;
- RLS tests;
- PostGIS/GIS tests;
- source-adapter fixture tests;
- rules-engine boundary tests;
- localization tests;
- Playwright E2E tests.

Tests must include negative and boundary cases where relevant.

Do not depend on live government APIs or live Gemini in normal CI tests.

Use deterministic fixtures/fakes.

7. RUN THE REQUIRED CHECKS

Run all applicable checks before considering the task complete.

At minimum, when available:

npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build

Also run, when relevant:

- clean Supabase migration tests;
- RLS tests;
- Edge Function tests;
- PostGIS/GIS tests;
- Playwright tests;
- source adapter fixture tests.

Fix failures caused by this task.

Do not hide or suppress failing checks.

8. REVIEW YOUR OWN IMPLEMENTATION

Before committing, perform a full self-review of the diff.

Review specifically for:

CORRECTNESS

- Does the implementation actually satisfy every acceptance criterion?
- Are edge cases handled?
- Are failure states explicit?
- Are concurrency/idempotency concerns handled where relevant?

SECURITY

- Any secret exposed?
- RLS bypass?
- Authorization based on client-controlled data?
- Missing input validation?
- SSRF risk?
- XSS risk?
- Unsafe file handling?
- Excessive data exposure?

DATABASE

- Are migrations forward-only?
- Can they apply to a clean database?
- Are constraints, foreign keys and indexes correct?
- Is RLS enabled and tested?
- Are previously applied migrations left unchanged?

GIS

- Correct CRS?
- Correct PostGIS predicate?
- Boundary/touching cases?
- Correct metric calculations?
- Geometry validation?
- Spatial indexes?

OFFICIAL DATA

- Is source provenance preserved?
- Are stale/unavailable/empty states distinguished?
- Is cached/versioned data handled according to the documented refresh policy?
- Could a source failure accidentally become an “all clear”?

RULES

- Is legal logic deterministic?
- Is the rule versioned?
- Does it have an official source?
- Are effective dates handled?
- Is `unknown` returned outside supported scope?

AI

- Can Gemini alter a deterministic finding?
- Is Gemini optional?
- Is output validated?
- Is explanation cached/reused where required?
- Are secrets server-side only?

UX

- Is the flow understandable to a normal Estonian user?
- Are loading, empty, error and unknown states implemented?
- Is important information hidden behind the map only?
- Is mobile usage reasonable?
- Is accessibility preserved?

LOCALIZATION

- Are user-facing strings translated through the localization system?
- Are ET/RU/EN structures preserved?
- Are legal/technical terms translated consistently?

PERFORMANCE

- Unnecessary API calls?
- Unnecessary Gemini calls?
- Missing caching?
- N+1 database queries?
- Large frontend bundle increase?
- Unbounded GIS/source query?

CODE QUALITY

- Duplicate logic?
- God components/services?
- Provider-specific types leaking into domain code?
- Dead code?
- Unnecessary abstractions?
- Missing error typing?

Fix every issue you find before continuing.

9. UPDATE DOCUMENTATION

Update documentation affected by the implementation.

This may include:

- `TASKS.md`
- `README.md`
- `AGENTS.md`
- `docs/API_SPECIFICATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATA_SOURCES.md`
- `docs/DATA_REFRESH_AND_CACHE.md`
- `docs/UX_UI_SPEC.md`
- `docs/AUTH_AND_ONBOARDING.md`
- `docs/LOCALIZATION_AND_LANGUAGE.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/TESTING.md`
- relevant ADRs

Do not update documentation merely to describe an implementation bug or temporary workaround.

Documentation must describe the intended final behavior.

Only mark the task `[x]` in `TASKS.md` after all acceptance criteria and applicable Definition of Done requirements are verified.

10. REVIEW FINAL DIFF AGAIN

Run:

git status
git diff --check
git diff main...HEAD

Review all changed files one final time.

Ensure:

- no secrets;
- no debug code;
- no temporary files;
- no unrelated changes;
- no accidental generated files;
- no commented-out dead code;
- no forgotten TODOs that are required for the task;
- documentation matches implementation.

11. COMMIT THE CHANGE

Create a clear commit.

Prefer Conventional Commit style.

Example:

feat(KT-031): add MaRu cadastral parcel adapter

The commit should contain only the coherent task implementation.

12. PUSH THE BRANCH

Push the new branch to origin.

Do not force-push unless absolutely necessary.

13. CREATE A NEW PULL REQUEST

Create a new PR targeting `main`.

Use a clear title such as:

KT-031: Implement MaRu cadastral parcel adapter

PR description must include:

## Summary

What was implemented.

## Task

Reference the exact task ID and title.

## Implementation

Important technical decisions and affected components.

## Security

Any auth/RLS/secrets/security implications.

## Database / Migrations

List migrations or state “None”.

## Data Sources / Rules

List affected official sources, rules, rule versions, or state “None”.

## Tests

List the exact checks/tests that were run and their result.

## Documentation

List documentation files updated.

## Known Limitations

Anything intentionally outside this task.

## Acceptance Criteria

Copy the task acceptance criteria as a checklist and mark only verified items complete.

14. FINAL RESPONSE

After creating the PR, report:

- branch name;
- commit SHA;
- PR number and URL;
- short implementation summary;
- tests/checks run;
- documentation updated;
- migrations added;
- any remaining limitations or follow-up work.

Do not start another task.

Do not merge the PR.

Do not push directly to `main`.
