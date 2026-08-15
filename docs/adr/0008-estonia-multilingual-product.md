# ADR 0008 — Estonia multilingual product architecture

Status: **Accepted**

Date: **2026-08-15**

## Context

Krunditark is Estonia-only initially, but a substantial part of the Estonian market uses Russian and English in addition to Estonian. Construction/property decisions also involve foreign residents, buyers and professionals.

Legal source truth, however, is normally the official Estonian legal text.

## Decision

- Estonian (`et`) is the canonical/default product and legal terminology locale.
- The frontend/i18n architecture supports `et`, `ru`, and `en` from the first implementation.
- Russian and English are full product-localization targets, not only AI translation modes.
- Critical legal/status/payment/privacy copy is controlled/reviewed in translation catalogs.
- Domain codes, geometries, measurements, source IDs and rule states remain language-independent.
- Official Estonian legal sources remain visible/traceable in every locale.
- Gemini may generate localized explanations from structured findings but cannot replace reviewed fixed terminology or reinterpret the rule.
- A locale is only exposed in production once its critical journey is complete and QA-reviewed.

## Consequences

- UI strings are keyed from the start.
- Report/PDF/email/auth/payment copy must be locale-aware.
- Locale switch preserves project/analysis state and does not rerun deterministic analysis.
- Explanation cache key includes locale.
- Cyrillic rendering/layout tests are required.

## Rejected alternatives

### Estonian-only architecture with later translation refactor

Rejected because localization touches routing, messages, reports, email/payment flows and persistence; retrofitting it would create unnecessary debt.

### Runtime machine translation for all copy

Rejected for critical legal/status/payment/privacy terminology because wording consistency and user trust require controlled translations.

## References

- `docs/LOCALIZATION_AND_LANGUAGE.md`
- `docs/UX_UI_SPEC.md`
