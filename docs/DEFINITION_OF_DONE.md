# Definition of Done — Krunditark

Last review: **2026-08-15**

A task is complete only when its acceptance criteria and every applicable gate below are satisfied.

## 1. Scope and product behavior

- [ ] Implementation matches `TASKS.md` and linked specs.
- [ ] No unrelated feature/refactor added silently.
- [ ] Unsupported behavior remains explicit (`unknown`/`not_supported`) rather than guessed.
- [ ] User journey preserves work across navigation/auth/payment/error where applicable.
- [ ] User-facing result ends with a useful next action when the feature creates a decision result.

## 2. Code quality

- [ ] TypeScript strict passes.
- [ ] No unjustified `any`.
- [ ] English code comments explain non-obvious reasoning.
- [ ] Provider SDK types do not leak into domain models.
- [ ] No hidden network call in deterministic domain/rule logic.
- [ ] No duplicated legal/business logic between UI/server without deliberate abstraction.

## 3. Security

- [ ] No secret/elevated key in frontend/repo/logs/fixtures.
- [ ] Input validated at trust boundary.
- [ ] Privileged authorization server-side.
- [ ] RLS added/updated/tested for client-accessible resources.
- [ ] Anonymous/permanent distinction enforced where applicable.
- [ ] External fetch is allow-listed/SSRF-safe.
- [ ] geometry/file/source/AI/payment operations have resource limits.
- [ ] logs exclude tokens/credentials/sensitive payloads.

## 4. Authentication/onboarding

If Auth/account behavior changes:

- [ ] guest-first rule preserved unless ADR changes it;
- [ ] no unnecessary signup wall before meaningful value;
- [ ] anonymous A cannot access B;
- [ ] `is_anonymous` semantics tested;
- [ ] guest -> permanent conversion preserves project;
- [ ] permanent-only actions reject anonymous users;
- [ ] redirect/retry/cancel states preserve user work;
- [ ] production email behavior matches custom-SMTP policy where applicable.

## 5. Database/migrations

If schema changes:

- [ ] ordered forward migration committed;
- [ ] clean database applies all migrations;
- [ ] previously applied migration not edited;
- [ ] FK/check/unique constraints reviewed;
- [ ] indexes reviewed;
- [ ] RLS/grants reviewed;
- [ ] timestamps/SRID conventions followed;
- [ ] critical relationships are structured, not hidden only in arbitrary JSON.

## 6. GIS

If spatial behavior changes:

- [ ] authoritative calculation server/PostGIS-side;
- [ ] correct explicit CRS;
- [ ] geometry validity handled;
- [ ] predicate matches domain semantics;
- [ ] GiST/query-plan impact reviewed;
- [ ] touching/near-threshold/boundary tests added;
- [ ] map evidence agrees with server result;
- [ ] spatial intersection is not mislabeled as legal violation without rule semantics.

## 7. Official-source adapter

If a source changes:

- [ ] official source/endpoint/layer verified at implementation time;
- [ ] terms/attribution considered;
- [ ] semantic scope documented;
- [ ] source class/refresh/freshness policy defined;
- [ ] timeout/retry/max-size controls;
- [ ] response schema validated;
- [ ] deterministic fixtures;
- [ ] source version/provenance persisted;
- [ ] success-empty distinct from failure;
- [ ] source failure becomes partial/unknown where appropriate;
- [ ] `DATA_SOURCES.md` and canonical refresh doc updated.

## 8. Scheduled refresh/change watch

If ingestion/freshness changes:

- [ ] job independent from user traffic;
- [ ] idempotent/lock-safe;
- [ ] staging + validation before promotion;
- [ ] suspicious/incomplete sync cannot erase last good release;
- [ ] source freshness/health observable;
- [ ] legal/EHR change watch does not call Gemini;
- [ ] manual emergency refresh uses same safety gates;
- [ ] historical analysis can still resolve its dataset versions.

## 9. Rules

If a rule changes:

- [ ] stable code/version;
- [ ] new version when semantics/legal basis changed;
- [ ] current official source/section recorded;
- [ ] effective dates reviewed;
- [ ] draft/verified/retired lifecycle respected;
- [ ] trigger/non-trigger/boundary/missing-fact tests;
- [ ] old rule version retained;
- [ ] no LLM output used as authority;
- [ ] pending law change cannot silently leave known-invalid rule active without explicit safety state.

## 10. Analysis provenance

For material finding/report:

- [ ] exact parcel/proposal snapshot;
- [ ] exact data release/dataset versions;
- [ ] exact rule versions;
- [ ] source evidence;
- [ ] measurements/geometry reproducible;
- [ ] engine/profile/input version stored;
- [ ] completed factual report immutable;
- [ ] AI prose is not required to reconstruct factual result.

## 11. Analysis/cache

If caching changes:

- [ ] key includes all factual compatibility dimensions;
- [ ] data/rule/engine/proposal change invalidates as required;
- [ ] cache cannot leak private metadata cross-user;
- [ ] stale result never masquerades as current;
- [ ] idempotent concurrent requests covered.

## 12. AI/Gemini

If AI changes:

- [ ] deterministic analysis works with AI disabled;
- [ ] key server-side;
- [ ] current Google SDK/model documentation checked;
- [ ] input contains only needed approved evidence;
- [ ] output schema validated;
- [ ] finding state cannot change;
- [ ] prompt-injection/adversarial cases covered;
- [ ] provider failure has deterministic fallback;
- [ ] cache key includes result/locale/model/prompt/schema;
- [ ] logging/retention matches privacy policy.

## 13. Localization

If user-facing behavior changes:

- [ ] strings use i18n keys rather than scattered hard-coded copy;
- [ ] Estonian canonical copy complete;
- [ ] enabled RU/EN critical keys complete;
- [ ] critical legal/status/payment terms preserve meaning;
- [ ] official Estonian legal/source identity remains traceable;
- [ ] locale switch preserves project and does not rerun deterministic analysis;
- [ ] long/cyrillic/mobile layout reviewed;
- [ ] dates/numbers/units formatted correctly.

## 14. UX/accessibility

If user-facing behavior changes:

- [ ] beginner flow does not require GIS expertise unnecessarily;
- [ ] loading/empty/error/unknown/stale states exist;
- [ ] not-found differs from provider unavailable;
- [ ] status is not color-only;
- [ ] keyboard/focus/touch behavior reviewed;
- [ ] mobile layout works;
- [ ] map has textual equivalent for material findings;
- [ ] source/freshness visible for regulatory claims;
- [ ] no wording implies official approval without evidence;
- [ ] target WCAG 2.2 AA for core flow.

## 15. Variant/project history

If proposal/history behavior changes:

- [ ] completed analysis proposal is not mutated;
- [ ] duplicate creates new scenario/version;
- [ ] comparisons use exact analysis IDs;
- [ ] factual diff excludes AI wording-only changes;
- [ ] newer-data rerun creates new analysis, not rewrite old one.

## 16. Commerce/payment

If commerce changes:

- [ ] price resolved server-side from versioned catalog;
- [ ] client cannot grant paid state/entitlement;
- [ ] provider webhook signature verified;
- [ ] provider event deduped;
- [ ] order/payment/entitlement transaction boundaries correct;
- [ ] retry does not double-charge/double-consume;
- [ ] paid-but-unfulfilled report recoverable;
- [ ] unauthorized order/report access denied;
- [ ] refund/admin changes audited;
- [ ] provider SDK isolated;
- [ ] fake provider tests in normal CI;
- [ ] payment/legal/privacy/accounting docs updated.

## 17. Sharing/files

If sharing/uploads change:

- [ ] sharing explicit opt-in/revocable;
- [ ] token high entropy and scoped;
- [ ] private notes/files excluded unless selected;
- [ ] shared view noindex/referrer behavior reviewed;
- [ ] uploads private/RLS-protected;
- [ ] MIME/size/parser resource controls;
- [ ] private plan not sent to Gemini without approved privacy decision.

## 18. Analytics/growth

If analytics changes:

- [ ] privacy/legal basis/consent decision documented;
- [ ] no full address/cadastral geometry/email/notes/AI prompt/payment ID sent third-party by default;
- [ ] typed event schema;
- [ ] staging vs production separated;
- [ ] analytics failure cannot block product;
- [ ] experiment cannot alter factual finding/source/critical warning visibility.

## 19. Tests

- [ ] relevant unit tests;
- [ ] adapter fixtures;
- [ ] migration/RLS;
- [ ] GIS regression;
- [ ] Edge Function/API;
- [ ] UI/component where useful;
- [ ] i18n tests where applicable;
- [ ] Auth/commerce/security tests where applicable;
- [ ] critical E2E updated;
- [ ] E2E runs in CI from a clean checkout;
- [ ] E2E uses controlled/fake backend responses or a deterministic local test backend;
- [ ] no normal test depends on public internet/live Gemini/live payment.

## 20. CI/build

When scripts/features exist:

- [ ] `npm ci`
- [ ] format check
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] production build
- [ ] clean migrations/RLS
- [ ] relevant Edge/GIS/i18n/Playwright gates

## 21. Documentation

- [ ] API spec updated for contract changes;
- [ ] DB/schema docs updated;
- [ ] source/refresh docs updated;
- [ ] user journey/UX updated where behavior changed;
- [ ] Auth/localization/commerce docs updated where applicable;
- [ ] ADR added/superseded for architectural decision;
- [ ] environment/deployment docs updated;
- [ ] `TASKS.md` status changed only after verification;
- [ ] `OPEN_QUESTIONS.md` contains only unresolved decisions.

## 22. Observability/supportability

For server/provider features:

- [ ] typed error code;
- [ ] request/source/analysis timing observable;
- [ ] source/data-release/rule ID available for diagnosis;
- [ ] paid fulfillment observable where applicable;
- [ ] support can identify failing analysis/order without asking user to copy internal raw payload;
- [ ] logs contain no secrets.

## 23. Legal/trust check

For regulatory/commercial output:

- [ ] current official source reverified when required;
- [ ] source/effective date recorded;
- [ ] uncertainty preserved;
- [ ] product does not overstate legal certainty;
- [ ] official link/disclaimer remains available;
- [ ] partner/advertising relationship cannot alter finding;
- [ ] current price/provider/legal facts are not taken blindly from old documentation.

## 24. Completion evidence

PR/change summary states:

- what was implemented;
- user problem/journey affected;
- tests/checks run;
- migrations;
- source/rule/data versions affected;
- locales tested;
- screenshots for meaningful UI;
- known limitations/unknowns;
- external current-doc verification when relevant.

“Works on my machine” is not Done.
