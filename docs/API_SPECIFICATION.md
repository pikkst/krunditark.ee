# API Specification — Krunditark

Last contract review: **2026-08-15**

This document defines Krunditark-owned client/server contracts. Physical deployment may use multiple Supabase Edge Functions and RLS-protected Data API calls, but the frontend must not consume provider-specific WFS/EHR/Gemini/payment payloads as product contracts.

## 1. General rules

- JSON over HTTPS for Krunditark application APIs.
- UTF-8.
- external input schema-validated.
- stable typed error codes.
- no stack traces/provider bodies/secrets returned.
- authoritative geometry calculations server/PostGIS-side.
- browser geometry interchange is GeoJSON EPSG:4326 unless explicitly documented.
- persistent authoritative geometry follows EPSG:3301 policy.
- source/data/rule freshness is explicit.
- no ordinary request may trigger national source synchronization.
- expensive state-changing calls support idempotency.
- ownership and entitlements are checked server-side.
- locale changes presentation, not deterministic result.

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

No Auth required for static marketing/help/sample-report content.

### Anonymous authenticated user

Supabase anonymous Auth session. Owns temporary project state under RLS.

Server can detect the anonymous identity through verified Auth/JWT claims; do not trust a client boolean.

### Permanent authenticated user

Email OTP/Google-linked account.

Required for:

- durable cross-device saved work;
- purchases/orders;
- monitoring/notifications;
- professional/organization features.

### Admin/server

Explicit server-side role/credential path only.

## 3. Core error codes

### Input/search

- `VALIDATION_ERROR`
- `INVALID_CADASTRAL_ID`
- `ADDRESS_QUERY_INVALID`
- `ADDRESS_NOT_FOUND`
- `ADDRESS_SEARCH_UNAVAILABLE`
- `PARCEL_NOT_FOUND`
- `PARCEL_SELECTION_AMBIGUOUS`

### Source/data

- `SOURCE_TIMEOUT`
- `SOURCE_UNAVAILABLE`
- `SOURCE_RESPONSE_INVALID`
- `SOURCE_STALE`
- `DATA_RELEASE_UNAVAILABLE`
- `DATA_RELEASE_INCOMPLETE`

### Proposal/analysis

- `PROPOSAL_GEOMETRY_INVALID`
- `PROPOSAL_OUTSIDE_SUPPORTED_AREA`
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

Do not return `*_NOT_FOUND` when the relevant source request actually failed.

## 4. Address search

### `GET /addresses/search?q=<query>&limit=<n>`

Public or anonymous-safe endpoint according to final In-AKS integration architecture.

Purpose: normalized official address/place/object autocomplete.

Example:

```json
{
  "data": [
    {
      "id": "source-scoped-id",
      "label": "Pärnu mnt 10, Tallinn",
      "objectType": "address",
      "coordinates": {
        "lat": 59.0,
        "lon": 24.0
      },
      "source": {
        "id": "maru.inaks",
        "authority": "Maa- ja Ruumiamet"
      }
    }
  ],
  "meta": {
    "requestId": "uuid"
  }
}
```

Rules:

- normalized bounded query length;
- debounce on client;
- short-cache per source policy;
- unavailable != no matches;
- raw In-AKS provider response not exposed as stable UI contract.

## 5. Parcel candidate resolution

### `POST /parcels/resolve`

Request may contain exactly one supported selector:

```json
{
  "cadastralId": "12345:678:9012"
}
```

or

```json
{
  "addressResultId": "source-scoped-id"
}
```

or map selection:

```json
{
  "point": {
    "type": "Point",
    "coordinates": [24.75, 59.43]
  }
}
```

Response may contain one or several candidates:

```json
{
  "data": {
    "status": "ambiguous",
    "candidates": [
      {
        "cadastralId": "12345:678:9012",
        "address": "...",
        "areaM2": 12000,
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": []
        },
        "source": {
          "id": "maru.cadastre",
          "datasetVersionId": "uuid",
          "retrievedAt": "..."
        }
      }
    ]
  },
  "meta": { "requestId": "uuid" }
}
```

The client must ask user to choose when `status=ambiguous`.

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
  }
}
```

Do not construct a misleading free “all clear” from a deliberately reduced subset.

## 8. Projects

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

Server:

- validates ownership of Auth session, not parcel ownership;
- resolves/attaches current eligible parcel snapshot;
- stores owner as current `auth.uid()`;
- applies guest limits if `is_anonymous=true`.

### `GET /projects`

Permanent user by default; guest current-project retrieval may use a separate bounded path.

### `GET /projects/:projectId`

Owner only.

### `PATCH /projects/:projectId`

Editable project metadata only.

Do not mutate historical analysis/proposal facts.

### `DELETE /projects/:projectId`

Owner only, subject to documented retention/accounting constraints.

## 9. Intent codes

Stable domain values may include:

```text
build
purchase_check
understand_parcel
modify_existing_building
professional
```

Support status is separate from the code. A known intent can return `ANALYSIS_SCOPE_UNSUPPORTED` for a not-yet-implemented workflow.

## 10. Proposals

### `POST /projects/:projectId/proposals`

Creates a new proposal version.

Request:

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
  "lengthM": 8,
  "sourceTemplateId": "sauna-6x8"
}
```

Input geometry EPSG:4326.

Server:

1. validates schema;
2. transforms to canonical CRS;
3. validates topology/bounds/resource limits;
4. computes authoritative metrics;
5. creates immutable proposal version.

### `POST /projects/:projectId/proposals/:proposalId/duplicate`

Creates a new version/scenario from exact prior proposal for variant testing.

Optional request modifications may be accepted if server revalidates them.

Do not update proposal geometry in-place if referenced by a completed analysis.

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
3. validates proposal;
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

Rendered localized labels are preferably generated from stable codes/client translation catalogs, while dynamic Gemini explanation is a separate resource.

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

## 31. Rate limits

Especially:

- address autocomplete/parcel lookup;
- anonymous project creation;
- analysis creation;
- AI explanation/questions;
- checkout creation;
- uploads;
- future batch/API.

Return `429` + typed error/safe retry info.

Rate limit state does not become source “not found”.

## 32. API versioning

Internal MVP contracts use:

- typed schema versions;
- `analysisProfileVersion`;
- `engineVersion`;
- data/rule versions.

External B2B consumers require explicit `/v1` or equivalent before launch.

## 33. API security acceptance

- anonymous user cannot access another guest's project;
- permanent user cannot access another user's project/report/order;
- client cannot set admin role;
- client cannot force source refresh;
- client cannot select arbitrary source URL;
- client cannot set paid amount or grant entitlement;
- invalid payment webhook rejected;
- share token is only valid for explicit shared scope;
- raw source/Gemini/payment secrets are never returned.
