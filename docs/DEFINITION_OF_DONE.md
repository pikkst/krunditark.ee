# Definition of Done — Krunditark

Last review: **2026-08-21**

A task is complete only when its acceptance criteria and every applicable gate below are satisfied.

For KT-038–KT-048, `PHASE_4_READINESS.md` is an additional mandatory completion gate.

## 1. Scope and product behavior

- [ ] Implementation matches `TASKS.md` and linked specs.
- [ ] No unrelated feature/refactor added silently.
- [ ] Unsupported behavior remains explicit (`unknown`/`not_supported`) rather than guessed.
- [ ] User journey preserves work across navigation/auth/payment/error where applicable.
- [ ] User-facing result ends with a useful next action when the feature creates a decision result.
- [ ] Explicit open-question gates have not been bypassed by implementation assumptions.

## 2. Code quality

- [ ] TypeScript strict passes.
- [ ] No unjustified `any`.
- [ ] English code comments explain non-obvious reasoning.
- [ ] Provider SDK/schema-library types do not leak into domain models.
- [ ] No hidden network call in deterministic domain/rule logic.
- [ ] No duplicated legal/business logic between UI/server without deliberate abstraction.
- [ ] Runtime validation exists at external trust boundaries; no specific validation library is required unless an ADR/task says so.
- [ ] No duplicate server-state/source-cache ownership is introduced accidentally.

## 3. Security

- [ ] No secret/elevated key in frontend/repo/logs/fixtures.
- [ ] Input validated at trust boundary.
- [ ] Privileged authorization server-side.
- [ ] RLS added/updated/tested for client-accessible resources.
- [ ] Anonymous/permanent distinction enforced where applicable.
- [ ] External fetch is allow-listed/SSRF-safe.
- [ ] geometry/file/source/AI/payment operations have resource limits.
- [ ] public endpoints have bounded caller/request behavior appropriate to their traffic.
- [ ] logs exclude tokens/credentials/sensitive payloads and unnecessary full user-entered addresses.
- [ ] supportable server/provider failures have a safe request/correlation identifier where applicable.

## 4. Authentication/onboarding

If Auth/account/project-ownership behavior changes:

- [ ] guest-first rule preserved unless ADR changes it;
- [ ] no unnecessary **permanent-signup** wall before meaningful value;
- [ ] anonymous technical identity is not presented as a permanent-account requirement;
- [ ] anonymous A cannot access B;
- [ ] `is_anonymous` semantics tested where permanent identity restrictions apply;
- [ ] owner project/proposal writes use the user's normal RLS path, not browser service-role/shared ownership;
- [ ] guest -> permanent conversion preserves project when conversion is implemented;
- [ ] permanent-only actions reject anonymous users;
- [ ] route/locale/redirect/retry/cancel states preserve user work;
- [ ] production email behavior matches custom-SMTP policy where applicable.

### Phase 4 minimum guest ownership

Before owner-RLS proposal persistence is Done:

- [ ] public parcel discovery/free overview can remain bounded without permanent identity;
- [ ] anonymous Auth is created/reused when the stateful proposal flow needs ownership;
- [ ] owner-scoped guest project exists before persisted proposal writes;
- [ ] selected parcel + canonical intent survive route/locale transitions;
- [ ] guest project/proposal creation is bounded;
- [ ] no insecure fallback occurs when anonymous bootstrap fails.

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

For proposal persistence:

- [ ] canonical persisted geometry remains EPSG:3301;
- [ ] server/PostGIS is authoritative for material geometry metrics;
- [ ] version lifecycle cannot silently overwrite analysis history;
- [ ] a new stored metric/provenance field is added only through a deliberate forward schema change.

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

### Phase 4 proposal/map specifics

- [ ] browser proposal draft is not confused with canonical persisted geometry;
- [ ] browser/API interchange CRS is explicit;
- [ ] client area/perimeter are previews only;
- [ ] server canonicalization computes authoritative area/perimeter from EPSG:3301 geometry;
- [ ] invalid/oversized/out-of-bounds geometry fails safely;
- [ ] geometry repair, if used, follows an explicit tested policy;
- [ ] map point parcel resolution is triggered by explicit user selection, not continuous pointer movement.

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
- [ ] source failure/rate-limit becomes partial/unavailable/unknown rather than no-match where appropriate;
- [ ] `DATA_SOURCES.md` and canonical refresh doc updated.

For public interactive sources, also review server-side rate/burst/request budgets and privacy-safe diagnostics.

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

`DATA_REFRESH_AND_CACHE.md` is the implementation authority; the old versioning-named compatibility file is not.

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

A valid structure/domain code is not itself evidence of verified rule support.

## 10. Phase 4 structure-support gate

If KT-043 or related UI claims a structure/scenario is fully supported:

- [ ] OQ-005 has been resolved from current official law/evidence;
- [ ] the exact supported scenario matrix is documented;
- [ ] support state is separate from valid domain enum/code;
- [ ] required scenario parameters are defined;
- [ ] planned/unsupported types remain visibly unsupported;
- [ ] custom/`Muu` follows an explicit limited-check path;
- [ ] `Muu`/unsupported input cannot fall back to a verified legal/process profile;
- [ ] tests prove the supported/unsupported mapping.

If OQ-005 remains open, the foundation may merge but the supported claim/task cannot be marked complete.

## 11. Phase 4 map-provider gate

If KT-040 is claimed production-ready:

- [ ] OQ-003 has been resolved from current authoritative provider terms/docs;
- [ ] map/style and orthophoto behavior are verified;
- [ ] attribution text/link is implemented;
- [ ] privacy/referrer/token implications are documented;
- [ ] rate/availability/proxy/cache expectations are documented;
- [ ] local/preview/production configuration is explicit;
- [ ] no secret is shipped in the frontend bundle;
- [ ] temporary development tile/style sources are not mislabeled as production.

## 12. Analysis provenance

For material finding/report:

- [ ] exact parcel/proposal snapshot;
- [ ] exact data release/dataset versions;
- [ ] exact rule versions;
- [ ] source evidence;
- [ ] measurements/geometry reproducible;
- [ ] engine/profile/input version stored;
- [ ] completed factual report immutable;
- [ ] AI prose is not required to reconstruct factual result.

## 13. Analysis/cache

If caching changes:

- [ ] key includes all factual compatibility dimensions;
- [ ] data/rule/engine/proposal change invalidates as required;
- [ ] cache cannot leak private metadata cross-user;
- [ ] stale result never masquerades as current;
- [ ] idempotent concurrent requests covered.

If a frontend query/cache library is introduced, it must not conflict with provider/source freshness/cache semantics.

## 14. AI/Gemini

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

## 15. Localization

If user-facing behavior changes:

- [ ] strings use i18n keys rather than scattered hard-coded copy;
- [ ] Estonian canonical copy complete;
- [ ] enabled RU/EN critical keys complete;
- [ ] critical legal/status/payment terms preserve meaning;
- [ ] official Estonian legal/source identity remains traceable;
- [ ] locale switch preserves parcel/project/proposal state and does not rerun deterministic analysis;
- [ ] stable intent/structure/domain codes remain locale-independent;
- [ ] long/cyrillic/mobile layout reviewed;
- [ ] dates/numbers/units formatted correctly.

## 16. UX/accessibility

If user-facing behavior changes:

- [ ] beginner flow does not require GIS expertise unnecessarily;
- [ ] loading/empty/error/unknown/stale states exist;
- [ ] not-found differs from provider unavailable/rate-limited;
- [ ] status is not color-only;
- [ ] keyboard/focus/touch behavior reviewed;
- [ ] mobile layout works;
- [ ] map has textual equivalent for material findings;
- [ ] source/freshness visible for regulatory claims;
- [ ] no wording implies official approval without evidence;
- [ ] target WCAG 2.2 AA for core flow.

For map parcel selection:

- [ ] `Vali krunt kaardilt` is functional;
- [ ] ambiguous parcel selection requires explicit confirmation;
- [ ] source attribution remains visible;
- [ ] map entry/exit preserves useful workflow state.

## 17. Proposal/variant/project history

If proposal/history behavior changes:

- [ ] unpersisted editor draft and persisted proposal version have explicit lifecycle semantics;
- [ ] saving creates the intended version rather than accidentally mutating history;
- [ ] completed-analysis proposal is not mutated;
- [ ] later duplicate creates new scenario/version;
- [ ] comparisons use exact analysis IDs;
- [ ] factual diff excludes AI wording-only changes;
- [ ] newer-data rerun creates new analysis, not rewrite old one.

Phase 4 reusable version primitives do not by themselves complete the later A/B variant workflow.

## 18. Commerce/payment

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

## 19. Sharing/files

If sharing/uploads change:

- [ ] sharing explicit opt-in/revocable;
- [ ] token high entropy and scoped;
- [ ] private notes/files excluded unless selected;
- [ ] shared view noindex/referrer behavior reviewed;
- [ ] uploads private/RLS-protected;
- [ ] MIME/size/parser resource controls;
- [ ] private plan not sent to Gemini without approved privacy decision.

## 20. Analytics/growth

If analytics changes:

- [ ] privacy/legal basis/consent decision documented;
- [ ] no full address/cadastral geometry/email/notes/AI prompt/payment ID sent third-party by default;
- [ ] typed event schema;
- [ ] staging vs production separated;
- [ ] analytics failure cannot block product;
- [ ] experiment cannot alter factual finding/source/critical warning visibility.

## 21. Tests

- [ ] relevant unit tests;
- [ ] adapter fixtures;
- [ ] migration/RLS;
- [ ] GIS regression;
- [ ] Edge Function/API;
- [ ] UI/component where useful;
- [ ] i18n tests where applicable;
- [ ] Auth/commerce/security tests where applicable;
- [ ] critical E2E updated;
- [ ] no normal test depends on public internet/live official provider/live Gemini/live payment.

### Phase 4 real-browser requirement

For map/editor/route state behavior:

- [ ] Playwright runs against production-like built frontend;
- [ ] deterministic backend/map/API fixtures/interception are used;
- [ ] desktop Chromium path covered;
- [ ] mobile viewport path covered;
- [ ] parcel -> overview -> intent -> map/editor route is protected;
- [ ] route/locale state preservation is asserted;
- [ ] pointer/touch behavior is tested where practical;
- [ ] failure diagnostics provide enough trace/screenshot context.

Do not defer the first browser test until final beta hardening.

## 22. CI/build

When scripts/features exist:

- [ ] `npm ci`
- [ ] format check
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] production build
- [ ] clean migrations/RLS
- [ ] relevant Edge/GIS/i18n/Playwright gates

When Playwright foundation exists, Phase 4 critical E2E belongs in PR CI rather than only a manual checklist.

## 23. Documentation

- [ ] API spec updated for contract changes;
- [ ] DB/schema docs updated;
- [ ] source/refresh docs updated;
- [ ] user journey/UX updated where behavior changed;
- [ ] Auth/localization/commerce docs updated where applicable;
- [ ] `PHASE_4_READINESS.md` updated for Phase 4 cross-cutting changes;
- [ ] ADR added/superseded/clarified for architectural decision;
- [ ] environment/deployment docs updated;
- [ ] `TASKS.md` status changed only after verification;
- [ ] `OPEN_QUESTIONS.md` contains only unresolved decisions;
- [ ] an unresolved provider/legal gate has not been silently removed from documentation.

## 24. Observability/supportability

For server/provider features:

- [ ] typed error code;
- [ ] request/source/analysis timing observable;
- [ ] request/correlation ID available for public/server failures where applicable;
- [ ] source/data-release/rule ID available for diagnosis;
- [ ] paid fulfillment observable where applicable;
- [ ] support can identify a failing request/analysis/order without asking user to copy internal raw payload;
- [ ] logs contain no secrets or unnecessary exact address text.

## 25. Legal/trust check

For regulatory/commercial output:

- [ ] current official source reverified when required;
- [ ] source/effective date recorded;
- [ ] uncertainty preserved;
- [ ] product does not overstate legal certainty;
- [ ] official link/disclaimer remains available;
- [ ] partner/advertising relationship cannot alter finding;
- [ ] current price/provider/legal facts are not taken blindly from old documentation;
- [ ] candidate structure label is not presented as legally verified support without the verified scenario matrix.

## 26. Completion evidence

PR/change summary states:

- what was implemented;
- user problem/journey affected;
- tests/checks run;
- migrations;
- source/rule/data versions affected;
- locales tested;
- screenshots for meaningful UI;
- real-browser/E2E scenarios for map/editor changes;
- known limitations/unknowns;
- unresolved gates such as OQ-003/OQ-005 where applicable;
- external current-doc verification when relevant.

“Works on my machine” is not Done.
