# API Specification — Krunditark

This document defines the client-facing contract. The physical implementation may use one or more Supabase Edge Functions, but the frontend must consume stable Krunditark domain contracts rather than provider-specific payloads.

## 1. General API rules

- JSON over HTTPS.
- UTF-8.
- Validate every external request.
- Use typed error codes.
- Do not leak upstream response bodies, stack traces or secrets.
- Authenticated endpoints accept Supabase Auth bearer session according to approved SDK flow.
- Expensive analysis creation supports idempotency.
- Geometry sent to browser uses GeoJSON in EPSG:4326 unless explicitly documented otherwise.
- Authoritative persisted geometry uses the server/database CRS policy.
- Normal user requests read promoted internal source/data releases; they do not trigger bulk national-source refresh.

Example response envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

Example error:

```json
{
  "error": {
    "code": "DATA_RELEASE_UNAVAILABLE",
    "message": "Kontrollitud andmeversioon ei ole hetkel analüüsiks saadaval.",
    "retryable": true
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

## 2. Error codes

Required base codes:

- `VALIDATION_ERROR`
- `INVALID_CADASTRAL_ID`
- `PARCEL_NOT_FOUND`
- `SOURCE_TIMEOUT`
- `SOURCE_UNAVAILABLE`
- `SOURCE_RESPONSE_INVALID`
- `SOURCE_STALE`
- `SOURCE_SYNC_FAILED`
- `DATA_RELEASE_UNAVAILABLE`
- `DATA_RELEASE_INCOMPLETE`
- `PROPOSAL_GEOMETRY_INVALID`
- `PROPOSAL_OUTSIDE_SUPPORTED_AREA`
- `ANALYSIS_SCOPE_UNSUPPORTED`
- `ANALYSIS_IN_PROGRESS`
- `ANALYSIS_FAILED`
- `RULESET_UNAVAILABLE`
- `AI_UNAVAILABLE`
- `RATE_LIMITED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

Do not use `PARCEL_NOT_FOUND` when the active data release/source state cannot establish a reliable not-found result.

## 3. Parcel lookup

### `GET /parcel/:cadastralId`

Purpose: resolve one cadastral parcel into a stable Krunditark representation from the latest eligible promoted data release, unless the cadastral source is explicitly configured as a justified live lookup during a transitional implementation phase.

Example response:

```json
{
  "data": {
    "cadastralId": "12345:678:9012",
    "address": "Example address",
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": []
    },
    "areaM2": 12000,
    "facts": {},
    "dataRelease": {
      "id": "uuid",
      "key": "2026-09-01.1",
      "promotedAt": "2026-09-01T05:00:00Z"
    },
    "source": {
      "id": "maru.cadastre.parcels",
      "datasetVersionId": "uuid",
      "authority": "Maa- ja Ruumiamet",
      "retrievedAt": "2026-09-01T03:20:00Z",
      "sourceUpdatedAt": null,
      "freshnessState": "fresh",
      "carriedForward": false,
      "officialUrl": "https://..."
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

Requirements:

- cadastral ID normalized server-side;
- source payload not exposed directly;
- geometry valid GeoJSON;
- source dataset version and freshness metadata required;
- a lookup today must not claim the source was “checked today” if the promoted dataset was retrieved earlier.

## 4. Projects

### `GET /projects`

Authenticated.

Returns current user's saved projects.

### `POST /projects`

Authenticated.

Request:

```json
{
  "name": "Saunaprojekt",
  "cadastralId": "12345:678:9012"
}
```

Server resolves/attaches a parcel snapshot through the latest eligible promoted data release.

### `GET /projects/:projectId`

Authenticated owner only.

### `PATCH /projects/:projectId`

Only editable metadata such as name/archive state. Do not mutate historical analysis facts.

### `DELETE /projects/:projectId`

Owner only, subject to documented deletion/retention behavior.

## 5. Proposals

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
  "lengthM": 8
}
```

Input footprint GeoJSON is EPSG:4326.

Server:

1. validates GeoJSON;
2. transforms to canonical CRS;
3. validates geometry/topology;
4. computes authoritative area/perimeter;
5. applies resource limits;
6. persists proposal version.

Response includes computed metrics and proposal version.

### `POST /projects/:projectId/proposals/:proposalId/supersede`

Optional implementation pattern for explicit new version creation. Prefer new immutable proposal version over mutating a proposal referenced by completed analyses.

## 6. Analysis creation

### `POST /analyses`

Authenticated for saved MVP flow.

Headers:

```text
Idempotency-Key: <uuid-or-high-entropy-client-key>
```

Request:

```json
{
  "projectId": "uuid",
  "proposalId": "uuid",
  "analysisProfile": "mvp-v1"
}
```

The ordinary client does **not** choose `refreshPolicy`, source URLs or source versions.

Server selects:

- latest eligible promoted `data_release_id`;
- exact source dataset versions belonging to that release;
- exact verified rule versions effective for the analysis.

Response may be synchronous for a fast MVP or return accepted state for multi-step orchestration:

```json
{
  "data": {
    "analysisId": "uuid",
    "status": "preparing",
    "dataRelease": {
      "id": "uuid",
      "key": "2026-09-01.1"
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

Idempotency requirements:

- key scoped to authenticated user/endpoint;
- same key + same request returns same analysis/result;
- same key + different request returns `CONFLICT`;
- analysis remains pinned to the originally selected data release even if a newer release is promoted while it runs.

## 7. Analysis status/result

### `GET /analyses/:analysisId`

Owner only.

Example conceptual response:

```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "analysisProfileVersion": "mvp-v1",
    "engineVersion": "2026.09.1",
    "dataRelease": {
      "id": "uuid",
      "key": "2026-09-01.1",
      "promotedAt": "2026-09-01T05:00:00Z"
    },
    "createdAt": "...",
    "completedAt": "...",
    "parcel": {
      "cadastralId": "12345:678:9012",
      "snapshotId": "uuid"
    },
    "proposal": {
      "id": "uuid",
      "version": 1,
      "structureType": "sauna",
      "areaM2": 48
    },
    "overall": {
      "state": "condition",
      "title": "Vajab täiendavat kontrolli"
    },
    "sourceCompleteness": [
      {
        "category": "cadastre",
        "status": "complete_for_supported_scope",
        "sourceDatasetVersionId": "uuid",
        "retrievedAt": "...",
        "freshnessState": "fresh",
        "carriedForward": false
      },
      {
        "category": "planning_text",
        "status": "not_supported",
        "reason": "Detailed plan textual conditions are not yet automatically interpreted."
      }
    ],
    "findings": []
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

## 8. Finding contract

Each material finding:

```json
{
  "id": "uuid",
  "code": "ROAD_PROTECTION_ZONE_INTERSECTION",
  "category": "road",
  "state": "condition",
  "severity": "high",
  "title": "Kavandatav ehitis puudutab tee kaitsevööndit",
  "summary": "...",
  "nextAction": {
    "code": "VERIFY_WITH_TRANSPORT_AUTHORITY",
    "label": "Kontrolli tingimusi Transpordiametist"
  },
  "evidence": [
    {
      "type": "geometry",
      "sourceId": "...",
      "sourceDatasetVersionId": "uuid",
      "sourceObjectId": "...",
      "retrievedAt": "...",
      "freshnessState": "fresh",
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
    "effectiveFrom": "2026-07-01",
    "legalSources": [
      {
        "title": "...",
        "section": "...",
        "officialUrl": "https://..."
      }
    ]
  }
}
```

A `clear` finding may omit evidence geometry if the source/check summary is still traceable.

## 9. Analysis categories and completeness

Completeness states:

- `complete_for_supported_scope`
- `partial`
- `unavailable`
- `not_supported`

Freshness states:

- `fresh`
- `warning`
- `stale`
- `unknown`

A source dataset version may also expose `carriedForward: true` when a newer monthly candidate was unavailable/rejected and the previous verified version remains active.

Do not collapse completeness, freshness and source-sync status into one flag.

## 10. AI explanation

### `POST /analyses/:analysisId/explain`

Authenticated owner.

Request:

```json
{
  "mode": "summary",
  "language": "et"
}
```

or finding-specific:

```json
{
  "mode": "finding",
  "findingId": "uuid",
  "language": "et"
}
```

Response:

```json
{
  "data": {
    "status": "generated",
    "text": "...",
    "findingIds": ["uuid"],
    "sourceIds": ["uuid"],
    "generatedAt": "...",
    "reused": false
  }
}
```

If a validated explanation already exists for the same immutable analysis/language/prompt-template policy, the server may return it with `reused: true` instead of calling Gemini again.

If provider fails:

- return deterministic fallback where available;
- optionally include `meta.aiStatus = "unavailable"`;
- do not mark factual analysis failed.

## 11. Follow-up questions

### `POST /analyses/:analysisId/questions`

Post-MVP or late MVP.

Request:

```json
{
  "question": "Miks see piirang minu sauna puudutab?"
}
```

Response must be grounded only in approved analysis evidence/source context and identify the finding/source references used.

A follow-up question does not trigger a source-data refresh.

## 12. Source details

### `GET /analyses/:analysisId/sources`

Owner only.

Returns user-safe provenance:

- data release ID/key;
- authority;
- source title;
- source dataset version ID;
- official URL;
- retrieval timestamp;
- source update/effective metadata;
- freshness state;
- carried-forward flag;
- categories informed;
- completeness status.

Must not expose internal credentials, raw headers or unsafe payloads.

## 13. Geometry evidence endpoint

If large evidence geometry should be lazy-loaded:

### `GET /analyses/:analysisId/findings/:findingId/evidence`

Return simplified browser geometry and measurements authorized through analysis ownership.

Do not expose arbitrary server-side spatial query parameters in MVP.

## 14. Admin/source synchronization API

Admin/source-sync behavior is server-side and not part of the ordinary public client contract.

Potential internal/admin endpoints:

- `GET /admin/sources/health`;
- `GET /admin/data-releases`;
- `POST /admin/sources/:sourceId/sync` for explicit manual/emergency refresh;
- `POST /admin/data-releases/:releaseId/promote` where manual promotion is required;
- legal change candidate review endpoints;
- rule draft/verification lifecycle;
- analysis invalidation annotation;
- adapter configuration status.

All require:

- explicit verified admin/server authorization;
- audit logging;
- idempotency where applicable;
- no arbitrary caller-supplied upstream URL;
- same validation/promotion gates as scheduled synchronization.

The production monthly cron path may call dedicated internal Edge Functions rather than these human-facing admin routes.

No client-supplied role flag may authorize admin behavior.

## 15. Pagination

Use cursor pagination for growing histories where practical.

Example:

```json
{
  "data": [...],
  "meta": {
    "nextCursor": "opaque-or-null"
  }
}
```

Do not expose raw database offset assumptions as permanent API contract unless intentionally chosen.

## 16. Rate limits

Apply especially to:

- analysis creation;
- AI explanations/questions;
- explicitly approved live-source lookups;
- admin manual refresh operations;
- future document uploads/parsing.

Normal parcel/analysis reads from promoted internal data should not depend on public-provider request quotas.

Return `429` + `RATE_LIMITED` and safe retry information where appropriate.

## 17. API versioning

For MVP, version contracts through:

- stable endpoint semantics;
- `analysisProfileVersion`;
- `engineVersion`;
- `dataRelease`;
- exact source dataset versions;
- rule versions;
- typed schema changes.

Before introducing breaking public/B2B API consumers, add explicit `/v1` versioning or equivalent via ADR.
