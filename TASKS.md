# TASKS.md — Krunditark ordered implementation backlog

Last backlog review: **2026-08-15**

This is the ordered engineering source of truth.

Status:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed and verified
- `[!]` blocked — record blocker

Do not skip to a commercially exciting later feature if its trust/data/security dependency is incomplete.

Mandatory companion docs:

- `AGENTS.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/USER_JOURNEYS_AND_PERSONAS.md`
- `docs/UX_UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_REFRESH_AND_CACHE.md`
- applicable task-specific docs/ADRs
- `docs/DEFINITION_OF_DONE.md`

---

# Phase 0 — Repository, UI and i18n foundation

## KT-001 — Initialize React/TypeScript/Vite application

- [x] React + TypeScript + Vite at repository root.
- [x] strict TypeScript.
- [x] source structure from `ARCHITECTURE.md`.
- [x] minimal Estonian application shell.
- [x] no secrets/placeholders that look like real credentials.

Acceptance:

- `npm ci`, typecheck, production build succeed.
- app renders locally.

## KT-002 — Add formatting/lint/test foundation

- [x] ESLint.
- [x] Prettier.
- [x] Vitest.
- [x] Testing Library where useful.
- [x] scripts: `format:check`, `lint`, `typecheck`, `test`, `build`.
- [x] minimal deterministic tests.

## KT-003 — Configure GitHub Actions CI

- [x] `npm ci` with committed lockfile.
- [x] format/lint/typecheck/test/build.
- [x] safe cache.
- [x] runs PRs + `main`.

## KT-004 — Configure GitHub Pages preview

- [x] static production build deploy.
- [x] repository-path support.
- [x] route strategy works on refresh/deep links.
- [x] no private server logic in Pages bundle.

## KT-005 — Add environment contract

- [x] `.env.example` placeholders only.
- [x] ignore real env/local Supabase state/secrets.
- [x] only publishable variables use `VITE_*`.
- [x] no `VITE_GEMINI_API_KEY`, service-role or payment secret.

## KT-006 — Add i18n architecture from day one

Read `LOCALIZATION_AND_LANGUAGE.md` and ADR 0008.

- [x] locale type `et|ru|en`.
- [x] translation catalog structure.
- [x] Estonian canonical strings.
- [x] missing-key development/CI behavior.
- [x] locale persistence/routing abstraction compatible with GitHub Pages preview and clean production routes.
- [x] no scattered hard-coded user-facing copy.

Acceptance:

- [x] switching locale framework state does not reload/recreate domain state;
- [x] ET complete for current shell;
- [x] RU/EN catalogs may be incomplete during development but missing critical keys are visible to developers.

## KT-007 — Create accessible design-system foundation

- [x] typography/token baseline with Latin + Cyrillic support.
- [x] buttons/inputs/cards/dialog/sheet/status badge/source/freshness components.
- [x] focus/keyboard behavior.
- [x] status semantics not color-only.
- [x] responsive layout primitives.

Acceptance:

- [x] representative components pass basic accessibility tests.

---

# Phase 1 — Supabase/PostGIS/security foundation

## KT-010 — Initialize Supabase project layout

- [x] `supabase/config.toml` via CLI.
- [x] `supabase/migrations/`.
- [x] `supabase/functions/`.
- [x] generated/local state ignored appropriately.

## KT-011 — Enable PostGIS by migration

- [x] extension in documented schema.
- [x] required spatial functions.
- [x] GiST smoke test.

## KT-012 — Create profile/role foundation

- [x] `profiles` keyed to `auth.users`.
- [x] minimal `user/admin` internal role model.
- [x] no client-controlled elevation.
- [x] RLS.

## KT-013 — Create project/proposal model

- [x] `projects`.
- [x] versioned `project_proposals`.
- [x] selected parcel ID is not ownership proof.
- [x] canonical geometry in EPSG:3301.
- [x] RLS ownership.
- [x] indexes/constraints.

## KT-014 — Create source/data-release schemas

Implement from `DATABASE_SCHEMA.md` / canonical refresh doc:

- [x] source definitions.
- [x] source sync/check runs.
- [x] source dataset versions.
- [x] composite data releases.
- [x] release-source membership.
- [x] source hashes/version/freshness fields.
- [x] internal schema not directly exposed.

## KT-015 — Create rule/legal schemas

- [x] legal sources.
- [x] rule definitions.
- [x] immutable rule versions.
- [x] effective dates.
- [x] `draft|verified|retired`.
- [x] legal-change candidates.
- [x] rule-source links.

## KT-016 — Create analysis snapshot schema

- [x] analyses.
- [x] findings.
- [x] evidence.
- [x] exact data release/rule versions.
- [x] engine/profile/input hash.
- [x] completed analysis immutable.

## KT-017 — Create internal audit model

Capture:

- [x] rule verify/retire.
- [x] source promote/disable/manual refresh.
- [x] admin role changes.
- [x] analysis invalidation annotation.
- [x] later refunds/manual entitlements.
- [x] No credentials/tokens.

## KT-018 — Database/RLS clean-start test suite

- [ ] clean migrations.
- [ ] unauthenticated access.
- [ ] anonymous Auth ownership behavior.
- [ ] permanent user isolation.
- [ ] internal schemas unavailable.
- [ ] server/admin-only paths.

---

# Phase 2 — Core domain contracts

## KT-020 — Parcel domain model

- [ ] cadastral ID.
- [ ] official address/basic facts.
- [ ] geometry.
- [ ] source dataset/version/freshness.
- [ ] provider-independent.

## KT-021 — Proposal domain model

- [ ] scenario/structure type.
- [ ] footprint.
- [ ] dimensions/area.
- [ ] height/storeys/use.
- [ ] orientation.
- [ ] proposal version.
- [ ] validation.

## KT-022 — Normalized spatial constraint model

- [ ] source-scoped stable object ID.
- [ ] category/subcategory.
- [ ] geometry/impact geometry.
- [ ] exact dataset version.
- [ ] effective/freshness metadata.
- [ ] source/legal references.

## KT-023 — Finding/Ehituspass contracts

- [ ] `clear|condition|conflict|unknown`.
- [ ] severity separate.
- [ ] provenance required for material findings.
- [ ] next actions.
- [ ] completeness/freshness.
- [ ] data release/rule manifest.

## KT-024 — User intent model

Stable codes:

- [ ] build/new structure.
- [ ] pre-purchase.
- [ ] understand parcel.
- [ ] existing-building modification placeholder for later.
- [ ] professional context marker where useful.

Do not mix translated labels into domain identifiers.

---

# Phase 3 — Address-first parcel discovery

## KT-030 — Validate cadastral identifiers

- [ ] format normalization.
- [ ] typed validation errors.
- [ ] tests.

## KT-031 — Research/lock In-AKS integration contract

Read current official MaRu In-AKS docs at implementation time.

- [ ] exact production/test endpoints.
- [ ] response fields/object identifiers.
- [ ] terms/attribution.
- [ ] client vs Edge proxy decision.
- [ ] rate/cache policy.
- [ ] ambiguous address-to-parcel behavior.
- [ ] deterministic fixtures.

## KT-032 — Implement address search API/adapter

- [ ] normalized `AddressSearchResult`.
- [ ] debounce/bounded query.
- [ ] typed unavailable vs no-match.
- [ ] short cache per source policy.
- [ ] provider payload types do not leak into UI/domain.

## KT-033 — Implement cadastral parcel adapter

- [ ] verified MaRu source/layer.
- [ ] timeout/retry/limits.
- [ ] schema/geometry validation.
- [ ] normalization/provenance.
- [ ] fixtures.

## KT-034 — Implement parcel resolution API

Support:

- [ ] cadastral exact lookup.
- [ ] address result -> candidate cadastral units.
- [ ] map spatial selection path.
- [ ] ambiguous results explicit.
- [ ] source/version/freshness metadata.

## KT-035 — Build landing combined search

Read `UX_UI_SPEC.md`.

- [ ] `Aadress või katastritunnus`.
- [ ] autocomplete.
- [ ] loading/no-match/unavailable/invalid states.
- [ ] keyboard accessible.
- [ ] secondary `Vali krunt kaardilt`.
- [ ] no signup requirement.

## KT-036 — Build parcel selection/disambiguation

- [ ] candidate outlines.
- [ ] address/cadastral/area summary.
- [ ] user explicitly confirms correct parcel.

## KT-037 — Build free parcel overview

- [ ] boundary/map.
- [ ] basic facts.
- [ ] data freshness.
- [ ] supported coverage statement.
- [ ] `Mida soovid selle krundiga teha?` choices.
- [ ] no false “all clear”.

---

# Phase 4 — Map and proposal creation

## KT-040 — Add MapLibre map shell

- [ ] Estonia-centered default.
- [ ] responsive/mobile.
- [ ] source attribution.
- [ ] lazy load where practical.
- [ ] production basemap selection remains ADR/open question until verified.

## KT-041 — Render selected parcel

- [ ] correct transformations.
- [ ] fit/zoom.
- [ ] parcel/source vs user proposal visually distinct.

## KT-042 — Build intent step

- [ ] build.
- [ ] pre-purchase route placeholder/disabled until product implemented.
- [ ] understand parcel.
- [ ] existing building future path clearly unsupported rather than misleading.

## KT-043 — Build supported structure selection

- [ ] visual structure cards.
- [ ] only verified-supported types marked fully supported.
- [ ] unsupported `Muu` can continue with explicitly limited checks.

## KT-044 — Build beginner footprint templates

- [ ] predefined starting rectangles/dimensions.
- [ ] custom dimensions.
- [ ] template is convenience, not design/legal advice.

## KT-045 — Build proposal placement editor

- [ ] drag.
- [ ] rotate.
- [ ] numeric resize.
- [ ] delete/reset.
- [ ] desktop side panel.
- [ ] mobile bottom-sheet workflow.

## KT-046 — Add advanced polygon mode

- [ ] draw/edit polygon.
- [ ] validation feedback.
- [ ] not the default beginner path.

## KT-047 — Server-side proposal validation

- [ ] GeoJSON validation.
- [ ] transform to 3301.
- [ ] validity/bounds/resource limits.
- [ ] canonical area/perimeter.
- [ ] reject/repair under explicit policy.

## KT-048 — Version proposal persistence

- [ ] create proposal version.
- [ ] do not mutate proposal referenced by completed analysis.
- [ ] owner RLS.

---

# Phase 5 — Official source adapters and hybrid data releases

## KT-050 — MaRu cadastral restrictions adapter

- [ ] approved layers only.
- [ ] normalized categories/geometry.
- [ ] provenance/version.
- [ ] fixtures.

## KT-051 — PLANIS adapter

- [ ] WFS/approved service.
- [ ] plan ID/type/status/title/authority/geometry/link.
- [ ] preserve distinction: plan intersection != full textual compliance.

## KT-052 — EELIS selected public-layer adapters

- [ ] explicit approved layer registry.
- [ ] normalized geometry/category.
- [ ] non-public sensitive-data limitation.
- [ ] public absence never proves hidden object absence.

## KT-053 — Heritage adapter research/implementation

- [ ] verify current authoritative machine-readable source.
- [ ] terms/access/layers.
- [ ] implement only after source verified.
- [ ] otherwise category remains explicit unsupported/manual.

## KT-054 — State road/access adapter research/implementation

- [ ] authoritative data.
- [ ] road/protection/access semantics.
- [ ] condition/coordination != automatic prohibition.

## KT-055 — Implement source policy registry

Every source declares:

- [ ] source class.
- [ ] refresh/check cadence.
- [ ] freshness warning/critical thresholds.
- [ ] replication policy.
- [ ] release blocking/carry-forward policy.
- [ ] attribution/terms.

## KT-056 — Implement source sync pipeline

- [ ] privileged server orchestration.
- [ ] staging.
- [ ] schema/SRID/geometry validation.
- [ ] stable-ID/hash change detection.
- [ ] complete-fetch proof before deletion interpretation.
- [ ] idempotency/locking/checkpoints.
- [ ] no Gemini.

## KT-057 — Source dataset promotion/composite release

- [ ] quality gates.
- [ ] abnormal-diff quarantine.
- [ ] transactional promotion.
- [ ] immutable release membership.
- [ ] carried-forward freshness state.

## KT-058 — Schedule heavy spatial reconciliation

- [ ] Supabase Cron/server job.
- [ ] monthly baseline where source config says so.
- [ ] idempotent duplicate invocation.
- [ ] retry/observability.
- [ ] manual emergency refresh through same validation path.

## KT-059 — Implement lightweight source change watches

At minimum architecture/tests for:

- [ ] Riigi Teataja legal version/hash watch (daily policy candidate).
- [ ] source capabilities/schema/health watch.
- [ ] later EHR changed-after cursor.
- [ ] changed source enqueues sync/review, not Gemini.
- [ ] failed watch != unchanged.

## KT-05A — Source health/admin view

Internal view/API:

- [ ] last successful/attempted check/sync.
- [ ] active version.
- [ ] freshness age.
- [ ] next due.
- [ ] error.
- [ ] pending candidate.
- [ ] carried-forward state.

---

# Phase 6 — GIS engine

## KT-060 — Parcel containment checks

- [ ] contained/crossing/touching.
- [ ] boundary distance.
- [ ] metric 3301.

## KT-061 — Generic constraint intersection evaluator

- [ ] correct spatial predicates.
- [ ] measurement.
- [ ] nearest distance where meaningful.
- [ ] source evidence.

## KT-062 — Evidence geometry output

- [ ] intersection/nearest evidence.
- [ ] browser-safe simplification.
- [ ] source attribution.

## KT-063 — GIS regression fixtures

Cover:

- [ ] contained.
- [ ] crossing.
- [ ] touching.
- [ ] threshold ± boundary cases.
- [ ] invalid.
- [ ] multipolygon.
- [ ] holes/rings.

---

# Phase 7 — Versioned deterministic rules

## KT-070 — Rule evaluator interface

- [ ] provider-independent facts.
- [ ] exact rule version.
- [ ] deterministic result.
- [ ] no network/Gemini.

## KT-071 — Enforce rule provenance

- [ ] verified production finding requires verified rule/source.
- [ ] analysis stores exact version.

## KT-072 — Verify first current building/process matrix

Before coding legal logic:

- [ ] select exact supported types/scenarios.
- [ ] re-check current Ehitusseadustik and annexes effective at implementation.
- [ ] include 01.08.2026-era changes/current state.
- [ ] document official sections/effective dates.
- [ ] define unknown outside matrix.

## KT-073 — Implement supported permit/process rules

- [ ] deterministic thresholds/conditions.
- [ ] boundary tests below/equal/above.
- [ ] official source metadata.
- [ ] no simplistic “area alone always decides”.

## KT-074 — Implement spatial restriction semantics

- [ ] GIS fact -> condition/conflict/unknown according to verified rule.
- [ ] protection-zone intersection not universally “prohibited”.

## KT-075 — Planning completeness rule

- [ ] plan area detected.
- [ ] textual conditions parsed/not parsed state.
- [ ] manual verification when needed.

## KT-076 — Rule verification workflow

- [ ] draft -> verified -> retired.
- [ ] verifier/time/source.
- [ ] admin-only transition.
- [ ] audit.

## KT-077 — Legal change candidate workflow

- [ ] daily watch creates candidate.
- [ ] link potentially affected rules.
- [ ] cannot auto-promote.
- [ ] stale/invalidated rule safety behavior.

---

# Phase 8 — Deterministic analysis/Ehituspass API

## KT-080 — Analysis input/profile contract

- [ ] exact project/proposal.
- [ ] analysis profile version.
- [ ] current eligible data release selection.
- [ ] idempotency.

## KT-081 — Implement analysis orchestrator

- [ ] auth/ownership.
- [ ] proposal validation.
- [ ] choose data release.
- [ ] freshness/completeness.
- [ ] PostGIS facts.
- [ ] verified rules.
- [ ] summary/next actions.
- [ ] immutable persistence.

## KT-082 — Analysis API

- [ ] create/status/result.
- [ ] idempotency same request same result semantics.
- [ ] typed errors.
- [ ] no provider-specific payload.

## KT-083 — Partial/stale/source failure semantics

- [ ] timeout/unavailable != empty.
- [ ] stale policy.
- [ ] independent successful findings preserved.
- [ ] critical source gap visible.

## KT-084 — Deterministic overall summary

- [ ] conflict cannot be hidden.
- [ ] critical unknown visible.
- [ ] “no conflict within checked scope” wording.
- [ ] no probability score.

## KT-085 — Deterministic next-action engine

- [ ] structured action codes.
- [ ] category required-check / likely-process / recommendation / optional.
- [ ] dependency/order.
- [ ] official action links where verified.

## KT-086 — Analysis cache

- [ ] canonical input/data/rule/engine hash.
- [ ] safe result reuse.
- [ ] no cross-user private metadata leak.

---

# Phase 9 — Ehituspass UI and variant workflow

## KT-090 — Analysis progress UX

Show real local analysis stages; do not pretend each authority is being contacted live.

## KT-091 — Ehituspass summary

- [ ] overall state.
- [ ] parcel/proposal.
- [ ] analysis date.
- [ ] data release/source freshness.
- [ ] critical findings/unknowns.

## KT-092 — Finding cards

- [ ] state/title/summary.
- [ ] trigger/measurement.
- [ ] next action.
- [ ] official source/date/link.
- [ ] map evidence.

## KT-093 — Finding <-> map evidence interaction

- [ ] card selects geometry.
- [ ] geometry opens card.
- [ ] unrelated layers dim.
- [ ] accessible text equivalent.

## KT-094 — Next-step checklist UI

- [ ] ordered actions.
- [ ] action type clearly labeled.
- [ ] direct official links.

## KT-095 — Duplicate/move proposal variant

- [ ] copy exact scenario.
- [ ] move/rotate/edit.
- [ ] run new analysis.

## KT-096 — Variant comparison

- [ ] compare finding changes A/B.
- [ ] conflict/condition/unknown counts as summary only.
- [ ] exact differences listed.
- [ ] no AI black-box score.

## KT-097 — Responsive/mobile critical journey

- [ ] search.
- [ ] parcel.
- [ ] template placement.
- [ ] report.
- [ ] map bottom sheet.
- [ ] keyboard/touch accessibility.

---

# Phase 10 — Gemini explanation layer

## KT-100 — Explanation provider interface

- [ ] Krunditark-owned interface.
- [ ] Gemini adapter only implementation.
- [ ] fake test provider.

## KT-101 — Gemini server integration

At implementation time verify current official Google SDK/model lifecycle.

- [ ] `GEMINI_API_KEY` secret.
- [ ] configurable model.
- [ ] timeouts/output/token limits.
- [ ] provider errors mapped.

## KT-102 — Grounded explanation input

- [ ] exact findings.
- [ ] measurements.
- [ ] approved source metadata/excerpts.
- [ ] locale/glossary guidance.
- [ ] source content separated from instructions.

## KT-103 — Structured output validation

- [ ] schema.
- [ ] supplied finding/source IDs only.
- [ ] cannot change state.
- [ ] reject invented official URL.
- [ ] deterministic fallback.

## KT-104 — Explanation cache

Key includes:

- [ ] result hash.
- [ ] locale.
- [ ] prompt template.
- [ ] model/config.
- [ ] schema version.

## KT-105 — AI adversarial tests

- [ ] prompt injection from user/source.
- [ ] ask to ignore conflict.
- [ ] ask to turn unknown into allowed.
- [ ] fabricated law/source.
- [ ] current utility price without evidence.
- [ ] provider timeout/rate limit/malformed output.

## KT-106 — Ask Krunditark scoped follow-up

- [ ] selected analysis only.
- [ ] references supplied evidence.
- [ ] cannot introduce uncited project-specific legal facts.

---

# Phase 11 — Guest-first Auth, accounts and full localization

## KT-110 — Enable Supabase anonymous Auth safely

Read ADR 0006.

- [ ] anonymous sign-in config.
- [ ] RLS checks `is_anonymous` where needed.
- [ ] bounded guest projects/analysis.
- [ ] abuse/CAPTCHA strategy.
- [ ] cleanup/retention.

## KT-111 — Guest project persistence

- [ ] create state only when needed.
- [ ] same-browser recovery.
- [ ] warning that unlinked guest state can be lost.

## KT-112 — Email OTP permanent Auth

- [ ] OTP form UX.
- [ ] custom SMTP before public production.
- [ ] rate/error handling.
- [ ] preserve exact project/action.

## KT-113 — Google OAuth

- [ ] minimal scopes.
- [ ] correct redirects.
- [ ] anonymous identity linking/conversion.
- [ ] existing account conflict handling.

## KT-114 — Account conversion E2E

Scenario:

- guest finds parcel;
- places proposal;
- auth prompt;
- converts;
- exact same project remains available.

## KT-115 — Projects dashboard/history

- [ ] saved projects.
- [ ] current status/latest report.
- [ ] data-release age/newer-data indicator placeholder.
- [ ] archive/delete.

## KT-116 — Account/privacy page

- [ ] identity/language.
- [ ] notification placeholder.
- [ ] deletion/export path.
- [ ] session/logout.

## KT-117 — Complete Russian consumer critical flow

- [ ] reviewed core glossary.
- [ ] landing/search/proposal/report/auth/errors/help.
- [ ] Cyrillic layout QA.
- [ ] legal source semantics unchanged.

## KT-118 — Complete English critical flow

Same critical coverage and review.

## KT-119 — Locale E2E/print/email foundations

- [ ] switch preserves project.
- [ ] formats correct.
- [ ] source links unchanged.
- [ ] screenshots/layout for long RU/EN strings.

---

# Phase 12 — EHR existing-building integration

## KT-120 — Verify current EHR API access/terms

- [ ] exact endpoint/auth/rate.
- [ ] public fields permitted.
- [ ] cache/replication behavior.
- [ ] document privacy restrictions.
- [ ] changed-after semantics.

## KT-121 — Implement EHR actual-building adapter

- [ ] current building data.
- [ ] source provenance/version.
- [ ] deterministic fixture.

## KT-122 — Implement incremental EHR sync/watch

- [ ] changed-after cursor.
- [ ] bounded pagination/windowing.
- [ ] overlap/dedupe.
- [ ] cursor advances only after commit.
- [ ] periodic reconciliation.

## KT-123 — Show existing buildings on parcel

- [ ] map/list.
- [ ] explicit EHR source/date.
- [ ] no unsupported document exposure.

---

# Phase 13 — Reporting, support and beta hardening

## KT-130 — Printable Ehituspass

- [ ] A4 print CSS.
- [ ] map/evidence snapshot/attribution.
- [ ] source/rule/data release manifest.
- [ ] disclaimer.
- [ ] ET/RU/EN layout.

## KT-131 — Decide PDF implementation

ADR before heavy signed/server PDF infrastructure.

## KT-132 — Add analysis feedback

- [ ] helpful/partial/no.
- [ ] reason categories.
- [ ] no PII/source geometry sent to third-party analytics.

## KT-133 — Add `Teata võimalikust andmeveast`

- [ ] analysis/finding/source IDs attached safely.
- [ ] internal triage record.
- [ ] no need for user to retype technical details.

## KT-134 — Public sample/demo Ehituspass

- [ ] synthetic/demo data.
- [ ] all state examples.
- [ ] sources labeled as demo if not real.
- [ ] no auth/payment.

## KT-135 — Accessibility audit

Target WCAG 2.2 AA for core journey.

## KT-136 — Playwright beta critical path

- [ ] address search fixture/integration env.
- [ ] parcel select.
- [ ] guest proposal.
- [ ] analysis/report.
- [ ] variant.
- [ ] guest -> permanent Auth.
- [ ] mobile.
- [ ] locale switch.

---

# Phase 14 — Commerce foundation and paid Ehituspass

Only start after deterministic product/auth/recovery are stable.

## KT-140 — Payment-provider research + ADR

Compare current Stripe/Montonio/other justified option:

- [ ] Estonia payment methods/conversion.
- [ ] one-time + future subscription.
- [ ] fees.
- [ ] webhook quality.
- [ ] refunds/invoices.
- [ ] accounting.
- [ ] API/dev effort.
- [ ] data handling.

Select one first provider explicitly.

## KT-141 — Commerce database foundation

From `COMMERCE_AND_ENTITLEMENTS.md`:

- [ ] products.
- [ ] versioned prices.
- [ ] orders.
- [ ] payment attempts/events.
- [ ] entitlements.
- [ ] refunds.
- [ ] RLS/internal access.

## KT-142 — Payment provider adapter

- [ ] server-side secret.
- [ ] create checkout.
- [ ] verify webhook.
- [ ] refund method if supported.
- [ ] provider SDK boundary.
- [ ] fake provider tests.

## KT-143 — Verified/idempotent payment webhook

- [ ] signature.
- [ ] raw body if required.
- [ ] event dedupe.
- [ ] amount/order validation.
- [ ] atomic paid/entitlement state.
- [ ] audit.

## KT-144 — Ehituspass order/entitlement flow

- [ ] current price resolved server-side.
- [ ] identity required before checkout.
- [ ] browser return polls server state.
- [ ] entitlement scoped to report/proposal.
- [ ] no client grant.

## KT-145 — Paid-report fulfillment recovery

- [ ] payment succeeds browser closes.
- [ ] report generation fails.
- [ ] retry no re-charge/no double consumption.
- [ ] support can recover by order ID.

## KT-146 — Pricing page

Consumer intent-first products:

- [ ] free overview.
- [ ] Ehituspass.
- [ ] Project Pass teaser/availability depending implementation.
- [ ] Pro link/waitlist.
- [ ] no preselected subscription.

Exact prices configured/testable.

## KT-147 — Orders/account UI

- [ ] product/project/report.
- [ ] amount/status/date.
- [ ] receipt/invoice link when available.
- [ ] refund/support state.

## KT-148 — Commerce legal/privacy launch review

- [ ] seller legal entity.
- [ ] VAT/accounting.
- [ ] privacy.
- [ ] terms.
- [ ] digital content/withdrawal/refund behavior.
- [ ] support contacts.

## KT-149 — Paid launch E2E/security gate

- [ ] payment success.
- [ ] invalid signature.
- [ ] duplicate event.
- [ ] failure/cancel.
- [ ] browser close.
- [ ] unauthorized order access.
- [ ] paid-but-unfulfilled alert.

---

# Phase 15 — Project Pass and change monitoring

## KT-150 — Project Pass entitlement

- [ ] one project scope.
- [ ] time window.
- [ ] bounded variants/analyses.
- [ ] history remains readable after expiry.
- [ ] product terms/config.

## KT-151 — `newer_data_available`

- [ ] compare report basis vs current promoted release/rules.
- [ ] project banner.
- [ ] old analysis unchanged.

## KT-152 — Reanalysis workflow

- [ ] user triggers new analysis.
- [ ] Project Pass inclusion policy.
- [ ] exact new manifest.

## KT-153 — Deterministic analysis diff

Compare:

- [ ] new/removed finding.
- [ ] state change.
- [ ] measurement change.
- [ ] source/data version.
- [ ] rule version.
- [ ] exclude AI wording-only differences from factual diff.

## KT-154 — Project notifications

- [ ] report ready.
- [ ] newer data.
- [ ] later material change.
- [ ] preferences.
- [ ] localized email.

No alarmist “your project is invalid” without deterministic impact.

---

# Phase 16 — Ostukontroll

## KT-160 — Buyer intent/report profile

- [ ] parcel-level checks without building proposal.
- [ ] exact supported categories.
- [ ] ownership wording correct.

## KT-161 — Ostukontroll deterministic report

- [ ] planning.
- [ ] restrictions.
- [ ] environment/heritage/road.
- [ ] existing EHR buildings if supported.
- [ ] unknowns.
- [ ] seller/KOV questions.
- [ ] source dates.

## KT-162 — Ostukontroll UI

- [ ] buyer-focused language.
- [ ] no forced drawing.
- [ ] `Testi siia maja` upgrade.

## KT-163 — Ostukontroll commerce product

- [ ] one-time entitlement.
- [ ] price/catalog.
- [ ] optional upgrade-credit experiment only as structured rule.

## KT-164 — Multi-parcel comparison research/prototype

- [ ] transparent category comparison.
- [ ] no opaque investment score.

---

# Phase 17 — Existing building/extension workflows

## KT-170 — Define scenario taxonomy

Research/verify separately:

- [ ] extension.
- [ ] reconstruction.
- [ ] demolition/rebuild.
- [ ] use change.

## KT-171 — Existing building selection

- [ ] EHR building map/list.
- [ ] exact building ID/version.

## KT-172 — Existing vs proposed geometry

- [ ] change drawing/import.
- [ ] separate validation.

## KT-173 — Verified rule profiles per scenario

Do not reuse new-building profile without legal review.

---

# Phase 18 — Utility and cost intelligence

These require source research and can move independently by category.

## KT-180 — Utility domain model

Separate:

- [ ] infrastructure/proximity.
- [ ] service area.
- [ ] capacity evidence.
- [ ] connection eligibility.
- [ ] quote.

## KT-181 — Electricity data/provider research

- [ ] public/authorized map/API.
- [ ] terms.
- [ ] what can be concluded.
- [ ] direct quote/request handoff.

## KT-182 — Water/sewer operator strategy

- [ ] national/KOV/operator fragmentation map.
- [ ] service area sources.
- [ ] adapter strategy.

## KT-183 — Well/on-site wastewater research

- [ ] official constraints/process/source.

## KT-184 — Cost model/source methodology

- [ ] official fee.
- [ ] market range.
- [ ] provider quote.
- [ ] source/date/region/assumptions.

No Gemini-memory prices.

---

# Phase 19 — Terrain/site intelligence

## KT-190 — Elevation/slope research + adapter

- [ ] MaRu official LiDAR/DTM/WCS source.
- [ ] size/performance strategy.
- [ ] parcel/proposal metrics.

## KT-191 — Flood-risk adapter

- [ ] official scenario data.
- [ ] scenario meaning/limitations.

## KT-192 — Geology/groundwater context

- [ ] official layer selection.
- [ ] engineering disclaimer.

## KT-193 — Drainage/land-improvement context

- [ ] official registered systems/constraints.

## KT-194 — Solar/orientation assistance

Design assistance only; explicit inputs/algorithm.

---

# Phase 20 — Blueprint/model import

## KT-200 — Private upload/storage security

- [ ] MIME/size.
- [ ] ownership RLS.
- [ ] safe object keys.
- [ ] retention/delete.

## KT-201 — PDF footprint import

- [ ] candidate extraction.
- [ ] scale calibration.
- [ ] user confirmation.
- [ ] source page/reference.

## KT-202 — DXF/DWG research/implementation

- [ ] parser/licensing/security.
- [ ] scale/CRS.
- [ ] supported subset.

## KT-203 — IFC/BIM footprint extraction

- [ ] server parser/resource isolation.
- [ ] footprint/height candidate.
- [ ] user confirmation.

## KT-204 — Gemini document privacy decision before private uploads to AI

Must satisfy `OPEN_QUESTIONS.md` OQ-017.

---

# Phase 21 — Placement intelligence

## KT-210 — Candidate-area derivation

- [ ] transparent supported exclusion geometry.
- [ ] evidence/source/rule links.
- [ ] not official approval.

## KT-211 — Placement suggestion algorithm

- [ ] explicit criteria.
- [ ] user preferences.
- [ ] deterministic/inspectable ranking.
- [ ] no Gemini geometry choice.

## KT-212 — Before/after explanation

- [ ] exact finding differences.
- [ ] optional Gemini wording only.

---

# Phase 22 — Professional product

## KT-220 — Pro UI mode

- [ ] dense map/source detail.
- [ ] shortcuts.
- [ ] reusable templates.
- [ ] many projects.

## KT-221 — Organization/membership model

- [ ] organization.
- [ ] memberships/roles.
- [ ] org project ownership.
- [ ] audit.

## KT-222 — Pro subscription/usage entitlements

- [ ] plan catalog.
- [ ] included usage.
- [ ] usage ledger/idempotency.
- [ ] expiration/cancellation preserves project history.

## KT-223 — Client share/review workflow

- [ ] revocable link/access.
- [ ] private notes excluded by default.

## KT-224 — Professional exports

- [ ] CSV/report/source manifest as appropriate.

---

# Phase 23 — Batch/B2B API

## KT-230 — Explicit API v1 ADR/spec

- [ ] versioning.
- [ ] tenant/org auth.
- [ ] attribution/terms.
- [ ] error/rate semantics.

## KT-231 — API credentials/service accounts

- [ ] hashed/scoped credentials.
- [ ] rotation/revoke.
- [ ] audit.

## KT-232 — Batch analysis jobs

- [ ] CSV/list.
- [ ] queue/checkpoint.
- [ ] per-item partial/failure.
- [ ] usage metering.

## KT-233 — Signed B2B webhooks

- [ ] event IDs.
- [ ] signatures.
- [ ] retries/idempotency.

## KT-234 — B2B billing/usage

Provider-independent; no unmetered “unlimited” until economics known.

---

# Phase 24 — Partner distribution

## KT-240 — Prefab model catalog

- [ ] exact model geometry/metadata.
- [ ] vendor source/version.
- [ ] placement workflow.

## KT-241 — Embeddable parcel-fit widget

- [ ] partner attribution.
- [ ] user consent.
- [ ] neutral finding.
- [ ] lead handoff optional/separate.

## KT-242 — Listing deep links

- [ ] parcel hint only.
- [ ] official resolution still required.
- [ ] seller text never authority.

---

# Phase 25 — Professional review/marketplace

Do not start before neutral core product has trust/traffic and partner policy is resolved.

## KT-250 — Professional review request

- [ ] user explicitly selects professional review.
- [ ] shares exact report/evidence with consent.
- [ ] automated finding remains separate.

## KT-251 — Partner qualification/ranking policy

- [ ] disclosure.
- [ ] commercial neutrality.
- [ ] complaints.
- [ ] no paid effect on finding.

## KT-252 — Quote/lead workflow

- [ ] structured request.
- [ ] privacy/consent.
- [ ] partner access scope.
- [ ] commercial attribution.

No programmatic/banner ads in Ehituspass.

---

# Phase 26 — PLANIS/KOV document intelligence

## KT-260 — PLANIS document/file ingestion research

- [ ] exact API/download/file access.
- [ ] classifiers.
- [ ] terms/privacy.

## KT-261 — Plan-text candidate extraction

- [ ] page/section citations.
- [ ] extraction confidence.
- [ ] no automatic rule promotion.

## KT-262 — Verified local-condition rule workflow

- [ ] reviewer.
- [ ] source clause/effective date.
- [ ] tests.

## KT-263 — Prioritized KOV adapter program

Evidence-based by user demand/data gaps, not 79 blind scrapers.

---

# Phase 27 — Official-process handoff

## KT-270 — EHR/PLANIS deep-link handoff

- [ ] supported next-action destination.
- [ ] no claim of submission.

## KT-271 — Application checklist/package

- [ ] structured user/project facts.
- [ ] missing information checklist.

## KT-272 — Draft assistance research

- [ ] user-controlled text drafts.
- [ ] no signatures/submissions without explicit authority.

## KT-273 — Official submission integration ADR

Only if official APIs/identity/delegation/legal review support it.

---

# Phase 28 — Production/Cloudflare/operational hardening

## KT-280 — Production Supabase project/backup decision

- [ ] environment separation.
- [ ] region.
- [ ] backups/PITR as required.
- [ ] owner/MFA policy.

## KT-281 — Production SMTP

- [ ] selected provider.
- [ ] SPF/DKIM/DMARC.
- [ ] auth emails.
- [ ] delivery monitoring.

## KT-282 — Rate limiting/abuse

- [ ] anonymous search/project/analysis.
- [ ] AI.
- [ ] commerce.
- [ ] uploads/API.

## KT-283 — CORS/security headers

- [ ] preview/prod origins.
- [ ] CSP.
- [ ] HSTS when domain production.
- [ ] referrer/MIME policies.

## KT-284 — Privacy/retention implementation

- [ ] user/account deletion.
- [ ] anonymous cleanup.
- [ ] source/raw cache retention.
- [ ] AI payload retention.
- [ ] commerce/accounting retention.
- [ ] uploads/share links.

## KT-285 — Threat review

Cover:

- [ ] Auth/RLS bypass.
- [ ] anonymous abuse.
- [ ] SSRF/provider response poisoning.
- [ ] prompt injection.
- [ ] geometry/resource exhaustion.
- [ ] upload parser attacks.
- [ ] payment webhook/replay.
- [ ] entitlement bypass.
- [ ] share token leakage.
- [ ] secrets/logs.

## KT-286 — Cloudflare/DNS production migration decision

- [ ] current `.ee` registrar situation rechecked.
- [ ] Zone DNS inventory/DNSSEC.
- [ ] Cloudflare DNS/Pages/Workers choice.
- [ ] static asset route behavior.

## KT-287 — `krunditark.ee` production launch

- [ ] canonical domain/HTTPS.
- [ ] `www` policy.
- [ ] auth redirects.
- [ ] CORS.
- [ ] sitemap/robots/hreflang.
- [ ] private reports noindex.
- [ ] uptime/source/commerce monitoring.

---

# Phase 29 — Product analytics/growth foundation

Only after privacy decision.

## KT-290 — Typed analytics event model

- [ ] event names/properties from `PRODUCT_ANALYTICS_AND_GROWTH.md`.
- [ ] schema version.
- [ ] no full address/cadastral geometry/email/notes/AI prompt in third-party events by default.

## KT-291 — Select analytics approach/provider

- [ ] privacy/legal basis.
- [ ] first-party vs provider.
- [ ] EU processing/retention/deletion.

## KT-292 — Product/trust dashboard

Show both:

- [ ] funnel/conversion.
- [ ] source freshness/unknown/error/quality.
- [ ] paid fulfillment/refund.
- [ ] economics later.

## KT-293 — User research/beta feedback program

- [ ] homeowners.
- [ ] land buyers.
- [ ] architects.
- [ ] professional partners.
- [ ] test real task comprehension, not only visual preference.

---

# Phase 30 — Release gates

## KT-300 — Source outage drill

- [ ] address provider.
- [ ] cadastral.
- [ ] PLANIS.
- [ ] EELIS.
- [ ] EHR.
- [ ] Riigi Teataja watch.
- [ ] Gemini.

No failed source may create false `clear`.

## KT-301 — Rule/current-law review

- [ ] every production rule source/effective date.
- [ ] pending legal candidate backlog.
- [ ] current rules not known-obsolete.

## KT-302 — Core accessibility/performance gate

- [ ] WCAG 2.2 AA core.
- [ ] mobile.
- [ ] map lazy loading.
- [ ] analysis latency/observability.

## KT-303 — Paid launch gate

- [ ] commerce/auth/privacy/legal ready.
- [ ] payment/report recovery.
- [ ] source/provenance.
- [ ] current rules.
- [ ] sample report.
- [ ] support.

## KT-304 — Pro/B2B launch gate later

- [ ] tenant isolation.
- [ ] entitlements/usage.
- [ ] API versioning.
- [ ] billing/support/terms.

---

# Research/roadmap guardrail

`docs/PRODUCT_EXPANSION_BACKLOG.md` and `docs/ROADMAP.md` contain additional ideas/stages.

An agent must not implement a future item merely because it appears attractive. Promote it into this file first with:

- user problem;
- source dependencies;
- deterministic/AI boundary;
- privacy/security;
- data model/API;
- free/paid entitlement behavior;
- failure/unknown semantics;
- tests;
- telemetry;
- acceptance criteria.
