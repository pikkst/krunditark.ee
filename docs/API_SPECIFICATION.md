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
    "code": "SOURCE_UNAVAILABLE",
    "message": "Ametlik andmeallikas ei ole hetkel kättesaadav.",
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

Do not use `PARCEL_NOT_FOUND` when the provider timed out.

## 3. Parcel lookup

### `GET /parcel/:cadastralId`

Purpose: resolve one cadastral parcel into a stable Krunditark representation.

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
    "source": {
      "id": "maru.cadastre.wfs",
      "authority": "Maa- ja Ruumiamet",
      "retrievedAt": "2026-08-15T10:00:00Z",
      "sourceUpdatedAt": null,
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
- source metadata required.

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

Server resolves/attaches a current parcel snapshot through the approved source path.

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
  "analysisProfile": "mvp-v1",
  "refreshPolicy": "normal"
}
```

Response may be synchronous for fast MVP or return accepted state for multi-step orchestration:

```json
{
  "data": {
    "analysisId": "uuid",
    "status": "collecting_sources"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

Idempotency requirements:

- key scoped to authenticated user/endpoint;
- same key + same request returns same analysis/result;
- same key + different request returns `CONFLICT`.

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
    "engineVersion": "2026.08.1",
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
        "retrievedAt": "..."
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
      "sourceObjectId": "...",
      "retrievedAt": "...",
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

Provider result status is separately one of:

- `success`
- `empty`
- `timeout`
- `unavailable`
- `invalid`
- `rate_limited`

Do not collapse these dimensions.

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
    "generatedAt": "..."
  }
}
```

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

## 12. Source details

### `GET /analyses/:analysisId/sources`

Owner only.

Returns user-safe provenance:

- authority;
- source title;
- official URL;
- retrieval timestamp;
- source update/effective metadata;
- categories informed;
- status.

Must not expose internal credentials, raw headers or unsafe payloads.

## 13. Geometry evidence endpoint

If large evidence geometry should be lazy-loaded:

### `GET /analyses/:analysisId/findings/:findingId/evidence`

Return simplified browser geometry and measurements authorized through analysis ownership.

Do not expose arbitrary server-side spatial query parameters in MVP.

## 14. Admin API

Admin behavior is server-side and not part of ordinary public client contract.

Potential future admin endpoints:

- source health;
- rule draft/verification lifecycle;
- analysis invalidation annotation;
- adapter configuration status.

All require explicit verified admin role and audit logging.

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

- parcel live-source refresh;
- analysis creation;
- AI explanations/questions;
- future document uploads/parsing.

Return `429` + `RATE_LIMITED` and safe retry information where appropriate.

## 17. API versioning

For MVP, version contracts through:

- stable endpoint semantics;
- `analysisProfileVersion`;
- `engineVersion`;
- rule versions;
- typed schema changes.

Before introducing breaking public/B2B API consumers, add explicit `/v1` versioning or equivalent via ADR.
