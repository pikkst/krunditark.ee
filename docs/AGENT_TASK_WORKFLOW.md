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
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DEFINITION_OF_DONE.md`

Then read all task-specific documents referenced by the task.

Also inspect relevant ADRs under:

- `docs/adr/`

### Phase 4 tasks

For KT-038 through KT-048, read additionally **before coding**:

- `docs/PHASE_4_READINESS.md`
- `docs/PHASE_4_IMPLEMENTATION_GUIDE.md`
- `docs/AUTH_AND_ONBOARDING.md`
- `docs/API_SPECIFICATION.md`
- `docs/TESTING.md`
- ADR 0006
- ADR 0009

For KT-040, KT-041, KT-045 and KT-046, also read:

- `docs/MAP_STACK_AND_BASEMAP.md`
- ADR 0010

For KT-043, read the current OQ-005 / issue #51 scenario-support evidence before claiming any structure/scenario is fully supported.

The Phase 4 map renderer/basemap architecture is **not an open choice**: ADR 0010 selects Leaflet 1.9.x + Maa- ja Ruumiamet `Kaart`/`Ortofoto` through a Krunditark-owned fixed proxy. Issue #50 records the completed research decision.

Do not invent product, security, GIS, AI, authentication, pricing, localization, map-provider or data-source behavior that conflicts with the existing documentation.

If implementation and documentation disagree, preserve the intended architecture and update the documentation as part of the same task when appropriate.

3. VALIDATE THE TASK

Find the task in `TASKS.md`.

Before coding:

- confirm the task is not already completed;
- identify its dependencies;
- confirm required dependencies are satisfied;
- understand its acceptance criteria;
- read the task's **task-specific Definition of Done** in `docs/PHASE_4_IMPLEMENTATION_GUIDE.md` for KT-038…KT-048;
- identify affected frontend, backend, database, GIS, rules, auth, AI, localization, security and test areas;
- check whether an open question/issue is an explicit completion gate.

For Phase 4 specifically:

- KT-038 establishes the real-browser safety net before map/editor work becomes stable;
- KT-039 establishes anonymous owner/project state before owner-RLS proposal persistence;
- KT-040 follows ADR 0010 and must prove the Leaflet + owned MaRu tile-proxy implementation rather than reselecting a map provider;
- KT-043 fully-supported claims are blocked by OQ-005 / issue #51 until the scenario matrix is verified;
- KT-047 owns authoritative server/PostGIS canonicalization;
- KT-048 depends on KT-039 + KT-047 and must implement safe idempotent/transaction-safe version allocation; issue #53 tracks the remaining concrete persistence primitive decision.

Do not implement unrelated future tasks.

Keep the change focused on the selected task.

4. CREATE A NEW BRANCH

Create a new branch from the latest `main`.

Use a descriptive branch name such as:

feat/<task-id>-short-description
fix/<task-id>-short-description
chore/<task-id>-short-description

Example:

feat/KT-040-leaflet-map-shell

Never implement directly on `main`.

5. IMPLEMENT THE TASK

Implement the task completely according to:

- task acceptance criteria;
- the task-specific DoD in `docs/PHASE_4_IMPLEMENTATION_GUIDE.md` for Phase 4;
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
- User-facing canonical language is Estonian.
- ET/RU/EN localization architecture must be respected.
- Do not hard-code user-facing text where translation keys are required.
- Guest-first onboarding must remain possible where defined.
- Do not introduce a permanent-signup wall before meaningful proposal value.
- Do not introduce advertisements into trust-critical findings or Ehituspass.
- Do not make live official-source or Gemini requests from normal unit tests.

### Phase 4 implementation rules

- Public parcel search/free overview may be unauthenticated/bounded.
- Create/reuse Supabase anonymous Auth when stateful proposal/project ownership becomes necessary.
- Use the anonymous/permanent user's own owner-RLS path; never browser service-role/shared ownership.
- Selected parcel and canonical intent must survive route/locale transitions once project state exists.
- `Vali krunt kaardilt` must become a real map-resolution path.
- **Leaflet 1.9.x is the Phase 4 browser map renderer.** Do not switch to Google Maps or MapLibre without a superseding ADR.
- Phase 4 basemaps are Maa- ja Ruumiamet `Kaart` + `Ortofoto` through a Krunditark-owned fixed/allow-listed tile proxy.
- Production browser code must not call the MaRu tile origin directly.
- Do not use public OpenStreetMap demo tiles as the production provider merely because they work without credentials.
- Tile-proxy routing must be fixed/allow-listed; never implement arbitrary user-controlled URL proxying.
- Keep MaRu source/data-age attribution visible according to ADR 0010 / `MAP_STACK_AND_BASEMAP.md`.
- Map parcel resolution is triggered by explicit selection/click, not pointer movement.
- Browser proposal draft is mutable preview/input state and may use EPSG:4326 interchange.
- Leaflet/Geoman layer objects are UI implementation objects, not durable domain/project state.
- Canonical persisted proposal is server-validated EPSG:3301 state.
- Client area/perimeter are previews only; server/PostGIS values are authoritative.
- A persisted proposal used by terminal analysis is never silently mutated.
- A valid structure enum is not proof of verified product/legal support.
- Unsupported/custom `Muu` must not fall back to a supported legal/process profile.
- TanStack Query and Zod are optional under ADR 0009; runtime validation is mandatory, duplicate cache/validation layers are not.
- Proposal save/version allocation must be retry-safe and concurrency-safe; do not use naïve `SELECT max(version)+1` logic without an atomic mechanism.

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

For Phase 4 map/editor work, real-browser Playwright coverage is part of the active safety net, not something to postpone until final beta.

For map work specifically test applicable cases from `PHASE_4_IMPLEMENTATION_GUIDE.md`, including:

- Leaflet mount/unmount lifecycle;
- map container sizing;
- `Kaart` / `Ortofoto` switching;
- attribution;
- one deliberate map selection -> intended resolver request;
- pointer movement -> zero parcel-resolve requests;
- tile-provider degraded state;
- mobile/touch behavior;
- overlay/project state survival across map mode changes.

Tests must include negative and boundary cases where relevant.

Do not depend on live government APIs, live map providers or live Gemini in normal CI tests.

Use deterministic fixtures/fakes/interception.

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
- `npm run test:e2e` (or the documented Playwright command) once KT-038 exists;
- source adapter fixture tests.

Fix failures caused by this task.

Do not hide or suppress failing checks.

8. REVIEW YOUR OWN IMPLEMENTATION

Before committing, perform a full self-review of the diff.

Review specifically for:

CORRECTNESS

- Does the implementation actually satisfy every acceptance criterion?
- Does it satisfy every applicable task-specific DoD item?
- Are edge cases handled?
- Are failure states explicit?
- Are concurrency/idempotency concerns handled where relevant?
- Is an open-question completion gate still being respected?

SECURITY

- Any secret exposed?
- RLS bypass?
- Authorization based on client-controlled data?
- Browser service-role/shared identity?
- Missing input validation?
- SSRF risk?
- Arbitrary-URL tile/source proxy?
- XSS risk?
- Unsafe file handling?
- Excessive data exposure?
- Unbounded public request/provider response?

DATABASE

- Are migrations forward-only?
- Can they apply to a clean database?
- Are constraints, foreign keys and indexes correct?
- Is RLS enabled and tested?
- Are previously applied migrations left unchanged?
- Is proposal/history version lifecycle preserved?
- Is proposal save/version allocation atomic and retry-safe when implemented?

GIS

- Correct CRS?
- Correct PostGIS predicate?
- Boundary/touching cases?
- Correct metric calculations?
- Geometry validation?
- Spatial indexes?
- For proposals, are server area/perimeter authoritative rather than client values?
- Have Leaflet/browser coordinates been kept out of canonical EPSG:3301 domain state?

OFFICIAL DATA

- Is source provenance preserved?
- Are stale/unavailable/empty states distinguished?
- Is cached/versioned data handled according to `DATA_REFRESH_AND_CACHE.md`?
- Could a source failure accidentally become an “all clear”?
- For MaRu tiles, are terms/attribution/proxy constraints from ADR 0010 respected?

RULES

- Is legal logic deterministic?
- Is the rule versioned?
- Does it have an official source?
- Are effective dates handled?
- Is `unknown` returned outside supported scope?
- Has a candidate structure label been mistaken for verified legal support?

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
- Does route/locale navigation preserve active work?
- Is map selection explicit and safe under ambiguity?
- Does basemap failure preserve parcel/proposal state?

LOCALIZATION

- Are user-facing strings translated through the localization system?
- Are ET/RU/EN structures preserved?
- Are legal/technical terms translated consistently?
- Are domain IDs/codes still locale-independent?

PERFORMANCE

- Unnecessary API calls?
- Pointer-move map resolver storm?
- Unnecessary tile/map library eager-loading on landing?
- Unnecessary Gemini calls?
- Missing caching?
- Duplicate query/cache ownership?
- N+1 database queries?
- Large frontend bundle increase?
- Unbounded GIS/source query?

CODE QUALITY

- Duplicate logic?
- God components/services?
- Provider-specific types leaking into domain code?
- Leaflet/Geoman runtime objects leaking into durable application/domain state?
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
- `docs/PHASE_4_READINESS.md`
- `docs/PHASE_4_IMPLEMENTATION_GUIDE.md`
- `docs/MAP_STACK_AND_BASEMAP.md`
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
- `docs/ENVIRONMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/OPEN_QUESTIONS.md`
- relevant ADRs.

Do not update documentation merely to describe an implementation bug or temporary workaround.

Documentation must describe intended final behavior and must keep unresolved provider/legal decisions explicitly unresolved.

Only mark the task `[x]` in `TASKS.md` after all acceptance criteria and the full applicable Definition of Done/readiness requirements are verified.

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
- no forgotten TODOs required for the task;
- documentation matches implementation;
- open questions have not been silently “resolved” by code.

11. COMMIT THE CHANGE

Create a clear commit.

Prefer Conventional Commit style.

Example:

feat(KT-040): add Leaflet map shell

The commit should contain only the coherent task implementation.

12. PUSH THE BRANCH

Push the new branch to origin.

Do not force-push unless absolutely necessary.

13. CREATE A NEW PULL REQUEST

Create a new PR targeting `main`.

Use a clear title such as:

KT-040: Add Leaflet map shell

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

Anything intentionally outside this task, including unresolved provider/legal gates.

## Acceptance Criteria

Copy the task acceptance criteria as a checklist and mark only verified items complete.

## Definition of Done

For Phase 4, include the applicable task-specific DoD from `docs/PHASE_4_IMPLEMENTATION_GUIDE.md` and mark only verified items complete.

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
