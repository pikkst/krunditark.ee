# TASKS.md — Krunditark implementation backlog

This is the ordered source of truth for implementation work.

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed and acceptance criteria verified
- `[!]` blocked; add the blocker below the task

Do not skip phases merely because a later task looks easier. A task may be implemented earlier only when its dependencies are already satisfied and doing so does not create temporary insecure architecture.

For all official-data work, `docs/DATA_REFRESH_AND_VERSIONING.md` and ADR 0005 are mandatory requirements.

---

# Phase 0 — Repository and engineering foundation

## KT-001 — Initialize frontend application

- [ ] Create React + TypeScript + Vite application at repository root.
- [ ] Enable TypeScript strict mode.
- [ ] Add base directories: `src/app`, `src/components`, `src/features`, `src/lib`, `src/domain`, `src/types`, `src/styles`.
- [ ] Add a minimal Estonian landing/application shell.
- [ ] No backend secrets or placeholder secret values in source.

Acceptance:

- `npm ci`, typecheck and production build succeed.
- App renders locally.

## KT-002 — Add formatting, linting and test foundation

- [ ] ESLint.
- [ ] Prettier.
- [ ] Vitest.
- [ ] Testing Library where useful.
- [ ] scripts: `format:check`, `lint`, `typecheck`, `test`, `build`.

Acceptance:

- all scripts run non-interactively;
- minimal test proves CI execution.

## KT-003 — Configure GitHub Actions CI

- [ ] `npm ci` using committed lockfile.
- [ ] format, lint, typecheck, unit tests, production build.
- [ ] safe dependency caching.

Acceptance:

- CI runs on PRs and pushes to `main`;
- failed checks fail the workflow.

## KT-004 — Configure GitHub Pages preview deployment

- [ ] Pages deployment after successful build.
- [ ] repository-path hosting supported.
- [ ] routing works without private server runtime.
- [ ] custom-domain transition documented separately.

## KT-005 — Add project environment contract

- [ ] `.env.example` with placeholders only.
- [ ] ignore real environment/Supabase secret files.
- [ ] frontend variables are publishable only.
- [ ] Gemini key is never a `VITE_*` variable.

---

# Phase 1 — Supabase and database foundation

## KT-010 — Initialize Supabase project structure

- [ ] `supabase/config.toml` through Supabase CLI.
- [ ] `supabase/migrations/`.
- [ ] `supabase/functions/`.
- [ ] local/generated state ignored as appropriate.

## KT-011 — Enable PostGIS by migration

- [ ] enable PostGIS.
- [ ] verify required spatial functions and GiST indexes.
- [ ] migration smoke test.

## KT-012 — Create identity/profile tables

- [ ] `profiles` keyed to Supabase Auth user ID.
- [ ] minimal user/admin role model.
- [ ] RLS; no client-controlled elevation.

## KT-013 — Create project/proposal tables

- [ ] `projects`.
- [ ] versioned `project_proposals`.
- [ ] cadastral identifier is selection, not proof of ownership.
- [ ] footprint geometry/design parameters.
- [ ] RLS and indexes.

## KT-014 — Create source/provenance/version schemas

Implement the source/data-release foundation from `docs/DATABASE_SCHEMA.md`:

- [ ] `private.source_definitions`.
- [ ] `private.source_sync_runs`.
- [ ] `private.source_dataset_versions`.
- [ ] `private.data_releases`.
- [ ] `private.data_release_sources`.
- [ ] normalized source snapshot relationships.
- [ ] hashes/provenance metadata.

Acceptance:

- a normalized fact can be traced to exact source dataset version and sync run;
- internal tables are not exposed to ordinary clients.

## KT-015 — Create rules-engine schema

- [ ] rule definitions.
- [ ] immutable/versioned rule versions.
- [ ] effective dates and verification status.
- [ ] official source relationships.
- [ ] legal change candidate table.

## KT-016 — Create analysis snapshot schema

- [ ] analyses/findings/evidence.
- [ ] exact `data_release_id`.
- [ ] exact rule-version references.
- [ ] engine/input version metadata.
- [ ] completed analyses immutable.

## KT-017 — Add audit logging model

- [ ] actor/action/target/timestamp/safe metadata.
- [ ] include source promotion/manual refresh/legal-rule verification events.
- [ ] never log credentials.

## KT-018 — Add database and RLS test suite

- [ ] anonymous access.
- [ ] ownership isolation.
- [ ] internal schemas unavailable to ordinary clients.
- [ ] admin/server-only source sync/promotion behavior.

---

# Phase 2 — Core domain contracts

## KT-020 — Define cadastral parcel domain model

- [ ] provider-independent TypeScript model.
- [ ] cadastral ID, geometry, basic facts, source dataset version, freshness.
- [ ] no provider SDK types.

## KT-021 — Define building proposal model

Include:

- [ ] structure category;
- [ ] footprint polygon;
- [ ] dimensions/area;
- [ ] height/storeys;
- [ ] intended use;
- [ ] orientation;
- [ ] notes.

## KT-022 — Define normalized spatial constraint model

Include:

- [ ] stable source object ID;
- [ ] category/subcategory;
- [ ] geometry/impact geometry;
- [ ] exact source dataset version;
- [ ] legal/source references where applicable;
- [ ] effective/freshness metadata.

## KT-023 — Define finding and Ehituspass contracts

- [ ] states: `clear`, `condition`, `conflict`, `unknown`.
- [ ] severity distinct from state.
- [ ] evidence/provenance.
- [ ] next actions/official links.
- [ ] data release + source freshness/completeness.

---

# Phase 3 — Maa- ja Ruumiamet cadastral integration

## KT-030 — Implement cadastral identifier validation

- [ ] validate/normalize Estonian cadastral identifier format.
- [ ] typed errors and tests.

## KT-031 — Implement Maa- ja Ruumiamet cadastral adapter

- [ ] server-side WFS/API adapter.
- [ ] verified configured endpoint/layer.
- [ ] timeout/retry/max response size.
- [ ] schema validation.
- [ ] normalization to domain/source snapshot format.
- [ ] deterministic fixtures.

## KT-032 — Implement parcel lookup API

- [ ] stable Krunditark response contract.
- [ ] source dataset version/data release/freshness metadata.
- [ ] correct not-found vs unavailable semantics.

During transition before replicated cadastral data exists, a bounded server-side lookup may be used. Production must follow the registered source refresh policy.

## KT-033 — Implement parcel search UI

- [ ] cadastral input.
- [ ] loading/validation/not-found/unavailable states.
- [ ] result summary and open-map action.

---

# Phase 4 — Map and proposal placement

## KT-040 — Add MapLibre map shell

- [ ] Estonia-centered map.
- [ ] required attribution.
- [ ] parcel fit/zoom.
- [ ] mobile support.

## KT-041 — Render selected parcel

- [ ] correct CRS transformation.
- [ ] parcel boundary/key facts.
- [ ] source geometry distinct from user drawing.

## KT-042 — Add proposal drawing/editing

- [ ] draw rectangle/polygon.
- [ ] move/rotate/edit dimensions where supported.
- [ ] delete/reset.
- [ ] validate before save.

## KT-043 — Add proposal parameter form

- [ ] type, dimensions/area, height, storeys, intended use.
- [ ] map/form synchronization.

## KT-044 — Add server-side proposal geometry validation

- [ ] validity/SRID/bounds/size checks.
- [ ] canonical area/perimeter computed server-side.

---

# Phase 5 — Official sources and scheduled data releases

## KT-050 — Implement cadastral restrictions adapter

- [ ] MaRu restriction zones.
- [ ] normalized geometry/categories/source IDs.
- [ ] deterministic fixture tests.

## KT-051 — Implement PLANIS adapter

- [ ] supported planning records/geometries.
- [ ] plan ID/type/status/official link.
- [ ] no claim of full textual-plan compliance from polygon alone.

## KT-052 — Implement EELIS environmental adapters

- [ ] explicitly selected public layers only.
- [ ] normalize geometry/categories.
- [ ] respect hidden/non-public data limits.
- [ ] use `unknown`/manual verification where necessary.

## KT-053 — Implement heritage-source adapter

- [ ] verify an official machine-readable source first.
- [ ] monument/protection geometry and official links.
- [ ] no unofficial authoritative substitute.

## KT-054 — Implement road/access adapter

- [ ] official state-road/protection/access context where machine-readable.
- [ ] semantic rules separate condition/coordination from prohibition.

## KT-055 — Implement source registry refresh/freshness policy

- [ ] each source declares `refresh_policy`.
- [ ] baseline replicated policy is `monthly_snapshot`.
- [ ] freshness warning/critical thresholds.
- [ ] release-blocking behavior.
- [ ] verification policy.
- [ ] replication/retention decision.

Acceptance:

- no implemented source has implicit refresh semantics;
- normal user analysis does not control refresh behavior.

## KT-056 — Implement source synchronization pipeline

- [ ] privileged server-side sync orchestration.
- [ ] staging/candidate writes.
- [ ] source schema/CRS/required-field validation.
- [ ] stable-ID/hash change detection.
- [ ] complete-fetch proof before deletion detection.
- [ ] candidate dataset version creation.
- [ ] idempotency and overlap locking.
- [ ] bounded batching/checkpoints where needed.

Acceptance:

- repeated identical sync is safe/idempotent;
- failed/incomplete sync cannot replace active data;
- Gemini is never called in normal sync.

## KT-057 — Implement source dataset promotion and composite data releases

- [ ] source candidate quality gates.
- [ ] automatic vs manual verification policy.
- [ ] transactional source-version promotion.
- [ ] composite `data_release` creation.
- [ ] exact source-version membership.
- [ ] carried-forward/freshness state.

Acceptance:

- readers never observe half-promoted releases;
- old release remains immutable/reproducible.

## KT-058 — Schedule monthly source reconciliation with Supabase Cron

- [ ] migration/config enables required scheduling mechanism.
- [ ] schedule monthly full reconciliation for due `monthly_snapshot` sources.
- [ ] orchestration invokes privileged Edge Function/server workflow.
- [ ] duplicate schedule invocation remains idempotent.
- [ ] retries/failures observable.
- [ ] manual/emergency source refresh supported through controlled admin/server path.

Acceptance:

- scheduled job can run without user traffic;
- missed/failed sync does not erase last verified data.

## KT-059 — Add source health, legal change detection and monitoring

- [ ] last successful sync/next due time.
- [ ] fetched/added/changed/removed metrics.
- [ ] abnormal-diff quarantine threshold.
- [ ] stale critical source alert state.
- [ ] source schema-change handling.
- [ ] Riigi Teataja/legal source diff candidate workflow.
- [ ] legal change cannot auto-promote rule interpretation.

Acceptance:

- an admin can determine whether production data is fresh and why a release was rejected/carried forward.

---

# Phase 6 — GIS analysis engine

## KT-060 — Implement parcel containment checks

- [ ] contained/crossing/touching.
- [ ] metric distances.
- [ ] deterministic PostGIS tests.

## KT-061 — Implement generic constraint intersection evaluator

- [ ] correct spatial predicates.
- [ ] intersection measurements.
- [ ] nearest distance where meaningful.
- [ ] evidence/source version reference.

## KT-062 — Implement geometry evidence output

- [ ] map-safe evidence geometry/summary.
- [ ] avoid excessive browser geometry.
- [ ] attribution.

## KT-063 — Add GIS regression fixture suite

Cover contained, crossing, touching, near-threshold, invalid geometry, multipolygon and holes where applicable.

---

# Phase 7 — Versioned deterministic rules engine

## KT-070 — Implement rule evaluator interface

- [ ] provider-independent inputs.
- [ ] versioned rule ID.
- [ ] deterministic output.
- [ ] no network/Gemini calls.

## KT-071 — Implement rule provenance enforcement

- [ ] verified production rule requires official source.
- [ ] analysis stores exact rule version.

## KT-072 — Implement initial Ehitusseadustik permit-path rules

- [ ] only verified supported structure matrix.
- [ ] `unknown` outside matrix.
- [ ] threshold boundary tests.

## KT-073 — Implement initial spatial restriction rules

- [ ] convert supported GIS facts into deterministic findings.
- [ ] do not treat every protection zone as automatic prohibition.

## KT-074 — Implement planning completeness rule

- [ ] planning area detected != all textual conditions parsed.
- [ ] manual verification where needed.

## KT-075 — Add rule verification workflow

- [ ] `draft -> verified -> retired`.
- [ ] verifier/time/source version.
- [ ] admin-only verification.
- [ ] legal-change candidates can mark rules for review without auto-changing them.

---

# Phase 8 — Ehituspass analysis API

## KT-080 — Implement analysis orchestrator

- [ ] validate proposal.
- [ ] select latest eligible promoted data release.
- [ ] pin exact release/source versions for whole analysis.
- [ ] resolve parcel/source facts from that release.
- [ ] calculate freshness/completeness.
- [ ] compute GIS facts.
- [ ] evaluate verified rules.
- [ ] persist immutable analysis.

Acceptance:

- same frozen inputs + data release + rule versions produce identical structured result;
- analysis never bulk-refreshes national sources.

## KT-081 — Implement analysis API endpoint

- [ ] authenticated saved-project path.
- [ ] idempotency.
- [ ] typed progress/failure states.
- [ ] return selected data release metadata.

## KT-082 — Implement partial/stale source semantics

- [ ] stale source distinct from missing/no matches.
- [ ] critical unknowns visible.
- [ ] successful independent findings survive unrelated source failure.

## KT-083 — Implement deterministic summary classification

- [ ] conflicts cannot be hidden.
- [ ] unknown critical categories remain visible.
- [ ] no fake buildability probability.

---

# Phase 9 — Ehituspass user interface

## KT-090 — Build analysis progress experience

- [ ] real analysis steps, not fake percentages.
- [ ] preparing/evaluating/partial/failed states.

## KT-091 — Build Ehituspass overview

- [ ] overall result.
- [ ] parcel/proposal summary.
- [ ] critical findings and unknowns.
- [ ] data release and freshness.

## KT-092 — Build finding cards

Each card includes:

- [ ] textual state/severity.
- [ ] plain Estonian explanation.
- [ ] source and source date/version.
- [ ] official link.
- [ ] next action.
- [ ] map evidence action.

## KT-093 — Build map finding overlays

- [ ] highlight triggering geometry.
- [ ] proposal + parcel visible.
- [ ] source attribution.

## KT-094 — Build next-steps checklist

- [ ] deterministic structured actions.
- [ ] dependency/blocker ordering.
- [ ] official links.
- [ ] required/likely/manual-check distinction.

---

# Phase 10 — Google Gemini explanation layer

## KT-100 — Define explanation provider interface

- [ ] provider-neutral domain interface.
- [ ] Gemini production adapter selected by configuration.
- [ ] no Google SDK types in domain layer.
- [ ] timeouts/output limits.

## KT-101 — Implement Gemini explanation input contract

- [ ] structured immutable analysis only.
- [ ] minimal approved evidence/excerpts.
- [ ] evidence separated from instructions.
- [ ] explicitly prohibit changing finding state.

## KT-102 — Implement Gemini structured response validation/cache

- [ ] schema validation.
- [ ] supplied finding/source IDs only.
- [ ] deterministic fallback on failure.
- [ ] reuse stored validated explanation for same immutable analysis where allowed.

## KT-103 — Add AI adversarial tests

- [ ] prompt injection in source/user text.
- [ ] request to ignore restriction.
- [ ] request to convert `unknown` to allowed.
- [ ] fabricated source URL.
- [ ] malformed response/timeout/rate limit.

## KT-104 — Add Ask Krunditark follow-up mode

- [ ] selected analysis evidence only.
- [ ] cited finding/source IDs.
- [ ] no source refresh from a chat question.

---

# Phase 11 — Authentication and saved work

## KT-110 — Implement Supabase Auth UX

- [ ] low-friction approved auth method.
- [ ] GitHub Pages callback routing.
- [ ] clear session/error states.

## KT-111 — Implement project dashboard

- [ ] list/create/open/archive/delete own projects.
- [ ] last analysis date/status/data release.
- [ ] RLS isolation.

## KT-112 — Implement analysis history

- [ ] immutable snapshots.
- [ ] data release/rule version visible.
- [ ] rerun creates new analysis against latest eligible release.

---

# Phase 12 — EHR and richer project context

## KT-120 — Research/document E-ehitus/EHR API

- [ ] exact endpoints/access/auth/terms/rate limits.
- [ ] fields relevant to Krunditark.
- [ ] replication/storage permission.
- [ ] choose `monthly_snapshot`, incremental sync or justified `live_lookup` policy.

## KT-121 — Implement supported EHR adapter

- [ ] existing building facts.
- [ ] provenance/source version.
- [ ] typed unavailable/restricted state.
- [ ] integrate with the source version/release model.

---

# Phase 13 — Reporting/export

## KT-130 — Implement printable Ehituspass

- [ ] A4-friendly CSS.
- [ ] data release/source/rule citations.
- [ ] generation timestamp and source-data dates distinguished.
- [ ] disclaimer.

## KT-131 — Evaluate PDF architecture

- [ ] client print-to-PDF vs signed/versioned server report.
- [ ] ADR before heavy PDF infrastructure.

---

# Phase 14 — Utility and cost intelligence

## KT-140 — Define utility availability model

- [ ] electricity/water/sewer/telecom.
- [ ] network proximity != connection capacity/availability.

## KT-141 — Research official/provider utility data

- [ ] APIs/maps/terms.
- [ ] snapshot vs live-quote semantics.

## KT-142 — Add cost estimate model

- [ ] official fee vs market estimate vs provider quote.
- [ ] source/date/region/assumptions.

---

# Phase 15 — Security, privacy and production hardening

## KT-150 — Add rate limiting

Protect public/expensive analysis, AI and manual-refresh endpoints.

## KT-151 — Add CORS production policy

Support preview and `https://krunditark.ee`; no insecure wildcard credential policy.

## KT-152 — Add security headers/deployment checks

CSP/HSTS/referrer/content-type policies as hosting permits.

## KT-153 — Add privacy/retention implementation

- [ ] user/account deletion.
- [ ] source/raw payload retention.
- [ ] AI payload retention.
- [ ] provider/subprocessor privacy decision.

## KT-154 — Perform pre-production threat review

Cover auth/RLS bypass, source poisoning, sync endpoint abuse, prompt injection, geometry exhaustion, SSRF, oversized payloads, secret leakage.

---

# Phase 16 — Cloudflare/DNS production transition

## KT-160 — Verify `.ee` registrar/DNS options at migration time

- [ ] re-check Cloudflare Registrar `.ee` support.
- [ ] keep Zone registrar if needed; Cloudflare DNS/edge can still be used.
- [ ] back up Zone DNS.

## KT-161 — Add `krunditark.ee` to Cloudflare DNS when requested

- [ ] inventory DNS/DNSSEC.
- [ ] add records/switch nameservers.
- [ ] validate DNS/HTTPS.

## KT-162 — Decide GitHub Pages vs Cloudflare Pages production hosting

- [ ] ADR if moving hosting.
- [ ] preserve Supabase backend separation.

## KT-163 — Production custom-domain launch

- [ ] canonical domain/www redirect.
- [ ] HTTPS.
- [ ] auth/CORS updates.
- [ ] sitemap/robots/metadata.

---

# Phase 17 — Quality and launch gate

## KT-170 — Add Playwright critical-path suite

Cover:

- [ ] open site.
- [ ] parcel search.
- [ ] invalid cadastral ID.
- [ ] place proposal.
- [ ] run analysis.
- [ ] inspect conflict/condition/unknown.
- [ ] data release/freshness display.
- [ ] official source link.
- [ ] mobile.
- [ ] auth/saved project where enabled.

## KT-171 — Add accessibility audit

Keyboard/focus/labels/contrast/status semantics/non-map textual equivalent.

## KT-172 — Add performance budgets

- [ ] frontend bundle/lazy map loading.
- [ ] analysis DB latency.
- [ ] Gemini latency budget.
- [ ] source sync batch/runtime budgets independently from user latency.

## KT-173 — Source outage/sync failure drill

Test:

- [ ] MaRu/PLANIS/EELIS sync failure.
- [ ] rejected candidate version.
- [ ] previous verified version carried forward.
- [ ] stale source visible.
- [ ] Gemini unavailable.

Acceptance:

- failed refresh never becomes “all clear” and never erases previous verified data.

## KT-174 — Legal/rule verification review

- [ ] every production rule has official source/version metadata.
- [ ] pending legal change candidates reviewed.
- [ ] changed rules versioned/verified, never silently rewritten.
- [ ] disclaimers reviewed.

## KT-175 — MVP release candidate

- [ ] all MVP-required tasks complete.
- [ ] CI green.
- [ ] clean migrations/RLS green.
- [ ] monthly source sync/data-release pipeline demonstrated.
- [ ] source freshness/health observable.
- [ ] historical analysis reproducibility verified.
- [ ] critical E2E green.
- [ ] security/legal review complete.
- [ ] production deployment runbook tested.

---

# Post-MVP candidates

- [ ] Blueprint/PDF floorplan import and scale detection.
- [ ] DXF/DWG/IFC workflows.
- [ ] Automatic best-placement optimizer.
- [ ] Terrain/slope/elevation.
- [ ] Flood risk.
- [ ] Solar/shadow orientation.
- [ ] Detailed utility intelligence.
- [ ] Construction-cost marketplace data.
- [ ] Architect/surveyor/contractor marketplace.
- [ ] KOV-specific document/plan-text extraction.
- [ ] Business/API plans for developers, brokers and prefab vendors.
- [ ] Batch parcel analysis.
- [ ] Signed professional reports.
- [ ] Finland/Latvia/Lithuania expansion.

See `docs/ROADMAP.md` before promoting any item.
