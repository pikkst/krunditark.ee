import type { ConstraintGeometry } from "../constraint/types";

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
  | {
      type: "distance";
      valueM: number;
      nearestPoint?: number[];
    }
  | {
      type: "area";
      valueM2: number;
      overlapGeometryCrs?: string;
    }
  | {
      type: "intersection";
      overlapM2: number;
      totalM2: number;
      overlapPercentage: number;
    }
  | {
      type: "clearance";
      distanceM: number;
      requiredDistanceM: number;
      meetsRequirement: boolean;
    }
  | Record<string, unknown>;

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
  legalSourceId?: string;
  authority?: string;
  officialUrl?: string;
  documentIdentifier?: string;
  sectionReference?: string;
  retrievedAt: string;
}

export interface Finding {
  id: string;
  analysisId: string;
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
const VALID_DATA_RELEASE_STATUSES = new Set<DataReleaseStatus>([
  "candidate",
  "promoted",
  "rejected",
  "retired",
]);
const VALID_FRESHNESS_STATES = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);
const VALID_COMPLETENESS_STATES = new Set<CompletenessState>(["complete", "partial", "unknown"]);
const MAX_CODE_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 100;
const MAX_TITLE_KEY_LENGTH = 200;
const MAX_NEXT_ACTION_CODE_LENGTH = 100;
const MAX_SOURCE_ID_LENGTH = 200;

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
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

export function validateFinding(finding: Finding): ValidationResult {
  const errors: FindingError[] = [];
  const warnings: FindingError[] = [];

  if (!finding.id) {
    errors.push({ field: "id", message: "id is required" });
  }

  if (!finding.analysisId) {
    errors.push({ field: "analysisId", message: "analysisId is required" });
  }

  if (!finding.code) {
    errors.push({ field: "code", message: "code is required" });
  } else if (finding.code.length > MAX_CODE_LENGTH) {
    errors.push({
      field: "code",
      message: `code must not exceed ${MAX_CODE_LENGTH} characters`,
    });
  }

  if (!finding.category) {
    errors.push({ field: "category", message: "category is required" });
  } else if (!isValidFindingCategory(finding.category)) {
    errors.push({
      field: "category",
      message: `category must be one of: ${Array.from(VALID_FINDING_CATEGORIES).join(", ")}`,
    });
  } else if (finding.category.length > MAX_CATEGORY_LENGTH) {
    errors.push({
      field: "category",
      message: `category must not exceed ${MAX_CATEGORY_LENGTH} characters`,
    });
  }

  if (!finding.state) {
    errors.push({ field: "state", message: "state is required" });
  } else if (!isValidFindingState(finding.state)) {
    errors.push({
      field: "state",
      message: `state must be one of: ${Array.from(VALID_FINDING_STATES).join(", ")}`,
    });
  }

  if (!finding.severity) {
    errors.push({ field: "severity", message: "severity is required" });
  } else if (!isValidSeverity(finding.severity)) {
    errors.push({
      field: "severity",
      message: `severity must be one of: ${Array.from(VALID_SEVERITIES).join(", ")}`,
    });
  }

  if (!finding.titleKey) {
    errors.push({ field: "titleKey", message: "titleKey is required" });
  } else if (finding.titleKey.length > MAX_TITLE_KEY_LENGTH) {
    errors.push({
      field: "titleKey",
      message: `titleKey must not exceed ${MAX_TITLE_KEY_LENGTH} characters`,
    });
  }

  if (!finding.facts) {
    errors.push({ field: "facts", message: "facts is required" });
  }

  if (!finding.source) {
    errors.push({ field: "source", message: "source is required for material findings" });
  } else {
    if (!finding.source.sourceId) {
      errors.push({
        field: "source.sourceId",
        message: "sourceId is required and must be a non-empty string",
      });
    } else if (finding.source.sourceId.length > MAX_SOURCE_ID_LENGTH) {
      errors.push({
        field: "source.sourceId",
        message: `sourceId must not exceed ${MAX_SOURCE_ID_LENGTH} characters`,
      });
    }
    if (!finding.source.retrievedAt) {
      errors.push({
        field: "source.retrievedAt",
        message: "retrievedAt is required",
      });
    } else if (!isIsoTimestamp(finding.source.retrievedAt)) {
      errors.push({
        field: "source.retrievedAt",
        message: "retrievedAt must be a valid ISO timestamp",
      });
    }
  }

  if (!finding.dataRelease) {
    errors.push({ field: "dataRelease", message: "dataRelease is required for material findings" });
  } else {
    if (!finding.dataRelease.dataReleaseId) {
      errors.push({
        field: "dataRelease.dataReleaseId",
        message: "dataReleaseId is required",
      });
    }
    if (!finding.dataRelease.releaseKey) {
      errors.push({
        field: "dataRelease.releaseKey",
        message: "releaseKey is required",
      });
    }
    if (!finding.dataRelease.status) {
      errors.push({
        field: "dataRelease.status",
        message: "status is required",
      });
    } else if (!isValidDataReleaseStatus(finding.dataRelease.status)) {
      errors.push({
        field: "dataRelease.status",
        message: "status must be a valid DataReleaseStatus",
      });
    }
    if (!finding.dataRelease.releasedAt) {
      errors.push({
        field: "dataRelease.releasedAt",
        message: "releasedAt is required",
      });
    } else if (!isIsoTimestamp(finding.dataRelease.releasedAt)) {
      errors.push({
        field: "dataRelease.releasedAt",
        message: "releasedAt must be a valid ISO timestamp",
      });
    }
    if (!finding.dataRelease.profile) {
      errors.push({
        field: "dataRelease.profile",
        message: "profile is required",
      });
    }
    if (!finding.dataRelease.ruleSetManifestId) {
      errors.push({
        field: "dataRelease.ruleSetManifestId",
        message: "ruleSetManifestId is required",
      });
    }
  }

  if (finding.nextAction) {
    const action = finding.nextAction;
    if (!action.code) {
      errors.push({ field: "nextAction.code", message: "code is required" });
    } else if (action.code.length > MAX_NEXT_ACTION_CODE_LENGTH) {
      errors.push({
        field: "nextAction.code",
        message: `code must not exceed ${MAX_NEXT_ACTION_CODE_LENGTH} characters`,
      });
    }
    if (!action.category) {
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
    if (!action.titleKey) {
      errors.push({ field: "nextAction.titleKey", message: "titleKey is required" });
    }
  }

  if (!finding.createdAt) {
    errors.push({ field: "createdAt", message: "createdAt is required" });
  } else if (!isIsoTimestamp(finding.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "createdAt must be a valid ISO timestamp",
    });
  }

  if (finding.evidence && finding.evidence.length > 0) {
    for (let i = 0; i < finding.evidence.length; i++) {
      const evidence = finding.evidence[i];
      if (!evidence.evidenceType) {
        errors.push({
          field: `evidence[${i}].evidenceType`,
          message: "evidenceType is required",
        });
      } else if (!isValidEvidenceType(evidence.evidenceType)) {
        errors.push({
          field: `evidence[${i}].evidenceType`,
          message: `evidenceType must be one of: ${Array.from(VALID_EVIDENCE_TYPES).join(", ")}`,
        });
      } else {
        const evidenceError = validateEvidenceByType(evidence, i);
        if (evidenceError) {
          errors.push(evidenceError);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateEvidenceByType(
  evidence: FindingEvidence,
  index: number
): FindingError | undefined {
  const prefix = `evidence[${index}]`;

  switch (evidence.evidenceType) {
    case "parcel":
      if (!evidence.parcelSnapshotId) {
        return {
          field: `${prefix}.parcelSnapshotId`,
          message: "parcelSnapshotId is required for parcel evidence",
        };
      }
      return undefined;
    case "constraint":
      if (!evidence.constraintSnapshotId) {
        return {
          field: `${prefix}.constraintSnapshotId`,
          message: "constraintSnapshotId is required for constraint evidence",
        };
      }
      return undefined;
    case "planning":
      if (!evidence.planningSnapshotId) {
        return {
          field: `${prefix}.planningSnapshotId`,
          message: "planningSnapshotId is required for planning evidence",
        };
      }
      return undefined;
    case "source":
      if (!evidence.sourceSyncRunId && !evidence.sourceDatasetVersionId) {
        return {
          field: prefix,
          message: "sourceSyncRunId or sourceDatasetVersionId is required for source evidence",
        };
      }
      return undefined;
    case "legal":
      if (!evidence.legalSourceId) {
        return {
          field: `${prefix}.legalSourceId`,
          message: "legalSourceId is required for legal evidence",
        };
      }
      return undefined;
    case "geometry":
      if (!evidence.evidenceGeometry) {
        return {
          field: `${prefix}.evidenceGeometry`,
          message: "evidenceGeometry is required for geometry evidence",
        };
      }
      if (!evidence.evidenceGeometryCrs) {
        return {
          field: `${prefix}.evidenceGeometryCrs`,
          message: "evidenceGeometryCrs is required for geometry evidence",
        };
      }
      return undefined;
    default:
      return undefined;
  }
}

function isValidDataReleaseStatus(value: unknown): value is DataReleaseStatus {
  return typeof value === "string" && VALID_DATA_RELEASE_STATUSES.has(value as DataReleaseStatus);
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
  const hasRequiredSourceUnavailable = completeness.some((c) => c.required && !c.available);
  if (hasCriticalUnknown || hasRequiredSourceUnavailable) {
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
  return Boolean(finding.source?.sourceId) && Boolean(finding.dataRelease?.dataReleaseId);
}
