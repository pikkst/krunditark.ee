import type { ConstraintGeometry } from "../constraint/types";

export type { ConstraintGeometry };

export type FindingState = "clear" | "condition" | "conflict" | "unknown";

export type FindingSeverity = "info" | "warning" | "critical";

export type EvidenceType = "parcel" | "constraint" | "planning" | "source" | "legal" | "geometry";

export type NextActionCategory =
  "necessary_check" | "likely_process" | "recommendation" | "optional_preparation";

export type FindingCategory =
  | "cadastral_restriction"
  | "planning"
  | "environment"
  | "heritage"
  | "road"
  | "utility"
  | "access"
  | "permit"
  | "cost"
  | "other";

export type FindingKind = "rule" | "technical";

export type RuleStatus = "draft" | "verified" | "retired";

export type DataReleaseStatus = "candidate" | "promoted" | "rejected" | "retired";

export type CompletenessState = "complete" | "partial" | "unknown";

export type OverallResult =
  "conflict" | "incomplete" | "condition" | "no_conflict_in_checked_scope";

export type FreshnessState = "fresh" | "warning" | "stale" | "unknown";

export interface FindingError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FindingError[];
  warnings: FindingError[];
}

export interface FindingSourceProvenance {
  sourceId: string;
  sourceDatasetVersionId: string;
  sourceSyncRunId: string;
  sourceObjectId?: string;
  normalizerVersion: string;
  retrievedAt: string;
  sourceEffectiveAt?: string;
}

export interface FindingLegalReference {
  legalSourceId?: string;
  authority?: string;
  officialUrl?: string;
  documentIdentifier?: string;
  sectionReference?: string;
}

export interface FindingRuleReference {
  ruleVersionId: string;
  ruleCode: string;
  version: number;
  status: RuleStatus;
  implementationKey: string;
  legalReference?: FindingLegalReference;
  verifiedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface DataReleaseManifest {
  dataReleaseId: string;
  releaseKey: string;
  status: DataReleaseStatus;
  releasedAt: string;
  profile: string;
  sources: Record<string, string>;
  ruleSetManifestId: string;
  promotedAt?: string;
}

export interface RuleSetManifest {
  ruleSetManifestId: string;
  profileVersion: string;
  engineVersion: string;
  ruleVersions: FindingRuleReference[];
}

export interface AnalysisContext {
  analysisId: string;
  proposalId: string;
  parcelSnapshotId: string;
  dataReleaseId: string;
  analysisProfileVersion: string;
  engineVersion: string;
  inputHash: string;
}

export interface CompletenessStatus {
  sourceCategory: string;
  required: boolean;
  available: boolean;
  completenessState: CompletenessState;
  freshnessState: FreshnessState;
  sourceId?: string;
  sourceDatasetVersionId?: string;
}

export type EvidenceMeasurement =
  | { type: "distance"; valueM: number; nearestPoint?: number[] }
  | { type: "area"; valueM2: number }
  | { type: "intersection"; overlapM2: number; totalM2: number; overlapPercentage: number }
  | { type: "clearance"; distanceM: number; requiredDistanceM: number; meetsRequirement: boolean }
  | { type: "count"; count: number; unit?: string }
  | { type: "presence"; present: boolean; detail?: string };

export interface FindingEvidenceParcel {
  evidenceType: "parcel";
  parcelSnapshotId: string;
  source?: FindingSourceProvenance;
  measurement?: EvidenceMeasurement;
}

export interface FindingEvidenceConstraint {
  evidenceType: "constraint";
  constraintSnapshotId: string;
  source?: FindingSourceProvenance;
  legalReference?: FindingLegalReference;
  measurement?: EvidenceMeasurement;
}

export interface FindingEvidencePlanning {
  evidenceType: "planning";
  planningSnapshotId: string;
  source?: FindingSourceProvenance;
  legalReference?: FindingLegalReference;
  measurement?: EvidenceMeasurement;
}

export interface FindingEvidenceSource {
  evidenceType: "source";
  sourceSyncRunId?: string;
  sourceDatasetVersionId?: string;
  source: FindingSourceProvenance;
  legalReference?: FindingLegalReference;
}

export interface FindingEvidenceLegal {
  evidenceType: "legal";
  legalSourceId: string;
  legalReference: FindingLegalReference;
}

export interface FindingEvidenceGeometry {
  evidenceType: "geometry";
  evidenceGeometry: ConstraintGeometry;
  evidenceGeometryCrs: string;
  measurement?: EvidenceMeasurement;
}

export type FindingEvidence =
  | FindingEvidenceParcel
  | FindingEvidenceConstraint
  | FindingEvidencePlanning
  | FindingEvidenceSource
  | FindingEvidenceLegal
  | FindingEvidenceGeometry;

export interface FindingFact {
  field: string;
  value: unknown;
  unit?: string;
}

export interface FindingFacts {
  summary?: string;
  trigger?: string;
  measurements?: FindingFact[];
  structuredDetails?: Record<string, unknown>;
}

export interface FindingNextAction {
  code: string;
  category: NextActionCategory;
  priority: number;
  titleKey: string;
  descriptionKey?: string;
  officialUrl?: string;
}

export interface FindingSourceReference {
  sourceId: string;
  sourceDatasetVersionId: string;
  sourceSyncRunId: string;
  legalSourceId?: string;
  authority?: string;
  officialUrl?: string;
  documentIdentifier?: string;
  sectionReference?: string;
  retrievedAt: string;
  sourceEffectiveAt?: string;
}

export interface Finding {
  id: string;
  analysisId: string;
  kind: FindingKind;
  ruleVersionId?: string;
  code: string;
  category: FindingCategory;
  state: FindingState;
  severity: FindingSeverity;
  titleKey: string;
  facts: FindingFacts;
  nextAction?: FindingNextAction;
  evidence: FindingEvidence[];
  source: FindingSourceReference;
  rule?: FindingRuleReference;
  dataRelease: DataReleaseManifest;
  createdAt: string;
  inputHash?: string;
}

const VALID_FINDING_STATES = new Set<FindingState>(["clear", "condition", "conflict", "unknown"]);
const VALID_SEVERITIES = new Set<FindingSeverity>(["info", "warning", "critical"]);
const VALID_EVIDENCE_TYPES = new Set<EvidenceType>([
  "parcel",
  "constraint",
  "planning",
  "source",
  "legal",
  "geometry",
]);
const VALID_NEXT_ACTION_CATEGORIES = new Set<NextActionCategory>([
  "necessary_check",
  "likely_process",
  "recommendation",
  "optional_preparation",
]);
const VALID_FINDING_CATEGORIES = new Set<FindingCategory>([
  "cadastral_restriction",
  "planning",
  "environment",
  "heritage",
  "road",
  "utility",
  "access",
  "permit",
  "cost",
  "other",
]);
const VALID_FINDING_KINDS = new Set<FindingKind>(["rule", "technical"]);
const VALID_RULE_STATUSES = new Set<RuleStatus>(["draft", "verified", "retired"]);
const VALID_DATA_RELEASE_STATUSES = new Set<DataReleaseStatus>([
  "candidate",
  "promoted",
  "rejected",
  "retired",
]);
const VALID_FRESHNESS_STATES = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);
const VALID_COMPLETENESS_STATES = new Set<CompletenessState>(["complete", "partial", "unknown"]);
const SUPPORTED_EVIDENCE_CRS = new Set(["EPSG:3301"]);

const MAX_CODE_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 100;
const MAX_TITLE_KEY_LENGTH = 200;
const MAX_NEXT_ACTION_CODE_LENGTH = 100;
const MAX_SOURCE_ID_LENGTH = 200;

interface CoordinateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const EVIDENCE_CRS_BOUNDS: Record<string, CoordinateBounds> = {
  "EPSG:3301": { minX: 200000, maxX: 900000, minY: 6300000, maxY: 7800000 },
};

const GEOJSON_GEOMETRY_TYPES = new Set([
  "Point",
  "LineString",
  "Polygon",
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
]);

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function assertNonEmptyString(value: unknown, field: string, errors: FindingError[]): boolean {
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return false;
  }
  if (value.length === 0) {
    errors.push({ field, message: `${field} is required and must be a non-empty string` });
    return false;
  }
  return true;
}

function assertNonEmptyStringMax(
  value: string,
  field: string,
  maxLength: number,
  errors: FindingError[]
): void {
  if (value.length > maxLength) {
    errors.push({
      field,
      message: `${field} must not exceed ${maxLength} characters`,
    });
  }
}

function assertIsoTimestamp(value: unknown, field: string, errors: FindingError[]): boolean {
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return false;
  }
  if (value.length === 0) {
    errors.push({ field, message: `${field} is required and must be a non-empty string` });
    return false;
  }
  if (!isIsoTimestamp(value)) {
    errors.push({ field, message: `${field} must be a valid ISO timestamp` });
    return false;
  }
  return true;
}

function assertFiniteNumber(value: unknown, field: string, errors: FindingError[]): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({ field, message: `${field} must be a finite number` });
    return false;
  }
  return true;
}

function validatePosition(
  position: unknown,
  path: string,
  bounds: CoordinateBounds,
  errors: FindingError[]
): void {
  if (!Array.isArray(position) || position.length < 2) {
    errors.push({ field: path, message: "position must have at least x and y" });
    return;
  }
  if (!isFiniteCoordinate(position[0])) {
    errors.push({ field: `${path}[0]`, message: "coordinate must be a finite number" });
    return;
  }
  if (!isFiniteCoordinate(position[1])) {
    errors.push({ field: `${path}[1]`, message: "coordinate must be a finite number" });
    return;
  }
  if (position[0] < bounds.minX || position[0] > bounds.maxX) {
    errors.push({
      field: `${path}[0]`,
      message: `coordinate x out of valid range [${bounds.minX}, ${bounds.maxX}]`,
    });
  }
  if (position[1] < bounds.minY || position[1] > bounds.maxY) {
    errors.push({
      field: `${path}[1]`,
      message: `coordinate y out of valid range [${bounds.minY}, ${bounds.maxY}]`,
    });
  }
}

function validateRing(
  ring: unknown,
  path: string,
  bounds: CoordinateBounds,
  errors: FindingError[]
): void {
  if (!Array.isArray(ring) || ring.length < 4) {
    errors.push({ field: path, message: "ring must have at least 4 positions" });
    return;
  }
  for (let i = 0; i < ring.length; i++) {
    validatePosition(ring[i], `${path}[${i}]`, bounds, errors);
  }
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    errors.push({ field: path, message: "ring is not closed" });
  }
}

function validatePositions(
  positions: unknown,
  path: string,
  bounds: CoordinateBounds,
  errors: FindingError[]
): void {
  if (!Array.isArray(positions) || positions.length === 0) {
    errors.push({ field: path, message: "positions must not be empty" });
    return;
  }
  for (let i = 0; i < positions.length; i++) {
    validatePosition(positions[i], `${path}[${i}]`, bounds, errors);
  }
}

function validateEvidenceGeometry(
  geometry: ConstraintGeometry,
  path: string,
  crs: string,
  errors: FindingError[]
): void {
  const bounds = EVIDENCE_CRS_BOUNDS[crs];
  if (!bounds) {
    return;
  }
  if (typeof geometry !== "object" || geometry === null) {
    errors.push({ field: path, message: "geometry is required" });
    return;
  }
  const geo = geometry as unknown as Record<string, unknown>;
  const type = geo.type;
  if (!GEOJSON_GEOMETRY_TYPES.has(type as string)) {
    errors.push({
      field: `${path}.type`,
      message: "geometry type must be a valid GeoJSON geometry type",
    });
    return;
  }
  const coordinates = geo.coordinates;
  switch (type) {
    case "Point":
      validatePosition(coordinates, `${path}.coordinates`, bounds, errors);
      break;
    case "LineString":
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        errors.push({
          field: `${path}.coordinates`,
          message: "LineString must have at least 2 positions",
        });
      } else {
        validatePositions(coordinates, `${path}.coordinates`, bounds, errors);
      }
      break;
    case "MultiPoint":
      validatePositions(coordinates, `${path}.coordinates`, bounds, errors);
      break;
    case "Polygon":
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        errors.push({ field: `${path}.coordinates`, message: "coordinates must not be empty" });
      } else {
        for (let i = 0; i < coordinates.length; i++) {
          validateRing(coordinates[i], `${path}.coordinates[${i}]`, bounds, errors);
        }
      }
      break;
    case "MultiLineString":
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        errors.push({ field: `${path}.coordinates`, message: "coordinates must not be empty" });
      } else {
        for (let i = 0; i < coordinates.length; i++) {
          const line = coordinates[i];
          if (!Array.isArray(line) || line.length < 2) {
            errors.push({
              field: `${path}.coordinates[${i}]`,
              message: "LineString must have at least 2 positions",
            });
          } else {
            validatePositions(line, `${path}.coordinates[${i}]`, bounds, errors);
          }
        }
      }
      break;
    case "MultiPolygon":
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        errors.push({ field: `${path}.coordinates`, message: "coordinates must not be empty" });
      } else {
        for (let i = 0; i < coordinates.length; i++) {
          const polygon = coordinates[i];
          if (!Array.isArray(polygon) || polygon.length === 0) {
            errors.push({
              field: `${path}.coordinates[${i}]`,
              message: "polygon must have at least one ring",
            });
          } else {
            for (let j = 0; j < polygon.length; j++) {
              validateRing(polygon[j], `${path}.coordinates[${i}][${j}]`, bounds, errors);
            }
          }
        }
      }
      break;
    default:
      break;
  }
}

export function isValidFindingState(value: unknown): value is FindingState {
  return typeof value === "string" && VALID_FINDING_STATES.has(value as FindingState);
}

export function isValidSeverity(value: unknown): value is FindingSeverity {
  return typeof value === "string" && VALID_SEVERITIES.has(value as FindingSeverity);
}

export function isValidEvidenceType(value: unknown): value is EvidenceType {
  return typeof value === "string" && VALID_EVIDENCE_TYPES.has(value as EvidenceType);
}

export function isValidNextActionCategory(value: unknown): value is NextActionCategory {
  return typeof value === "string" && VALID_NEXT_ACTION_CATEGORIES.has(value as NextActionCategory);
}

export function isValidFindingCategory(value: unknown): value is FindingCategory {
  return typeof value === "string" && VALID_FINDING_CATEGORIES.has(value as FindingCategory);
}

export function isValidFindingKind(value: unknown): value is FindingKind {
  return typeof value === "string" && VALID_FINDING_KINDS.has(value as FindingKind);
}

export function isValidRuleStatus(value: unknown): value is RuleStatus {
  return typeof value === "string" && VALID_RULE_STATUSES.has(value as RuleStatus);
}

export function isValidDataReleaseStatus(value: unknown): value is DataReleaseStatus {
  return typeof value === "string" && VALID_DATA_RELEASE_STATUSES.has(value as DataReleaseStatus);
}

export function isValidCompletenessState(value: unknown): value is CompletenessState {
  return typeof value === "string" && VALID_COMPLETENESS_STATES.has(value as CompletenessState);
}

export function isValidFreshnessState(value: unknown): value is FreshnessState {
  return typeof value === "string" && VALID_FRESHNESS_STATES.has(value as FreshnessState);
}

export function isValidOverallResult(value: unknown): value is OverallResult {
  return (
    typeof value === "string" &&
    (value === "conflict" ||
      value === "incomplete" ||
      value === "condition" ||
      value === "no_conflict_in_checked_scope")
  );
}

export function validateEvidenceMeasurement(
  measurement: EvidenceMeasurement,
  path: string,
  errors: FindingError[]
): void {
  if (typeof measurement !== "object" || measurement === null) {
    errors.push({ field: path, message: "measurement must be an object" });
    return;
  }
  const m = measurement as Record<string, unknown>;
  const type = m.type;
  if (typeof type !== "string") {
    errors.push({ field: `${path}.type`, message: "type is required" });
    return;
  }
  switch (type) {
    case "distance":
      if (!assertFiniteNumber(m.valueM, `${path}.valueM`, errors)) {
        errors.push({ field: `${path}.valueM`, message: "valueM must be a finite number" });
      }
      if (m.nearestPoint !== undefined && !Array.isArray(m.nearestPoint)) {
        errors.push({ field: `${path}.nearestPoint`, message: "nearestPoint must be an array" });
      }
      break;
    case "area":
      if (!assertFiniteNumber(m.valueM2, `${path}.valueM2`, errors)) {
        errors.push({ field: `${path}.valueM2`, message: "valueM2 must be a finite number" });
      }
      break;
    case "intersection":
      assertFiniteNumber(m.overlapM2, `${path}.overlapM2`, errors);
      assertFiniteNumber(m.totalM2, `${path}.totalM2`, errors);
      assertFiniteNumber(m.overlapPercentage, `${path}.overlapPercentage`, errors);
      break;
    case "clearance":
      assertFiniteNumber(m.distanceM, `${path}.distanceM`, errors);
      assertFiniteNumber(m.requiredDistanceM, `${path}.requiredDistanceM`, errors);
      if (typeof m.meetsRequirement !== "boolean") {
        errors.push({
          field: `${path}.meetsRequirement`,
          message: "meetsRequirement must be a boolean",
        });
      }
      break;
    case "count":
      assertFiniteNumber(m.count, `${path}.count`, errors);
      if (m.unit !== undefined && typeof m.unit !== "string") {
        errors.push({ field: `${path}.unit`, message: "unit must be a string" });
      }
      break;
    case "presence":
      if (typeof m.present !== "boolean") {
        errors.push({ field: `${path}.present`, message: "present must be a boolean" });
      }
      break;
    default:
      errors.push({ field: `${path}.type`, message: `unknown measurement type: ${type}` });
  }
}

export function validateFinding(finding: Finding): ValidationResult {
  const errors: FindingError[] = [];
  const warnings: FindingError[] = [];

  if (!assertNonEmptyString(finding.id, "id", errors)) {
    errors.push({ field: "id", message: "id is required" });
  }

  if (!assertNonEmptyString(finding.analysisId, "analysisId", errors)) {
    errors.push({ field: "analysisId", message: "analysisId is required" });
  }

  if (!assertNonEmptyString(finding.kind, "kind", errors)) {
    errors.push({ field: "kind", message: "kind is required" });
  } else if (!isValidFindingKind(finding.kind)) {
    errors.push({
      field: "kind",
      message: `kind must be one of: ${Array.from(VALID_FINDING_KINDS).join(", ")}`,
    });
  }

  if (!assertNonEmptyString(finding.code, "code", errors)) {
    errors.push({ field: "code", message: "code is required" });
  } else {
    assertNonEmptyStringMax(finding.code, "code", MAX_CODE_LENGTH, errors);
  }

  if (!assertNonEmptyString(finding.category, "category", errors)) {
    errors.push({ field: "category", message: "category is required" });
  } else if (!isValidFindingCategory(finding.category)) {
    errors.push({
      field: "category",
      message: `category must be one of: ${Array.from(VALID_FINDING_CATEGORIES).join(", ")}`,
    });
  } else {
    assertNonEmptyStringMax(finding.category, "category", MAX_CATEGORY_LENGTH, errors);
  }

  if (!assertNonEmptyString(finding.state, "state", errors)) {
    errors.push({ field: "state", message: "state is required" });
  } else if (!isValidFindingState(finding.state)) {
    errors.push({
      field: "state",
      message: `state must be one of: ${Array.from(VALID_FINDING_STATES).join(", ")}`,
    });
  }

  if (!assertNonEmptyString(finding.severity, "severity", errors)) {
    errors.push({ field: "severity", message: "severity is required" });
  } else if (!isValidSeverity(finding.severity)) {
    errors.push({
      field: "severity",
      message: `severity must be one of: ${Array.from(VALID_SEVERITIES).join(", ")}`,
    });
  }

  if (!assertNonEmptyString(finding.titleKey, "titleKey", errors)) {
    errors.push({ field: "titleKey", message: "titleKey is required" });
  } else {
    assertNonEmptyStringMax(finding.titleKey, "titleKey", MAX_TITLE_KEY_LENGTH, errors);
  }

  if (finding.facts === null || finding.facts === undefined || typeof finding.facts !== "object") {
    errors.push({ field: "facts", message: "facts is required" });
  }

  if (finding.ruleVersionId !== undefined) {
    if (typeof finding.ruleVersionId !== "string") {
      errors.push({ field: "ruleVersionId", message: "ruleVersionId must be a string" });
    } else if (finding.ruleVersionId.length > 0) {
      assertNonEmptyStringMax(finding.ruleVersionId, "ruleVersionId", MAX_SOURCE_ID_LENGTH, errors);
    }
  }

  const isMaterial = isMaterialFindingState(finding.state);
  if (finding.kind === "rule" && isMaterial) {
    if (!finding.ruleVersionId) {
      errors.push({
        field: "ruleVersionId",
        message: "ruleVersionId is required for rule-derived material findings",
      });
    }
    if (!finding.rule) {
      errors.push({
        field: "rule",
        message: "rule reference is required for rule-derived material findings",
      });
    } else {
      const rule = finding.rule;
      if (!assertNonEmptyString(rule.ruleVersionId, "rule.ruleVersionId", errors)) {
        errors.push({ field: "rule.ruleVersionId", message: "ruleVersionId is required" });
      }
      if (!assertNonEmptyString(rule.ruleCode, "rule.ruleCode", errors)) {
        errors.push({ field: "rule.ruleCode", message: "ruleCode is required" });
      }
      if (
        typeof rule.version !== "number" ||
        !Number.isInteger(rule.version) ||
        rule.version <= 0
      ) {
        errors.push({ field: "rule.version", message: "version must be a positive integer" });
      }
      if (!rule.status) {
        errors.push({ field: "rule.status", message: "status is required" });
      } else if (!isValidRuleStatus(rule.status)) {
        errors.push({
          field: "rule.status",
          message: `status must be one of: ${Array.from(VALID_RULE_STATUSES).join(", ")}`,
        });
      }
      if (!assertNonEmptyString(rule.implementationKey, "rule.implementationKey", errors)) {
        errors.push({ field: "rule.implementationKey", message: "implementationKey is required" });
      }
    }
  }

  if (finding.rule !== undefined && finding.ruleVersionId !== undefined) {
    if (finding.rule.ruleVersionId !== finding.ruleVersionId) {
      errors.push({
        field: "rule.ruleVersionId",
        message: "rule.ruleVersionId must match top-level ruleVersionId",
      });
    }
  }

  if (!finding.source) {
    errors.push({ field: "source", message: "source is required" });
  } else {
    if (!assertNonEmptyString(finding.source.sourceId, "source.sourceId", errors)) {
      errors.push({
        field: "source.sourceId",
        message: "sourceId is required and must be a non-empty string",
      });
    } else {
      assertNonEmptyStringMax(
        finding.source.sourceId,
        "source.sourceId",
        MAX_SOURCE_ID_LENGTH,
        errors
      );
    }
    if (
      !assertNonEmptyString(
        finding.source.sourceDatasetVersionId,
        "source.sourceDatasetVersionId",
        errors
      )
    ) {
      errors.push({
        field: "source.sourceDatasetVersionId",
        message: "sourceDatasetVersionId is required and must be a non-empty string",
      });
    }
    if (!assertNonEmptyString(finding.source.sourceSyncRunId, "source.sourceSyncRunId", errors)) {
      errors.push({
        field: "source.sourceSyncRunId",
        message: "sourceSyncRunId is required and must be a non-empty string",
      });
    }
    assertIsoTimestamp(finding.source.retrievedAt, "source.retrievedAt", errors);
    if (finding.source.sourceEffectiveAt !== undefined) {
      assertIsoTimestamp(finding.source.sourceEffectiveAt, "source.sourceEffectiveAt", errors);
    }
  }

  if (!finding.dataRelease) {
    errors.push({ field: "dataRelease", message: "dataRelease is required" });
  } else {
    if (
      !assertNonEmptyString(finding.dataRelease.dataReleaseId, "dataRelease.dataReleaseId", errors)
    ) {
      errors.push({
        field: "dataRelease.dataReleaseId",
        message: "dataReleaseId is required",
      });
    }
    if (!assertNonEmptyString(finding.dataRelease.releaseKey, "dataRelease.releaseKey", errors)) {
      errors.push({
        field: "dataRelease.releaseKey",
        message: "releaseKey is required",
      });
    }
    if (!assertNonEmptyString(finding.dataRelease.status, "dataRelease.status", errors)) {
      errors.push({
        field: "dataRelease.status",
        message: "status is required",
      });
    } else if (!isValidDataReleaseStatus(finding.dataRelease.status)) {
      errors.push({
        field: "dataRelease.status",
        message: `status must be one of: ${Array.from(VALID_DATA_RELEASE_STATUSES).join(", ")}`,
      });
    }
    assertIsoTimestamp(finding.dataRelease.releasedAt, "dataRelease.releasedAt", errors);
    if (!assertNonEmptyString(finding.dataRelease.profile, "dataRelease.profile", errors)) {
      errors.push({
        field: "dataRelease.profile",
        message: "profile is required",
      });
    }
    if (
      !assertNonEmptyString(
        finding.dataRelease.ruleSetManifestId,
        "dataRelease.ruleSetManifestId",
        errors
      )
    ) {
      errors.push({
        field: "dataRelease.ruleSetManifestId",
        message: "ruleSetManifestId is required",
      });
    }
    if (finding.dataRelease.promotedAt !== undefined) {
      assertIsoTimestamp(finding.dataRelease.promotedAt, "dataRelease.promotedAt", errors);
    }
  }

  if (finding.nextAction !== undefined) {
    const action = finding.nextAction;
    if (!assertNonEmptyString(action.code, "nextAction.code", errors)) {
      errors.push({ field: "nextAction.code", message: "code is required" });
    } else {
      assertNonEmptyStringMax(action.code, "nextAction.code", MAX_NEXT_ACTION_CODE_LENGTH, errors);
    }
    if (!assertNonEmptyString(action.category, "nextAction.category", errors)) {
      errors.push({ field: "nextAction.category", message: "category is required" });
    } else if (!isValidNextActionCategory(action.category)) {
      errors.push({
        field: "nextAction.category",
        message: `category must be one of: ${Array.from(VALID_NEXT_ACTION_CATEGORIES).join(", ")}`,
      });
    }
    if (typeof action.priority !== "number" || !Number.isFinite(action.priority)) {
      errors.push({
        field: "nextAction.priority",
        message: "priority must be a finite number",
      });
    }
    if (!assertNonEmptyString(action.titleKey, "nextAction.titleKey", errors)) {
      errors.push({ field: "nextAction.titleKey", message: "titleKey is required" });
    }
  }

  assertIsoTimestamp(finding.createdAt, "createdAt", errors);

  if (finding.evidence && finding.evidence.length > 0) {
    for (let i = 0; i < finding.evidence.length; i++) {
      const evidence = finding.evidence[i];
      const evType = evidence.evidenceType;
      if (!assertNonEmptyString(evType, `evidence[${i}].evidenceType`, errors)) {
        errors.push({
          field: `evidence[${i}].evidenceType`,
          message: "evidenceType is required",
        });
      } else if (!isValidEvidenceType(evType)) {
        errors.push({
          field: `evidence[${i}].evidenceType`,
          message: `evidenceType must be one of: ${Array.from(VALID_EVIDENCE_TYPES).join(", ")}`,
        });
      }
      validateEvidenceByType(evidence as FindingEvidence, i, errors);
    }
  }

  if (isMaterial && finding.evidence.length === 0) {
    warnings.push({
      field: "evidence",
      message: "material findings should have at least one evidence reference for reproducibility",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

function isMaterialFindingState(state: FindingState): boolean {
  return state === "conflict" || state === "condition" || state === "unknown";
}

function validateEvidenceByType(
  evidence: FindingEvidence,
  index: number,
  errors: FindingError[]
): void {
  const prefix = `evidence[${index}]`;
  const evType = evidence.evidenceType;

  if (!isValidEvidenceType(evType)) {
    return;
  }

  switch (evType) {
    case "parcel": {
      const e = evidence as FindingEvidenceParcel;
      if (
        !e.parcelSnapshotId ||
        typeof e.parcelSnapshotId !== "string" ||
        e.parcelSnapshotId.length === 0
      ) {
        errors.push({
          field: `${prefix}.parcelSnapshotId`,
          message: "parcelSnapshotId is required for parcel evidence",
        });
      }
      break;
    }
    case "constraint": {
      const e = evidence as FindingEvidenceConstraint;
      if (
        !e.constraintSnapshotId ||
        typeof e.constraintSnapshotId !== "string" ||
        e.constraintSnapshotId.length === 0
      ) {
        errors.push({
          field: `${prefix}.constraintSnapshotId`,
          message: "constraintSnapshotId is required for constraint evidence",
        });
      }
      break;
    }
    case "planning": {
      const e = evidence as FindingEvidencePlanning;
      if (
        !e.planningSnapshotId ||
        typeof e.planningSnapshotId !== "string" ||
        e.planningSnapshotId.length === 0
      ) {
        errors.push({
          field: `${prefix}.planningSnapshotId`,
          message: "planningSnapshotId is required for planning evidence",
        });
      }
      break;
    }
    case "source": {
      const e = evidence as FindingEvidenceSource;
      if (!e.sourceSyncRunId && !e.sourceDatasetVersionId) {
        errors.push({
          field: prefix,
          message: "sourceSyncRunId or sourceDatasetVersionId is required for source evidence",
        });
      }
      break;
    }
    case "legal": {
      const e = evidence as FindingEvidenceLegal;
      if (!e.legalSourceId || typeof e.legalSourceId !== "string" || e.legalSourceId.length === 0) {
        errors.push({
          field: `${prefix}.legalSourceId`,
          message: "legalSourceId is required for legal evidence",
        });
      }
      break;
    }
    case "geometry": {
      const e = evidence as FindingEvidenceGeometry;
      if (!e.evidenceGeometry) {
        errors.push({
          field: `${prefix}.evidenceGeometry`,
          message: "evidenceGeometry is required for geometry evidence",
        });
        break;
      }
      if (!assertNonEmptyString(e.evidenceGeometryCrs, `${prefix}.evidenceGeometryCrs`, errors)) {
        errors.push({
          field: `${prefix}.evidenceGeometryCrs`,
          message: "evidenceGeometryCrs is required for geometry evidence",
        });
      } else if (!SUPPORTED_EVIDENCE_CRS.has(e.evidenceGeometryCrs)) {
        errors.push({
          field: `${prefix}.evidenceGeometryCrs`,
          message: `evidenceGeometryCrs must be ${Array.from(SUPPORTED_EVIDENCE_CRS)} (canonical analysis CRS)`,
        });
      }
      if (e.evidenceGeometry) {
        validateEvidenceGeometry(
          e.evidenceGeometry,
          `${prefix}.evidenceGeometry`,
          e.evidenceGeometryCrs || "EPSG:3301",
          errors
        );
      }
      if (e.measurement) {
        validateEvidenceMeasurement(e.measurement, `${prefix}.measurement`, errors);
      }
      break;
    }
    default:
      break;
  }
}

export function computeOverallResult(
  findings: Finding[],
  completeness: CompletenessStatus[]
): OverallResult {
  const hasConflict = findings.some((f) => f.state === "conflict");
  if (hasConflict) {
    return "conflict";
  }

  const hasCriticalUnknown = findings.some(
    (f) => f.state === "unknown" && f.severity === "critical"
  );
  const hasRequiredSourceIncomplete = completeness.some(
    (c) =>
      c.required &&
      (!c.available ||
        c.completenessState === "partial" ||
        c.completenessState === "unknown" ||
        c.freshnessState === "stale" ||
        c.freshnessState === "unknown")
  );
  if (hasCriticalUnknown || hasRequiredSourceIncomplete) {
    return "incomplete";
  }

  const hasCondition = findings.some((f) => f.state === "condition");
  if (hasCondition) {
    return "condition";
  }

  return "no_conflict_in_checked_scope";
}

export function isMaterialFinding(finding: Finding): boolean {
  return (
    finding.state === "conflict" || finding.state === "condition" || finding.state === "unknown"
  );
}

export function hasProvenance(finding: Finding): boolean {
  const hasBasicProvenance =
    assertNonEmptyString(finding.source?.sourceId, "source.sourceId", []) &&
    assertNonEmptyString(
      finding.source?.sourceDatasetVersionId,
      "source.sourceDatasetVersionId",
      []
    ) &&
    assertNonEmptyString(finding.dataRelease?.dataReleaseId, "dataRelease.dataReleaseId", []);

  if (!hasBasicProvenance) {
    return false;
  }

  if (!isMaterialFinding(finding)) {
    return true;
  }

  const hasEvidence = finding.evidence.length > 0;
  const hasSourceEvidence = finding.evidence.some(
    (e) =>
      e.evidenceType === "source" &&
      (Boolean((e as FindingEvidenceSource).sourceDatasetVersionId) ||
        Boolean((e as FindingEvidenceSource).sourceSyncRunId))
  );
  const hasDataReleaseSources = Object.keys(finding.dataRelease.sources).length > 0;

  return hasEvidence && (hasSourceEvidence || hasDataReleaseSources);
}
