# TASKS.md — Krunditark implementation backlog

This is the ordered source of truth for implementation work.

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed and acceptance criteria verified
- `[!]` blocked; add the blocker below the task

Do not skip phases merely because a later task looks easier. A task may be implemented earlier only when its dependencies are already satisfied and doing so does not create temporary insecure architecture.

---

# Phase 0 — Repository and engineering foundation

## KT-001 — Initialize frontend application

- [ ] Create React + TypeScript + Vite application at repository root.
- [ ] Enable TypeScript strict mode.
- [ ] Configure path aliases only if they materially improve structure.
- [ ] Add base directories: `src/app`, `src/components`, `src/features`, `src/lib`, `src/domain`, `src/types`, `src/styles`.
- [ ] Add a minimal Estonian landing/application shell.
- [ ] No backend secrets or placeholder secret values in source.

Acceptance:

- `npm ci`, typecheck and production build succeed.
- App renders locally.
- No `any`-heavy scaffold.

## KT-002 — Add formatting, linting and test foundation

- [ ] Add ESLint.
- [ ] Add Prettier.
- [ ] Add Vitest.
- [ ] Add Testing Library if component testing is used.
- [ ] Add scripts: `format:check`, `lint`, `typecheck`, `test`, `build`.

Acceptance:

- All scripts run non-interactively.
- A minimal test proves CI test execution works.

## KT-003 — Configure GitHub Actions CI

- [ ] Run `npm ci` using committed lockfile.
- [ ] Run format check.
- [ ] Run lint.
- [ ] Run TypeScript checks.
- [ ] Run unit tests.
- [ ] Run production build.
- [ ] Cache dependencies safely.

Acceptance:

- CI runs for pull requests and pushes to `main`.
- Failed checks make the workflow fail.

## KT-004 — Configure GitHub Pages preview deployment

- [ ] Add Pages deployment workflow after successful build.
- [ ] Support repository-path hosting during the preview phase.
- [ ] Use a routing strategy that works on GitHub Pages without a private server runtime.
- [ ] Document custom-domain transition separately from preview routing.

Acceptance:

- `main` can deploy a production build to GitHub Pages.
- Refresh/navigation behavior is covered by an E2E/smoke test or documented deployment test.

## KT-005 — Add project environment contract

- [ ] Add `.env.example` using non-secret placeholder values.
- [ ] Ensure `.env`, `.env.local`, Supabase secret files and local credentials are ignored.
- [ ] Frontend variables use only publishable configuration.
- [ ] Document local/dev/production origin values.

Acceptance:

- `docs/ENVIRONMENT.md` matches actual variables.
- No elevated secret can be required by frontend build.

---

# Phase 1 — Supabase and database foundation

## KT-010 — Initialize Supabase project structure

- [ ] Add `supabase/config.toml` through the Supabase CLI initialization flow.
- [ ] Add `supabase/migrations/`.
- [ ] Add `supabase/functions/`.
- [ ] Keep generated/local state out of git where appropriate.

Acceptance:

- Local Supabase can start with documented prerequisites.
- Repository contains no cloud credentials.

## KT-011 — Enable PostGIS by migration

- [ ] Enable PostGIS in a documented schema.
- [ ] Verify `ST_Transform`, `ST_Intersects`, `ST_DWithin`, `ST_Distance` and GiST indexes are available.
- [ ] Add a migration-level smoke test.

Acceptance:

- Fresh database setup enables required spatial functionality automatically.

## KT-012 — Create core identity/profile tables

- [ ] Create `profiles` keyed to Supabase Auth user ID.
- [ ] Add timestamps.
- [ ] Add minimal role model; no client-controlled admin elevation.
- [ ] Add RLS.

Acceptance:

- Users can read/update only allowed own profile fields.
- Anonymous access is denied unless explicitly documented.

## KT-013 — Create project and proposal tables

- [ ] Create `projects`.
- [ ] Create `project_proposals` for planned buildings/structures.
- [ ] Store cadastral identifier as a project reference, not proof of ownership.
- [ ] Store footprint geometry and design parameters.
- [ ] Add RLS and spatial indexes.

Acceptance:

- User A cannot access User B project data.
- Geometry SRID is constrained and documented.

## KT-014 — Create source/provenance schemas

- [ ] Create internal tables for source definitions.
- [ ] Create source fetch/run records.
- [ ] Create source object snapshots/normalized object references.
- [ ] Store raw payload hash rather than relying only on mutable remote state.
- [ ] Keep internal tables out of public client access.

Acceptance:

- A normalized fact can be traced to one or more source retrieval records.

## KT-015 — Create rules-engine schema

- [ ] Create rule definitions.
- [ ] Create immutable/versioned rule versions.
- [ ] Add effective dates and verification status.
- [ ] Link rule versions to official source references.

Acceptance:

- Updating a rule does not erase the version used by an earlier analysis.

## KT-016 — Create analysis snapshot schema

- [ ] Create `analyses`.
- [ ] Create `analysis_findings`.
- [ ] Create evidence relationships.
- [ ] Store engine version and input snapshot.
- [ ] Make completed analyses reproducible/immutable through application rules and permissions.

Acceptance:

- A completed finding can identify exact rule version and evidence/source records.

## KT-017 — Add audit logging model

- [ ] Create internal audit log for security/administrative changes.
- [ ] Do not record secrets/tokens.
- [ ] Capture actor, action, target, timestamp and structured safe metadata.

Acceptance:

- Administrative rule/source changes can be audited.

## KT-018 — Add database and RLS test suite

- [ ] Test anonymous access.
- [ ] Test authenticated ownership isolation.
- [ ] Test internal schemas are unavailable to ordinary clients.
- [ ] Test admin/service operations only through intended paths.

Acceptance:

- Clean-database CI can run RLS tests.

---

# Phase 2 — Core domain contracts

## KT-020 — Define cadastral parcel domain model

- [ ] Add provider-independent TypeScript model.
- [ ] Include cadastral identifier, geometry, address where available, area, land-use facts where sourced, source metadata and freshness.
- [ ] Do not include provider SDK types in domain model.

Acceptance:

- Model can be created from a deterministic fixture without network access.

## KT-021 — Define building proposal domain model

- [ ] Building/structure category.
- [ ] footprint polygon.
- [ ] width/length when applicable.
- [ ] floor area / building footprint area.
- [ ] height.
- [ ] storeys.
- [ ] intended use.
- [ ] orientation.
- [ ] optional notes.

Acceptance:

- Invalid/empty/self-intersecting proposal geometry is rejected or normalized under explicit rules.

## KT-022 — Define normalized spatial constraint model

- [ ] Constraint stable ID.
- [ ] Category/subcategory.
- [ ] Geometry.
- [ ] source/evidence reference.
- [ ] legal/source reference where applicable.
- [ ] effective/freshness metadata.
- [ ] human-safe labels in Estonian.

Acceptance:

- Same internal model can represent at least cadastral restrictions, environmental restrictions and planning areas without losing source-specific metadata.

## KT-023 — Define finding and Ehituspass contracts

- [ ] Structured finding states: `clear`, `condition`, `conflict`, `unknown`.
- [ ] Severity/priority distinct from state.
- [ ] Evidence/provenance fields.
- [ ] Next actions.
- [ ] Official links.
- [ ] Data freshness/completeness metadata.

Acceptance:

- Contract cannot represent a material authoritative finding without evidence references.

---

# Phase 3 — Maa- ja Ruumiamet cadastral integration

## KT-030 — Implement cadastral identifier validation

- [ ] Validate expected Estonian cadastral identifier format.
- [ ] Normalize whitespace/presentation.
- [ ] Return typed validation errors.

Acceptance:

- Unit tests cover valid, invalid and malformed identifiers.

## KT-031 — Implement Maa- ja Ruumiamet cadastral WFS adapter

- [ ] Server-side adapter in Edge Function/shared server module.
- [ ] Configurable endpoint.
- [ ] Timeout, retry and maximum response size.
- [ ] Schema validation.
- [ ] Normalize parcel geometry and metadata.
- [ ] Record source retrieval provenance.

Acceptance:

- Fixture tests pass offline.
- Live integration test is optional/separate and must not gate normal unit tests.

## KT-032 — Implement parcel lookup API

- [ ] `GET /parcel/:cadastralId` equivalent Edge Function contract.
- [ ] Input validation.
- [ ] normalized response.
- [ ] source freshness metadata.
- [ ] explicit not-found/source-unavailable errors.

Acceptance:

- UI never needs to parse WFS/GML/provider payload directly.

## KT-033 — Implement parcel search UI

- [ ] Estonian cadastral input.
- [ ] loading, validation, not-found and provider-unavailable states.
- [ ] result summary.
- [ ] open parcel on map action.

Acceptance:

- Keyboard accessible.
- No false “not found” when upstream status is actually unavailable.

---

# Phase 4 — Map and proposal placement

## KT-040 — Add MapLibre map shell

- [ ] Show Estonia-centered default map.
- [ ] Include required source attribution.
- [ ] Support parcel zoom/fit.
- [ ] Keep map component separated from analysis domain logic.

Acceptance:

- Map renders on GitHub Pages and mobile viewport.

## KT-041 — Render selected parcel

- [ ] Transform server result to map display coordinates correctly.
- [ ] Show parcel boundary and key facts.
- [ ] Distinguish source geometry from user drawing.

Acceptance:

- Fixture parcel renders at expected location and extent.

## KT-042 — Add proposal drawing/editing

- [ ] Draw polygon/rectangle.
- [ ] Move/rotate where supported.
- [ ] Edit dimensions.
- [ ] Delete/reset proposal.
- [ ] Validate polygon before saving.

Acceptance:

- User can create a simple house/sauna/shed footprint without GIS expertise.

## KT-043 — Add proposal parameter form

- [ ] structure type.
- [ ] dimensions/area.
- [ ] height.
- [ ] storeys.
- [ ] intended use.
- [ ] accessible validation.

Acceptance:

- Map and form stay synchronized.

## KT-044 — Add server-side proposal geometry validation

- [ ] Verify geometry validity.
- [ ] Verify expected SRID.
- [ ] Verify reasonable bounds and size limits.
- [ ] Compute canonical area/perimeter server-side.

Acceptance:

- Client cannot forge authoritative area/distance values.

---

# Phase 5 — Official restriction and planning data

## KT-050 — Implement cadastral restrictions WFS adapter

- [ ] Integrate Maa- ja Ruumiamet restriction zones.
- [ ] Normalize geometry/categories.
- [ ] preserve source IDs and provenance.
- [ ] fixture tests.

Acceptance:

- Proposal/parcel can be checked against supported restriction geometries.

## KT-051 — Implement PLANIS WFS adapter

- [ ] Query planning areas relevant to parcel/bounding box.
- [ ] Normalize plan identifiers, type/status and geometry.
- [ ] Preserve official links/files where available.
- [ ] Do not treat mere plan-area intersection as a complete interpretation of detailed plan conditions.

Acceptance:

- System can say that a supported planning overlay exists and distinguish this from having parsed all textual conditions.

## KT-052 — Implement EELIS environmental WFS adapter

- [ ] Integrate explicitly selected public environmental layers.
- [ ] Normalize categories and geometry.
- [ ] Respect non-public/sensitive data limitations.
- [ ] Return `unknown`/manual-verification guidance for unsupported hidden data cases.

Acceptance:

- Public absence is never used to claim that no protected non-public object can exist.

## KT-053 — Implement heritage-source adapter

- [ ] Use an official machine-readable service when available and verified.
- [ ] Normalize monuments/protection areas relevant to MVP.
- [ ] Preserve official registry links.

Acceptance:

- No unofficial secondary dataset is used as authoritative source.

## KT-054 — Implement road/access source adapter

- [ ] Normalize state-road proximity/related official data available for automated use.
- [ ] Identify when Transpordiamet review/coordination may be relevant through rules, not generic text guessing.
- [ ] Keep local/private-road access as separate/unknown when source support is incomplete.

Acceptance:

- State-road finding has official evidence and does not imply an approval decision.

## KT-055 — Add source cache and freshness policy

- [ ] Cache normalized source objects according to source-specific policy.
- [ ] Keep `retrieved_at` and source version/update metadata.
- [ ] Permit forced refresh for analysis when required.
- [ ] Avoid uncontrolled duplicate provider calls.

Acceptance:

- UI can show freshness.
- Old cache does not masquerade as freshly checked data.

---

# Phase 6 — GIS analysis engine

## KT-060 — Implement parcel containment checks

- [ ] Proposal contained by parcel.
- [ ] Proposal crosses parcel boundary.
- [ ] Proposal touches parcel boundary.
- [ ] Compute distances using metric CRS.

Acceptance:

- Deterministic PostGIS tests include boundary-touch cases.

## KT-061 — Implement generic constraint intersection evaluator

- [ ] `ST_Intersects`/appropriate predicates.
- [ ] intersection area/length where meaningful.
- [ ] nearest distance when no intersection.
- [ ] evidence geometry reference.

Acceptance:

- Same engine can evaluate normalized layers without source-specific UI code.

## KT-062 — Implement geometry evidence output

- [ ] Produce map-safe evidence geometry/summary for conflicts.
- [ ] Avoid returning excessively large geometries to browser.
- [ ] Include source attribution.

Acceptance:

- User can visually see why a finding was triggered.

## KT-063 — Add GIS regression fixture suite

- [ ] contained.
- [ ] crossing.
- [ ] touching.
- [ ] 1 cm / 1 m / configured threshold boundary cases.
- [ ] invalid geometry.
- [ ] multipolygon.
- [ ] holes/interior rings where relevant.

Acceptance:

- Results are deterministic across clean database runs.

---

# Phase 7 — Versioned deterministic rules engine

## KT-070 — Implement rule evaluator interface

- [ ] Provider-independent inputs.
- [ ] Versioned rule identifier.
- [ ] deterministic output.
- [ ] no network or LLM calls inside evaluator.

Acceptance:

- Rule evaluation can run entirely from fixtures.

## KT-071 — Implement rule provenance enforcement

- [ ] Production finding requires verified rule version.
- [ ] Verified rule requires official source reference.
- [ ] Analysis persists exact version used.

Acceptance:

- Database/API prevents a completed authoritative finding from referencing only a mutable rule name.

## KT-072 — Implement initial Ehitusseadustik permit-path rules

- [ ] Model only rules verified against the current official law/version.
- [ ] Cover MVP-supported structure categories/parameters.
- [ ] Return `unknown` outside supported matrix.
- [ ] Add boundary tests for thresholds.

Acceptance:

- Every threshold has official source metadata and tests immediately below/equal/above threshold where relevant.

## KT-073 — Implement initial spatial restriction rules

- [ ] Convert supported GIS intersections into deterministic finding categories.
- [ ] Do not automatically label every protection-zone intersection “prohibited”.
- [ ] Encode whether it means conflict, condition or manual authority review according to verified source/rule.

Acceptance:

- Rule semantics distinguish protection/coordination requirements from absolute prohibitions.

## KT-074 — Implement planning completeness rule

- [ ] Distinguish “planning area detected” from “all plan textual conditions parsed”.
- [ ] Return manual verification requirement where textual plan provisions are not yet machine interpreted.

Acceptance:

- MVP never claims detailed-plan compliance solely from polygon containment.

## KT-075 — Add rule verification workflow

- [ ] `draft -> verified -> retired` lifecycle.
- [ ] Store verifier, verified timestamp and source version.
- [ ] Admin-only transition to verified.

Acceptance:

- Unverified rule versions cannot be used as authoritative production findings.

---

# Phase 8 — Ehituspass analysis API

## KT-080 — Implement analysis orchestrator

- [ ] Validate proposal.
- [ ] resolve parcel.
- [ ] obtain required source data.
- [ ] compute GIS facts.
- [ ] evaluate verified rules.
- [ ] calculate source completeness/freshness.
- [ ] persist immutable analysis snapshot.

Acceptance:

- Same frozen inputs/rule versions produce identical structured result.

## KT-081 — Implement analysis API endpoint

- [ ] Authenticated saved-project path.
- [ ] Optional public/guest path only if rate/security requirements are satisfied.
- [ ] Idempotency key for analysis requests.
- [ ] typed progress/failure states.

Acceptance:

- Repeated idempotent request does not create contradictory duplicate snapshots.

## KT-082 — Implement partial-source failure semantics

- [ ] Distinguish provider timeout from no matching objects.
- [ ] Mark affected categories `unknown`.
- [ ] Do not discard successful independent findings.

Acceptance:

- One failed data source cannot cause “all clear”.

## KT-083 — Implement analysis summary classification

- [ ] Derive overall summary from structured findings.
- [ ] A conflict cannot be hidden by clear findings.
- [ ] Unknown critical categories remain visible.
- [ ] Avoid fake probability score.

Acceptance:

- Summary logic is deterministic and unit tested.

---

# Phase 9 — Ehituspass user interface

## KT-090 — Build analysis progress experience

- [ ] Show source/check groups being evaluated.
- [ ] Avoid fake progress percentages unless based on real steps.
- [ ] Handle source timeout/retry states.

Acceptance:

- User understands whether analysis is still running, partially complete or failed.

## KT-091 — Build Ehituspass overview

- [ ] Overall result.
- [ ] parcel/proposal summary.
- [ ] critical findings.
- [ ] unknown/manual-review items.
- [ ] source freshness.

Acceptance:

- No important warning is hidden below a generic green score.

## KT-092 — Build finding cards

- [ ] textual state label.
- [ ] plain Estonian explanation.
- [ ] source.
- [ ] source date.
- [ ] official link.
- [ ] next action.
- [ ] map evidence action.

Acceptance:

- Accessible without relying on red/yellow/green alone.

## KT-093 — Build map finding overlays

- [ ] Select finding to highlight triggering geometry.
- [ ] Show proposal and parcel simultaneously.
- [ ] Source attribution remains visible.

Acceptance:

- Spatial conflict can be understood visually and textually.

## KT-094 — Build “what should I do next?” checklist

- [ ] Derived from structured findings/actions.
- [ ] Ordered by blockers/dependencies.
- [ ] Official action links where known.
- [ ] Clearly distinguish required/likely/manual-check actions.

Acceptance:

- Checklist contains no AI-invented requirement.

---

# Phase 10 — AI explanation layer

## KT-100 — Define LLM provider interface

- [ ] Provider-neutral interface.
- [ ] No provider types in domain layer.
- [ ] Configured only server-side.
- [ ] timeouts and token/output limits.

Acceptance:

- Deterministic analysis works with AI completely disabled.

## KT-101 — Implement explanation input contract

- [ ] Pass only structured analysis data and approved source excerpts/metadata.
- [ ] Separate evidence from system instructions.
- [ ] Explicitly prohibit status/rule modification.

Acceptance:

- Prompt does not ask model to decide legality independently.

## KT-102 — Implement structured AI response validation

- [ ] Schema-validate output.
- [ ] Require references to supplied finding IDs.
- [ ] reject unknown source IDs.
- [ ] fallback to deterministic templated explanation on failure.

Acceptance:

- AI failure never prevents access to the factual Ehituspass.

## KT-103 — Add prompt-injection and source-text isolation tests

- [ ] malicious source/document text.
- [ ] user prompt asking model to ignore restrictions.
- [ ] request to convert unknown to allowed.
- [ ] fabricated source URL attempt.

Acceptance:

- AI cannot change deterministic finding states or cite an unsupplied source.

## KT-104 — Add “Ask Krunditark” follow-up mode

- [ ] Questions limited to selected project/analysis evidence in MVP.
- [ ] Responses cite finding/source IDs.
- [ ] state limitations clearly.

Acceptance:

- Follow-up answer cannot introduce uncited legal facts as project-specific conclusions.

---

# Phase 11 — Authentication and saved work

## KT-110 — Implement Supabase Auth UX

- [ ] Choose MVP auth method (prefer low-friction email magic link/OTP unless product owner changes it).
- [ ] GitHub Pages callback routing supported.
- [ ] clear session/error states.

Acceptance:

- Auth secrets remain server-side/platform-managed.

## KT-111 — Implement project dashboard

- [ ] list saved projects.
- [ ] show parcel identifier and last analysis date/status.
- [ ] create/open/delete permitted own projects.

Acceptance:

- RLS tests prove ownership isolation.

## KT-112 — Implement analysis history

- [ ] List immutable analysis snapshots.
- [ ] Show data/rule version date.
- [ ] Allow rerun as a new analysis.

Acceptance:

- Reanalysis does not overwrite prior evidence/history.

---

# Phase 12 — EHR and richer project context

## KT-120 — Research and document E-ehitus/EHR API access for MVP fields

- [ ] Identify exact official endpoints and authentication/access conditions.
- [ ] Document which data can be consumed publicly/server-side.
- [ ] Add sample fixtures only after terms/access are confirmed.

Acceptance:

- No guessed endpoint or undocumented scraping dependency.

## KT-121 — Implement supported EHR adapter

- [ ] Existing building facts relevant to parcel/proposal.
- [ ] source provenance.
- [ ] typed unavailable/restricted states.

Acceptance:

- Existing-building data can inform analysis without exposing restricted records.

---

# Phase 13 — Reporting and export

## KT-130 — Implement printable Ehituspass view

- [ ] A4-friendly browser print CSS.
- [ ] source citations/links.
- [ ] generation timestamp.
- [ ] disclaimer.
- [ ] parcel/proposal identifiers.

Acceptance:

- Printed result retains warnings and provenance.

## KT-131 — Evaluate PDF generation architecture

- [ ] Decide client print-to-PDF vs server-generated signed/versioned report.
- [ ] Create ADR before adding heavy PDF infrastructure.

Acceptance:

- No PDF architecture is introduced without provenance/version requirements.

---

# Phase 14 — Utility and cost intelligence (post-core MVP unless promoted)

## KT-140 — Define utility availability model

- [ ] Electricity.
- [ ] water.
- [ ] sewerage.
- [ ] telecommunications.
- [ ] distinguish network proximity from actual connection availability/capacity.

## KT-141 — Research official/provider utility data access

- [ ] document APIs/maps/terms.
- [ ] identify data that requires provider quote/manual request.

## KT-142 — Add cost estimate model

- [ ] official fees vs market ranges vs provider quote.
- [ ] source/date/region.
- [ ] assumptions and uncertainty.

---

# Phase 15 — Security, privacy and production hardening

## KT-150 — Add Edge Function rate limiting

- [ ] Public/source-expensive endpoints protected.
- [ ] authenticated per-user limits.
- [ ] avoid storing unnecessary raw IP history.

## KT-151 — Add CORS production policy

- [ ] GitHub Pages preview origin.
- [ ] `https://krunditark.ee` production origin when enabled.
- [ ] no wildcard credentials policy.

## KT-152 — Add security headers/deployment checks

- [ ] CSP strategy compatible with map/Supabase endpoints.
- [ ] HSTS when custom HTTPS domain is production-ready.
- [ ] referrer policy.
- [ ] MIME/content-type protection where hosting supports it.

## KT-153 — Add privacy/retention implementation

- [ ] user project deletion.
- [ ] account deletion path.
- [ ] retention schedule for logs/cache/AI payloads.
- [ ] document subprocessors/provider policy before production AI use.

## KT-154 — Perform pre-production threat review

- [ ] auth bypass.
- [ ] RLS bypass.
- [ ] source response poisoning.
- [ ] prompt injection.
- [ ] geometry/resource exhaustion.
- [ ] SSRF in source adapters.
- [ ] oversized file/payload.
- [ ] secret leakage.

---

# Phase 16 — Cloudflare/DNS production transition

## KT-160 — Verify `.ee` registrar/DNS options at migration time

- [ ] Re-check Cloudflare Registrar support for `.ee` before planning a registrar transfer.
- [ ] If unsupported, keep registration at Zone and move only authoritative DNS/CDN to Cloudflare if desired.
- [ ] Export/back up Zone DNS records before nameserver changes.

Acceptance:

- No assumption that moving DNS requires moving the registrar.

## KT-161 — Add `krunditark.ee` to Cloudflare DNS when product owner requests migration

- [ ] inventory existing DNS.
- [ ] review DNSSEC state before nameserver migration.
- [ ] add required records.
- [ ] switch nameservers at Zone.
- [ ] validate DNS/HTTPS.

## KT-162 — Decide GitHub Pages vs Cloudflare Pages production hosting

- [ ] Benchmark operational needs.
- [ ] If moving to Cloudflare Pages, add ADR and production deployment workflow.
- [ ] Preserve Supabase backend separation.

## KT-163 — Production custom domain launch

- [ ] `krunditark.ee` canonical.
- [ ] `www` redirect policy.
- [ ] HTTPS enforced.
- [ ] auth redirect URLs updated.
- [ ] CORS origins updated.
- [ ] sitemap/robots/metadata configured.

---

# Phase 17 — Quality and launch gate

## KT-170 — Add Playwright critical-path suite

Cover at minimum:

- [ ] open site.
- [ ] search valid parcel fixture/integration environment.
- [ ] handle invalid cadastral ID.
- [ ] place proposal.
- [ ] run analysis.
- [ ] inspect conflict/condition/unknown finding.
- [ ] follow official source link UI.
- [ ] mobile viewport.
- [ ] auth/saved-project flow where enabled.

## KT-171 — Add accessibility audit

- [ ] keyboard flows.
- [ ] focus management.
- [ ] labels/errors.
- [ ] contrast.
- [ ] status not color-only.
- [ ] map has non-map textual equivalent for findings.

## KT-172 — Add performance budgets

- [ ] frontend JS budget.
- [ ] lazy-load map/heavy GIS UI.
- [ ] source API timeout budgets.
- [ ] analysis endpoint observability.

## KT-173 — Source outage drill

- [ ] cadastral provider unavailable.
- [ ] PLANIS unavailable.
- [ ] EELIS unavailable.
- [ ] AI provider unavailable.

Acceptance:

- Deterministic successful source findings survive unrelated provider failure.
- A failed source becomes `unknown`, never “clear”.

## KT-174 — Legal/rule verification review

- [ ] Every production rule has current official source metadata.
- [ ] Rule effective dates reviewed.
- [ ] Deprecated/changed rules retired rather than silently rewritten.
- [ ] User disclaimers reviewed.

## KT-175 — MVP release candidate

- [ ] All MVP-required tasks complete.
- [ ] CI green.
- [ ] migrations apply to clean database.
- [ ] RLS verified.
- [ ] critical E2E green.
- [ ] security review complete.
- [ ] source provenance verified on representative analyses.
- [ ] production deployment runbook tested.

---

# Post-MVP candidates

These are intentionally not part of the initial completion gate unless promoted by product decision:

- [ ] Blueprint/PDF floorplan import and scale detection.
- [ ] DXF/DWG/IFC placement workflows.
- [ ] Automatic best-placement optimizer inside buildable candidate area.
- [ ] Terrain/slope and elevation analysis.
- [ ] Flood-risk analysis.
- [ ] Solar/shadow orientation assistance.
- [ ] Detailed utility connection intelligence.
- [ ] Construction cost marketplace data.
- [ ] Architect/surveyor/contractor marketplace.
- [ ] KOV-specific document/plan-text extraction at national scale.
- [ ] Business/API plans for developers, brokers and prefab-house vendors.
- [ ] Batch parcel analysis.
- [ ] Verified signed professional reports.
- [ ] Finland/Latvia/Lithuania expansion.

See `docs/ROADMAP.md` before promoting any item.
