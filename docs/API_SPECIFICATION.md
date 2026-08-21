# API Specification — Krunditark

Last contract review: **2026-08-21**

This document defines Krunditark-owned client/server contracts. Physical deployment may use multiple Supabase Edge Functions and RLS-protected Data API calls, but the frontend must not consume provider-specific WFS/EHR/Gemini/payment payloads as product contracts.

ADR 0009 and `PHASE_4_READINESS.md` define the Phase 4 browser-draft / anonymous-owner / canonical-persistence boundary.

## 1. General rules

- JSON over HTTPS for Krunditark application APIs.
- UTF-8.
- external input is runtime validated; no particular schema library is mandatory.
- stable typed error codes.
- no stack traces/provider bodies/secrets returned.
- authoritative geometry calculations server/PostGIS-side.
- browser geometry interchange is GeoJSON EPSG:4326 unless explicitly documented.
- persistent authoritative parcel/proposal geometry follows EPSG:3301 policy.
- source/data/rule freshness is explicit.
- no ordinary request may trigger national source synchronization.
- expensive/state-changing calls support idempotency where retries could duplicate effects.
- ownership and entitlements are checked server-side.
- locale changes presentation, not deterministic result.
- public/server APIs generate or propagate a request/correlation ID suitable for support diagnostics.

Example envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "locale": "et"
  }
}
```

Example error:

```json
{
  "error": {
    "code": "SOURCE_UNAVAILABLE",
    "message": "Ametlik andmeallikas ei ole hetkel kättesaadav.",
    "retryable": true
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

User-facing error text may be localized client-side by code; do not make changing server prose part of the permanent contract where a stable code is sufficient.

## 2. Authentication classes

### Public

No permanent Auth is required for:

- static marketing/help/sample-report content;
- allowed address/cadastral/map parcel discovery;
- bounded free parcel overview.

### Anonymous authenticated user

Supabase anonymous Auth session. Owns temporary project/proposal state under RLS.

Phase 4 creates/reuses this identity when the user enters a **stateful proposal workflow**, not merely because they opened the landing page.

Server detects the anonymous identity through verified Auth/JWT claims; never trust a client boolean.

Anonymous Auth is not a permanent account/signup wall.

### Permanent authenticated user

Email OTP/Google-linked account.

Required later for:

- durable cross-device saved work;
- purchases/orders;
- monitoring/notifications;
- professional/organization features.

### Admin/server

Explicit server-side role/credential path only.

Service-role credentials never replace normal owner RLS for browser project/proposal writes.

## 3. Core error codes

### Input/search

- `VALIDATION_ERROR`
- `INVALID_INPUT`
- `INVALID_CADASTRAL_ID`
- `ADDRESS_QUERY_INVALID`
- `ADDRESS_NOT_FOUND`
- `ADDRESS_SEARCH_UNAVAILABLE`
- `PARCEL_NOT_FOUND`
- `PARCEL_SELECTION_AMBIGUOUS`
- `RATE_LIMITED`

### Source/data

- `SOURCE_TIMEOUT`
- `SOURCE_UNAVAILABLE`
- `SOURCE_RESPONSE_INVALID`
- `SOURCE_STALE`
- `UPSTREAM_ERROR`
- `DATA_RELEASE_UNAVAILABLE`
- `DATA_RELEASE_INCOMPLETE`

### Proposal/analysis

- `PROPOSAL_GEOMETRY_INVALID`
- `PROPOSAL_OUTSIDE_SUPPORTED_AREA`
- `PROPOSAL_RESOURCE_LIMIT`
- `ANALYSIS_SCOPE_UNSUPPORTED`
- `ANALYSIS_IN_PROGRESS`
- `ANALYSIS_FAILED`
- `RULESET_UNAVAILABLE`

### Auth/access

- `UNAUTHORIZED`
- `FORBIDDEN`
- `PERMANENT_ACCOUNT_REQUIRED`
- `AUTH_IDENTITY_LINK_FAILED`
- `NOT_FOUND`

### AI

- `AI_UNAVAILABLE`
- `AI_OUTPUT_INVALID`

### Commerce — when enabled

- `ORDER_NOT_PAYABLE`
- `PAYMENT_PENDING`
- `PAYMENT_FAILED`
- `PAYMENT_EVENT_INVALID`
- `ENTITLEMENT_REQUIRED`
- `ENTITLEMENT_EXPIRED`
- `USAGE_LIMIT_REACHED`
- `FULFILLMENT_FAILED`

Do not return `*_NOT_FOUND` when the relevant source request actually failed, timed out or was rate limited.

## 4. Address search

### `GET /functions/v1/address-search?q=<query>` or `?adrid=<id>`

Public/anonymous-safe Supabase Edge Function proxy for official In-AKS Gazetteer API.

Purpose: normalized official address/place/object candidate search.

Request parameters:

- `q` — free-text address search query (max 256 characters)
- `adrid` — exact address version identifier lookup (digits only)

Exactly one of `q` or `adrid` must be provided.

Success response is parsed/normalized by the Krunditark client boundary into `AddressSearchResult[]`; provider-specific fields must not become UI/domain contracts.

Rules:

- normalized bounded query length;
- **submit-driven**: frontend triggers one search only on explicit user submit (`Otsi`/Enter), not on typing;
- minimum query length **3 characters** for free-text address search;
- short-cache per source policy (free-text 1h, exact `adrid` 24h, negative 5min unless later source policy changes it);
- explicit upstream timeout/resource budget;
- server-side request/rate budget; frontend behavior alone is not abuse protection;
- unavailable/rate-limited/timeout != no matches;
- request/correlation ID available on success and failure;
- routine logs do not store the full user-entered address by default.

Error codes include:

- `INVALID_INPUT`
- `ADDRESS_SEARCH_UNAVAILABLE`
- `SOURCE_TIMEOUT`
- `UPSTREAM_ERROR`
- `SOURCE_RESPONSE_INVALID` / parser-equivalent stable error
- `RATE_LIMITED`
- `NETWORK_ERROR` at the browser client boundary when the Edge Function itself cannot be reached.

## 5. Parcel candidate resolution

### `POST /functions/v1/parcel-resolve`

Public Supabase Edge Function for parcel resolution. Request body contains exactly one selector.

Cadastral:

```json
{
  "selector": { "type": "cadastral", "cadastralId": "12345:678:9012" }
}
```

Address:

```json
{
  "selector": { "type": "address", "addressResultId": "inaks-0", "addressId": "1234567890" }
}
```

Map selection:

```json
{
  "selector": { "type": "point", "point": { "lat": 59.437, "lng": 24.753 } }
}
```

Point selector coordinates are **WGS84 latitude/longitude**. Browser pointer movement does not continuously call the resolver; an explicit click/selection action triggers resolution.

Response uses a shared resolution contract:

```json
{
  "status": "ambiguous",
  "candidates": [
    {
      "id": "CP:12345:678:9012",
      "cadastralId": "123456789012",
      "geometry": {
        "type": "Polygon",
        "coordinates": []
      },
      "geometryCrs": "EPSG:3301",
      "facts": {
        "areaM2Computed": 12000,
        "addressText": "..."
      },
      "source": {
        "sourceId": "maru.cadastre.parcels.inspire",
        "sourceDatasetVersionId": "2026-08-16",
        "sourceSyncRunId": "edge-sync-123",
        "sourceObjectId": "...",
        "normalizerVersion": "1",
        "retrievedAt": "...",
        "sourceEffectiveAt": "..."
      },
      "freshnessState": "fresh",
      "contentHash": "..."
    }
  ],
  "meta": {
    "requestId": "uuid"
  }
}
```

Resolution states:

- `resolved` — exactly one valid candidate.
- `ambiguous` — multiple valid candidates; UI must ask user to choose.
- `not_found` — successful source resolution produced no valid candidate.
- `unavailable` — upstream unreachable/timeout/degraded.
- `invalid_source` — upstream returned data but validation failed.

Rules:

- validates selector exactly-one invariant;
- cadastral path normalizes to a 12-digit string and queries the approved MaRu parcel source in EPSG:3301;
- address path resolves the selected official address object and then candidate cadastral units;
- point path projects WGS84 to EPSG:3301 server-side and performs the approved spatial parcel query;
- bounded counts/timeouts/retries;
- provider rate-limit response must not cause an unbounded retry storm;
- validates expected source CRS before constructing canonical candidates;
- never silently drops invalid features in a way that changes ambiguity semantics;
- map ambiguity requires explicit confirmation.

## 6. Parcel lookup

### `GET /parcels/:cadastralId`

Purpose: stable normalized parcel representation.

Example:

```json
{
  "data": {
    "cadastralId": "12345:678:9012",
    "address": "...",
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": []
    },
    "areaM2": 12000,
    "facts": {},
    "source": {
      "id": "maru.cadastre",
      "authority": "Maa- ja Ruumiamet",
      "datasetVersionId": "uuid",
      "retrievedAt": "2026-08-01T...Z",
      "sourceUpdatedAt": null,
      "officialUrl": "https://..."
    }
  },
  "meta": { "requestId": "uuid" }
}
```

This endpoint does not prove ownership.

## 7. Free parcel overview

### `GET /parcels/:cadastralId/overview`

Purpose: bounded free/guest-safe product view.

May return:

- parcel facts;
- existing supported building summary when available;
- data freshness;
- supported analysis categories;
- explicitly unsupported categories;
- no final full Ehituspass conclusion unless the product deliberately grants that analysis.

Example:

```json
{
  "data": {
    "parcel": {},
    "coverage": [
      {
        "category": "planning",
        "status": "supported",
        "dataDate": "2026-08-01"
      },
      {
        "category": "utility_capacity",
        "status": "not_supported"
      }
    ]
  },
  "meta": { "requestId": "uuid" }
}
```

Do not construct a misleading free “all clear” from a deliberately reduced subset.

## 8. Projects

### Phase 4 project bootstrap

The application does not need to create a project during passive/public parcel search.

When a user chooses a **stateful proposal flow**:

1. create/reuse Supabase anonymous Auth if no suitable Auth session exists;
2. create/reuse an owner-scoped guest project;
3. persist/reference the exact selected parcel and stable intent code;
4. continue proposal editing under normal owner RLS.

No permanent email/Google account is required at this point.

### `POST /projects`

Anonymous or permanent authenticated user.

Request:

```json
{
  "name": "Saunaprojekt",
  "cadastralId": "12345:678:9012",
  "intent": "build"
}
```

Server/data layer:

- uses current verified Auth identity;
- never treats parcel selection as ownership proof;
- resolves/attaches the current eligible parcel snapshot/reference as implemented;
- stores owner as current `auth.uid()`;
- applies guest limits if `is_anonymous=true`;
- rejects unsupported/legacy intent values rather than silently choosing another intent.

### `GET /projects`

Permanent user by default for dashboard/history. A guest current-project retrieval path may be bounded to the anonymous user's own project(s).

### `GET /projects/:projectId`

Owner only.

### `PATCH /projects/:projectId`

Editable project metadata/intent only as explicitly allowed.

Do not mutate historical proposal/analysis facts.

### `DELETE /projects/:projectId`

Owner only, subject to documented retention/accounting constraints.

## 9. Intent codes

Canonical stable domain/database values are exactly:

```text
build
pre_purchase
understand_parcel
existing_building_modification
professional
```

Support status is separate from identity.

Current product meaning:

- `build` — active proposal workflow;
- `understand_parcel` — supported parcel-understanding context;
- `pre_purchase` — known/planned buyer flow;
- `existing_building_modification` — known/planned separate scenario profile;
- `professional` — context marker/future professional flow, not a fallback legal profile.

Legacy/documentation aliases such as `purchase_check` or `modify_existing_building` are **not canonical persisted values**. If an external compatibility boundary ever accepts an alias, it must normalize explicitly and be tested; otherwise reject it with a typed validation error.

Translated labels never become persisted intent identifiers.

## 10. Proposal contracts

### 10.1 Browser/editor draft

The mutable Phase 4 editor draft is **not** the canonical persisted `Proposal` object.

Conceptual request shape:

```json
{
  "structureType": "sauna",
  "intendedUse": "private_auxiliary",
  "footprint": {
    "type": "Polygon",
    "coordinates": []
  },
  "heightM": 4.8,
  "storeys": 1,
  "widthM": 6,
  "lengthM": 8
}
```

Browser `footprint` interchange is EPSG:4326 unless an endpoint explicitly states otherwise.

A beginner template ID such as `sauna-6x8` is Phase 4 UI convenience metadata only. It is **not** required in the authoritative proposal request/persistence contract and no rule/analysis may depend on it.

### 10.2 Validate/canonicalize a draft

Recommended Phase 4 application endpoint:

### `POST /projects/:projectId/proposals/validate`

Owner only (anonymous or permanent).

Purpose: authoritative validation/canonicalization without creating a persisted proposal version.

Server:

1. validates request structure and bounded numeric/text/resource limits;
2. validates/normalizes the selected structure/support context;
3. transforms browser geometry into EPSG:3301;
4. validates topology/bounds;
5. applies any geometry repair only under an explicit documented policy;
6. computes authoritative area/perimeter in metric CRS;
7. returns canonical preview geometry/metrics and typed errors/warnings.

Conceptual response:

```json
{
  "data": {
    "valid": true,
    "canonical": {
      "geometry": {
        "type": "Polygon",
        "coordinates": []
      },
      "geometryCrs": "EPSG:3301",
      "areaM2": 48.0,
      "perimeterM": 28.0
    },
    "errors": [],
    "warnings": []
  },
  "meta": { "requestId": "uuid" }
}
```

`perimeterM` does not require a persisted database column in Phase 4 if it is deterministically derived from canonical geometry when needed. If later persistence of perimeter becomes a requirement, add it through a forward schema change.

### 10.3 Persist a proposal version

### `POST /projects/:projectId/proposals`

Owner only (anonymous or permanent).

Creates a **new persisted proposal version** after the same authoritative validation/canonicalization rules succeed.

Server/PostGIS values win over any client preview values.

Conceptual response:

```json
{
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "version": 1,
    "structureType": "sauna",
    "geometry": {
      "type": "Polygon",
      "coordinates": []
    },
    "geometryCrs": "EPSG:3301",
    "facts": {
      "areaM2": 48.0,
      "heightM": 4.8,
      "storeys": 1,
      "widthM": 6,
      "lengthM": 8
    },
    "computed": {
      "perimeterM": 28.0
    },
    "createdAt": "..."
  },
  "meta": { "requestId": "uuid" }
}
```

Lifecycle:

- unpersisted editor draft may change freely;
- saving creates a proposal version;
- later edits of a persisted scenario create another version when saved under the canonical lifecycle;
- a proposal referenced by terminal/completed analysis is never mutated in place;
- app code should not depend on direct UPDATE semantics merely because RLS/table grants technically permit them.

### 10.4 Variant duplicate — later workflow

### `POST /projects/:projectId/proposals/:proposalId/duplicate`

Reserved for the later variant workflow.

Creates a new version/scenario from the exact prior proposal and revalidates any requested modifications.

Phase 4 may implement reusable version primitives, but must not claim A/B variant comparison is complete before the later variant tasks.

## 11. Analysis creation

### `POST /analyses`

Anonymous or permanent authenticated depending current product/entitlement policy.

Header:

```text
Idempotency-Key: <high-entropy-key>
```

Request:

```json
{
  "projectId": "uuid",
  "proposalId": "uuid",
  "analysisProfile": "consumer-build-v1"
}
```

**There is no user-controlled `refreshPolicy`.** Normal analysis uses the current eligible promoted Krunditark data/rule release.

Server:

1. verifies owner/auth;
2. verifies free/paid entitlement if applicable;
3. validates exact persisted proposal/version;
4. selects exact eligible `dataReleaseId` and rule-set manifest;
5. tries safe compatible analysis cache;
6. otherwise runs PostGIS/rules;
7. persists immutable result.

Response:

```json
{
  "data": {
    "analysisId": "uuid",
    "status": "preparing",
    "dataReleaseId": "uuid"
  },
  "meta": { "requestId": "uuid" }
}
```

## 12. Analysis result

### `GET /analyses/:analysisId`

Owner or explicitly authorized share context only.

Example:

```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "analysisProfileVersion": "consumer-build-v1",
    "engineVersion": "2026.08.1",
    "dataRelease": {
      "id": "uuid",
      "releasedAt": "2026-08-01T03:30:00Z"
    },
    "ruleSetManifestId": "uuid",
    "createdAt": "...",
    "completedAt": "...",
    "parcel": {
      "cadastralId": "12345:678:9012",
      "snapshotId": "uuid"
    },
    "proposal": {
      "id": "uuid",
      "version": 2,
      "structureType": "sauna",
      "areaM2": 48
    },
    "overall": {
      "state": "condition"
    },
    "sourceCompleteness": [],
    "findings": [],
    "nextActions": []
  },
  "meta": { "requestId": "uuid" }
}
```

Rendered localized labels are generated from stable codes/client translation catalogs where possible. Dynamic Gemini explanation is a separate resource.

## 13. Finding contract

Conceptual:

```json
{
  "id": "uuid",
  "code": "ROAD_PROTECTION_ZONE_INTERSECTION",
  "category": "road",
  "state": "condition",
  "severity": "high",
  "titleKey": "finding.road.protectionZoneIntersection.title",
  "structuredDetails": {
    "intersectionAreaM2": 3.2
  },
  "nextAction": {
    "code": "VERIFY_WITH_TRANSPORT_AUTHORITY",
    "labelKey": "nextAction.verifyWithTransportAuthority"
  },
  "evidence": [
    {
      "type": "geometry",
      "sourceId": "transport.road-zones",
      "sourceDatasetVersionId": "uuid",
      "sourceObjectId": "...",
      "officialUrl": "https://...",
      "measurement": {
        "intersectionAreaM2": 3.2
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": []
      }
    }
  ],
  "rule": {
    "code": "...",
    "version": 2,
    "effectiveFrom": "2026-08-01",
    "legalSources": []
  }
}
```

No material factual relationship may exist only in translated prose.

See issue #31 before Phase 8 authoritative persistence if the domain/database Finding mapping remains inconsistent.

## 14. Completeness/freshness

Category completeness:

```text
complete_for_supported_scope
partial
unavailable
not_supported
```

Source health/result separately:

```text
current
stale_warning
stale_critical
carried_forward
unavailable
```

A report date is not the same as underlying data date.

## 15. Analysis variants comparison

### `GET /projects/:projectId/analysis-comparison?analysisIds=a,b`

Owner only.

Response is deterministic factual diff:

```json
{
  "data": {
    "analyses": ["a", "b"],
    "summary": {
      "conflictCount": [1, 0],
      "conditionCount": [2, 1],
      "unknownCount": [1, 1]
    },
    "changes": [
      {
        "findingCode": "POWER_ZONE_INTERSECTION",
        "fromState": "conflict",
        "toState": null,
        "reason": "geometry_no_longer_intersects"
      }
    ]
  }
}
```

Do not return an opaque AI-generated ranking score.

## 16. Analysis history / newer data

### `GET /projects/:projectId/analyses`

Cursor-paginated immutable history.

### `GET /projects/:projectId/freshness`

May return:

```json
{
  "data": {
    "latestAnalysisId": "uuid",
    "latestAnalysisDataReleaseId": "uuid-old",
    "currentDataReleaseId": "uuid-new",
    "newerDataAvailable": true,
    "currentVerifiedRuleSetChanged": true
  }
}
```

This does not mutate/rerun old report automatically.

## 17. Gemini explanations

### `POST /analyses/:analysisId/explanations`

Authenticated/authorized report user.

Request:

```json
{
  "mode": "summary",
  "locale": "et"
}
```

or finding-specific:

```json
{
  "mode": "finding",
  "findingId": "uuid",
  "locale": "ru"
}
```

Server:

- verifies access;
- resolves deterministic analysis;
- checks explanation cache by result/locale/model/prompt/schema;
- calls Gemini only on miss;
- validates output;
- falls back to deterministic localized template.

Response:

```json
{
  "data": {
    "status": "generated",
    "text": "...",
    "findingIds": ["uuid"],
    "sourceIds": ["..."],
    "generatedAt": "..."
  }
}
```

## 18. Ask Krunditark

### `POST /analyses/:analysisId/questions`

Late-core/post-core.

Request:

```json
{
  "question": "Miks see piirang minu sauna puudutab?",
  "locale": "et"
}
```

Answer must reference only approved analysis/source evidence and identify limitations.

## 19. User-safe source details

### `GET /analyses/:analysisId/sources`

Returns:

- authority;
- source/layer title;
- official URL;
- dataset/version;
- source effective/update metadata;
- Krunditark sync/release date;
- health/freshness state;
- categories informed.

Never return provider auth headers/internal credentials/raw unrestricted payloads.

## 20. Large evidence geometry

### `GET /analyses/:analysisId/findings/:findingId/evidence`

Owner/share authorized.

Return simplified/appropriate browser geometry and measurements.

No arbitrary spatial query parameters in consumer API.

## 21. Ostukontroll — future

### `POST /purchase-checks`

Permanent/anonymous according to product entitlement design.

Request:

```json
{
  "projectId": "uuid",
  "analysisProfile": "purchase-check-v1"
}
```

No proposal ID required.

Same data-release/provenance principles apply.

## 22. Existing building — future

### `GET /projects/:projectId/buildings`

Returns supported normalized EHR current-building summaries for project parcel.

Raw EHR payload/document access is not exposed by default.

### `POST /projects/:projectId/existing-building-scenarios`

Requires a separately supported scenario profile; do not route silently through new-building rules.

## 23. Account

Supabase handles Auth transport/session.

Krunditark application endpoints may include:

### `GET /account`

Safe profile/preferences/account state.

### `PATCH /account`

Only user-editable fields such as display name/language/notification preferences.

No role/entitlement elevation.

### `DELETE /account`

Starts controlled deletion workflow rather than blindly deleting records that may have justified accounting/security retention.

## 24. Commerce — future paid launch

See `COMMERCE_AND_ENTITLEMENTS.md`.

### `GET /products`

Returns current user-safe product/pricing catalog for locale/currency context.

### `POST /orders`

Permanent account required.

Request:

```json
{
  "productCode": "EHITUSPASS_SINGLE",
  "projectId": "uuid",
  "proposalId": "uuid"
}
```

Client does **not** send authoritative amount.

Server resolves current price and returns order.

### `POST /orders/:orderId/checkout`

Header `Idempotency-Key`.

Creates checkout with selected provider server-side.

### `GET /orders/:orderId`

Owner only; returns Krunditark domain payment/fulfillment state.

### Provider webhook

Provider-specific path such as:

```text
POST /webhooks/payments/<provider>
```

Not authenticated by Supabase user session; authenticated by exact provider webhook signature/auth scheme.

Webhook:

- verifies raw request/signature;
- dedupes provider event ID;
- validates order/amount/currency;
- transactionally updates payment/order/entitlement;
- never trusts browser redirect.

### `POST /orders/:orderId/refund-request`

Optional user support request, not automatically provider refund.

Admin/provider refund path remains server controlled/audited.

## 25. Entitlement checks

Analysis endpoint may return:

```json
{
  "error": {
    "code": "ENTITLEMENT_REQUIRED",
    "requiredProducts": ["EHITUSPASS_SINGLE", "PROJECT_PASS_90D"]
  }
}
```

Frontend may use this to show product/paywall.

Server remains authority.

## 26. Project Pass — future

Entitlement server checks:

- scope matches project;
- time active;
- usage/variant/analysis limits;
- retries/technical failures do not double-consume;
- expired pass still permits historical report reading.

## 27. Sharing — future

### `POST /analyses/:analysisId/share-links`

Owner, permanent account.

Creates high-entropy revocable link with scope/expiry.

### `DELETE /share-links/:id`

Revokes.

### Public shared report route

Uses share token, not predictable report ID alone.

Must exclude private notes/files by default and be `noindex` at web layer.

## 28. Notifications — future

### `GET/PATCH /account/notification-preferences`

Non-mandatory notifications configurable.

Mandatory security/payment service notices follow legal/product rules.

Project change notification is only strong/material after deterministic impact is computed.

## 29. Professional/B2B API — future

Do not expose current internal consumer routes as a permanent external contract accidentally.

Before external B2B consumers:

- ADR;
- explicit `/v1` namespace;
- organization/API credentials;
- usage metering;
- quotas;
- batch jobs;
- signed webhooks;
- source attribution/terms.

## 30. Pagination

Cursor pagination for growing collections:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque-or-null"
  }
}
```

Do not make database offsets part of permanent contract unless intentionally approved.

## 31. Rate limits and public request budgets

Especially:

- address search;
- cadastral/map parcel resolution;
- anonymous project creation;
- proposal validation/persistence;
- analysis creation;
- AI explanation/questions;
- checkout creation;
- uploads;
- future batch/API.

Return `429` + typed error/safe retry info where appropriate.

Rate limit state does not become source `not_found`.

For public parcel discovery:

- frontend submit/click behavior reduces normal traffic but is not enforcement;
- server-side burst/sustained budgets are required before high-volume public use;
- logs should contain request ID, source/function, status, duration and safe error code without routinely logging full addresses.

## 32. API versioning

Internal MVP contracts use:

- typed schema versions where needed;
- `analysisProfileVersion`;
- `engineVersion`;
- data/rule versions.

External B2B consumers require explicit `/v1` or equivalent before launch.

## 33. Parcel resolution Edge Function implementation notes

### `POST /functions/v1/parcel-resolve`

- accepts JSON body with exactly one selector: `cadastral`, `address`, or `point`;
- SSRF-safe upstream host allow-list;
- CORS for documented browser origins/policy;
- bounded request timeout/retry/result count;
- expected FeatureCollection/source CRS validation before parsing candidates;
- returns canonical `Parcel` candidates with provenance/freshness;
- address path resolves approved In-AKS objects to cadastral candidates;
- point path projects WGS84 to EPSG:3301 server-side and uses an approved spatial parcel query;
- point selection is explicit-click driven, not pointer-move driven;
- application-level public request budgets/correlation are required as Phase 4 traffic expands.

## 34. API security acceptance

- public visitor can access only explicitly public parcel-discovery/free-overview behavior;
- anonymous user cannot access another guest's project/proposals;
- permanent user cannot access another user's project/report/order;
- Phase 4 browser never uses service-role credentials to create owner state;
- client cannot set admin role;
- client cannot force source refresh;
- client cannot select arbitrary source URL;
- client cannot decide authoritative proposal area/perimeter/CRS;
- client cannot set paid amount or grant entitlement;
- invalid payment webhook rejected;
- share token is only valid for explicit shared scope;
- raw source/Gemini/payment secrets are never returned;
- provider timeout/rate failure cannot be converted into a successful empty/no-risk result.
