# GIS and Rules Engine — Krunditark

## 1. Purpose

This document defines how Krunditark converts official source data + a user proposal into deterministic structured findings.

The key requirement is separation:

```text
Source objects -> normalized geospatial facts -> deterministic rules -> finding
```

An LLM is not part of this chain.

## 2. Coordinate systems

### Canonical analysis

For Estonian metric analysis, use **EPSG:3301 / L-EST97** unless a source-specific reason requires another metric CRS.

### Browser interchange

Use GeoJSON compatible with EPSG:4326 for client API payloads.

### Transform policy

- transform server-side/PostGIS;
- record source SRID where known;
- reject or explicitly handle unknown SRID;
- never assign an SRID merely to silence an error if actual coordinate system is uncertain.

## 3. Geometry validation

Proposal and source geometry must be validated before authoritative checks.

At minimum inspect:

- null/empty;
- valid geometry type;
- valid coordinate ranges;
- `ST_IsValid`;
- polygon ring closure;
- self-intersections;
- expected area limits;
- source/proposal SRID.

`ST_MakeValid` may be used for external source repair only under a documented normalization policy. Do not silently repair user geometry and pretend it is unchanged; surface meaningful validation errors where user correction is appropriate.

## 4. Spatial predicates are semantic decisions

Examples:

- `ST_Intersects` means geometries share any point.
- `ST_Touches` can distinguish boundary contact.
- `ST_CoveredBy` may be preferable to `ST_Within` when boundary inclusion is allowed.
- `ST_DWithin` is useful for threshold checks without expensive full distance calculation.

The rule specification must say which predicate reflects the requirement.

Do not encode “intersects = prohibited” generically.

## 5. Base derived facts

Suggested deterministic fact set:

```ts
interface ProposalSpatialFacts {
  proposalAreaM2: number;
  proposalWithinParcel: boolean;
  proposalCoveredByParcel: boolean;
  proposalTouchesParcelBoundary: boolean;
  proposalOutsideParcelAreaM2: number;
  minDistanceToParcelBoundaryM: number;
}
```

Constraint-specific facts:

```ts
interface ConstraintIntersectionFact {
  constraintId: string;
  category: string;
  intersects: boolean;
  touches: boolean;
  intersectionAreaM2?: number;
  minDistanceM?: number;
  evidenceGeometryId?: string;
}
```

These are facts, not conclusions.

## 6. Evidence geometry

For a spatial finding, store enough evidence to reproduce/explain it:

- source constraint geometry reference;
- proposal geometry version;
- derived intersection geometry where useful;
- measured distance/area;
- geometry algorithm/engine version if changed materially.

Browser geometry may be simplified for rendering, but original normalized geometry references remain in provenance.

## 7. Proposed-building placement

The server is authoritative for:

- area;
- perimeter;
- containment;
- intersection;
- distances used by rules.

Client calculations may provide interactive hints while dragging, but UI must clearly recompute/confirm on server before claiming a finding.

## 8. Rule model

A rule has:

```text
stable code
human title
domain category
version
status: draft / verified / retired
effective dates
implementation key
required input facts
official source references
output semantics
test matrix
verification metadata
```

### Example conceptual rule

```ts
const evaluateProposalOutsideParcel: RuleEvaluator = (ctx) => {
  if (ctx.proposalSpatialFacts.proposalOutsideParcelAreaM2 > 0) {
    return {
      state: "conflict",
      code: "PROPOSAL_OUTSIDE_SELECTED_PARCEL",
    };
  }

  return {
    state: "clear",
    code: "PROPOSAL_INSIDE_SELECTED_PARCEL",
  };
};
```

This example is a geometric project rule, not a legal conclusion about every possible right to build across boundaries.

## 9. Rule input completeness

Each rule declares required facts/source categories.

If a required fact is unavailable, evaluator returns/causes:

```text
state = unknown
reason = REQUIRED_SOURCE_UNAVAILABLE
```

Do not evaluate with default `false` for missing provider data.

Bad:

```ts
const hasRestriction = restrictions?.length > 0;
// provider error accidentally becomes false
```

Good:

```ts
if (restrictionSource.status !== 'success' && restrictionSource.status !== 'empty') {
  return unknown(...);
}
```

## 10. Rule effective dates

An analysis at time `T` selects a verified rule version whose effective period covers the intended legal/source date policy.

At minimum:

```text
effective_from <= analysis_reference_date
and
(effective_to is null or analysis_reference_date <= effective_to)
```

If multiple verified versions overlap incorrectly, fail the rule-set selection rather than choose arbitrarily.

## 11. Rule verification lifecycle

### Draft

- may be under development;
- may run in tests/admin preview;
- may not generate authoritative production findings.

### Verified

Requires:

- official source references;
- section/annex specificity where relevant;
- effective dates reviewed;
- implementation review;
- boundary tests;
- verifier and timestamp.

### Retired

- preserved for historical analyses;
- not selected for new analyses after applicability ends/decision changes.

Never delete historical rule versions referenced by analyses.

## 12. Permit-path rules

Permit/notice/project classification must be a narrow supported ruleset.

For each supported structure class, build a table/test matrix from the current official Ehitusseadustik and annex(es).

Each threshold rule must test:

- just below threshold;
- exactly threshold;
- just above threshold;
- missing required parameter;
- unsupported structure type.

Outside the verified matrix: `unknown`.

## 13. Planning rules

MVP planning output has at least two layers:

### Spatial detection

Fact:

> parcel/proposal intersects a plan area.

### Textual compliance

Unless plan provisions have been parsed into verified structured facts, status is not automatically known.

Therefore an initial finding may be:

```text
state: condition
message: A relevant plan was detected; detailed textual/graphical conditions require verification.
```

Do not produce:

```text
clear: proposal complies with detailed plan
```

based only on plan polygon overlap.

## 14. Protection/restriction rules

A normalized restriction feature alone does not define legal outcome.

Required mapping:

```text
source category/subcategory
    -> verified semantic mapping
    -> rule/evaluator
    -> finding state + next action
```

Examples of possible semantics:

- informational only;
- condition/coordination required;
- setback/distance threshold;
- direct conflict for a supported prohibition;
- unknown/manual review.

If mapping is not verified, use `unknown`/condition rather than generic conflict.

## 15. Source coverage profile

Define analysis profile `mvp-v1` listing required/optional categories.

Conceptual:

```yaml
profile: mvp-v1
required:
  - cadastre
  - cadastral_restrictions
  - planning_spatial
  - environment_public_selected
optional_until_supported:
  - heritage
  - road_state
  - ehr_existing_buildings
```

Profile version is persisted with analysis.

Changing required source coverage creates a new profile version.

## 16. Overall result derivation

Deterministic precedence example:

1. supported verified blocking `conflict` => overall `conflict`;
2. otherwise critical source unavailable / critical `unknown` => overall `incomplete`/condition;
3. otherwise any `condition` => overall `condition`;
4. otherwise supported required checks complete => `no_conflict_in_checked_scope`.

Do not derive overall status by averaging or AI sentiment.

## 17. Data freshness

Rules may define freshness requirements for specific source categories.

If cached source is older than allowed:

- attempt refresh if policy permits;
- if refresh fails and stale data cannot safely support a conclusion, finding becomes unknown/partial;
- stale data must be labeled with actual retrieval date.

## 18. Performance

Use:

- bounding-box prefilters;
- GiST indexes;
- `ST_DWithin` for threshold searches;
- source-query envelope buffers;
- map geometry simplification only for presentation.

Avoid loading all national geometries into application memory for a single parcel check.

## 19. Test fixture design

Maintain synthetic GIS fixtures that do not depend on real residents/properties.

Fixtures should include:

- square parcel;
- proposal fully inside;
- proposal crossing boundary;
- line restriction crossing proposal;
- polygon restriction partially overlapping;
- restriction touching proposal;
- nearby non-intersecting restriction;
- multipolygon;
- invalid source geometry;
- empty source result;
- provider failure state.

Add real-public-data contract fixtures only when licensing/privacy/source terms permit and sanitize to the minimum required.

## 20. Regression requirement

For frozen:

- proposal snapshot;
- parcel snapshot;
- source snapshots;
- analysis profile;
- verified rule versions;
- engine version;

the structured output must be deterministic.

AI text is excluded from this deterministic identity.
