import {
  isValidFindingState,
  isValidSeverity,
  isValidEvidenceType,
  isValidNextActionCategory,
  isValidFindingCategory,
  isValidFindingKind,
  isValidRuleStatus,
  isValidCompletenessState,
  isValidFreshnessState,
  isValidOverallResult,
  validateFinding,
  validateEvidenceMeasurement,
  computeOverallResult,
  isMaterialFinding,
  hasProvenance,
  type Finding,
  type FindingState,
  type FindingSeverity,
  type EvidenceType,
  type NextActionCategory,
  type FindingCategory,
  type FindingKind,
  type FindingEvidence,
  type FindingSourceProvenance,
  type CompletenessStatus,
  type FindingNextAction,
  type FindingSourceReference,
  type FindingRuleReference,
  type EvidenceMeasurement,
  type ConstraintGeometry,
  type FindingError,
  type DataReleaseManifest,
} from "./types";

const VALID_EVIDENCE_GEOMETRY = {
  type: "Polygon" as const,
  coordinates: [
    [
      [650000, 6600000],
      [651000, 6600000],
      [651000, 6601000],
      [650000, 6601000],
      [650000, 6600000],
    ],
  ],
};

function makeBaseSource(): FindingSourceReference {
  return {
    sourceId: "maru.cadastre.parcels",
    sourceDatasetVersionId: "dataset-version-1",
    sourceSyncRunId: "sync-1",
    authority: "Maa- ja Ruumiamet",
    officialUrl: "https://example.ee",
    retrievedAt: "2026-08-15T10:00:00Z",
  };
}

function makeBaseRule(): FindingRuleReference {
  return {
    ruleVersionId: "rule-version-1",
    ruleCode: "setback_from_boundary",
    version: 1,
    status: "verified",
    implementationKey: "setback_from_boundary:v1",
    legalReference: {
      legalSourceId: "legal-1",
      authority: "Riigi Teataja",
      officialUrl: "https://www.riigiteataja.ee",
      documentIdentifier: "EEG § 32",
      sectionReference: "32.3",
    },
    verifiedAt: "2026-08-01T00:00:00Z",
  };
}

function makeBaseSourceProvenance(): FindingSourceProvenance {
  return {
    sourceId: "maru.cadastre.parcels",
    sourceDatasetVersionId: "dataset-version-1",
    sourceSyncRunId: "sync-1",
    normalizerVersion: "1",
    retrievedAt: "2026-08-15T10:00:00Z",
  };
}

function makeBaseDataRelease(): DataReleaseManifest {
  return {
    dataReleaseId: "release-1",
    releaseKey: "2026-08-15.1",
    status: "promoted",
    releasedAt: "2026-08-15T10:00:00Z",
    profile: "consumer-build-v1",
    sources: {
      "maru.cadastre.parcels": "dataset-version-1",
      "maru.planning.spatial": "dataset-version-1",
    },
    ruleSetManifestId: "ruleset-1",
  };
}

function makeValidFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-1",
    analysisId: "analysis-1",
    kind: "rule",
    ruleVersionId: "rule-version-1",
    code: "parcel_area_check",
    category: "cadastral_restriction",
    state: "clear",
    severity: "info",
    titleKey: "finding.parcel_area.title",
    facts: {
      summary: "Parcel area is sufficient",
      trigger: "Proposal covers 1000 m²",
    },
    nextAction: undefined,
    evidence: [],
    source: makeBaseSource(),
    rule: makeBaseRule(),
    dataRelease: makeBaseDataRelease(),
    createdAt: "2026-08-15T10:00:00Z",
    ...overrides,
  };
}

describe("finding domain model (KT-023)", () => {
  describe("isValidFindingState", () => {
    test("accepts all valid finding states", () => {
      expect(isValidFindingState("clear")).toBe(true);
      expect(isValidFindingState("condition")).toBe(true);
      expect(isValidFindingState("conflict")).toBe(true);
      expect(isValidFindingState("unknown")).toBe(true);
    });

    test("rejects invalid finding states", () => {
      expect(isValidFindingState("approved")).toBe(false);
      expect(isValidFindingState("denied")).toBe(false);
      expect(isValidFindingState("")).toBe(false);
      expect(isValidFindingState(null)).toBe(false);
      expect(isValidFindingState(undefined)).toBe(false);
    });
  });

  describe("isValidSeverity", () => {
    test("accepts all valid severities", () => {
      expect(isValidSeverity("info")).toBe(true);
      expect(isValidSeverity("warning")).toBe(true);
      expect(isValidSeverity("critical")).toBe(true);
    });

    test("rejects invalid severities", () => {
      expect(isValidSeverity("low")).toBe(false);
      expect(isValidSeverity("high")).toBe(false);
      expect(isValidSeverity("")).toBe(false);
    });
  });

  describe("isValidEvidenceType", () => {
    test("accepts all valid evidence types", () => {
      expect(isValidEvidenceType("parcel")).toBe(true);
      expect(isValidEvidenceType("constraint")).toBe(true);
      expect(isValidEvidenceType("planning")).toBe(true);
      expect(isValidEvidenceType("source")).toBe(true);
      expect(isValidEvidenceType("legal")).toBe(true);
      expect(isValidEvidenceType("geometry")).toBe(true);
    });

    test("rejects invalid evidence types", () => {
      expect(isValidEvidenceType("photo")).toBe(false);
      expect(isValidEvidenceType("document")).toBe(false);
    });
  });

  describe("isValidNextActionCategory", () => {
    test("accepts all valid next action categories", () => {
      expect(isValidNextActionCategory("necessary_check")).toBe(true);
      expect(isValidNextActionCategory("likely_process")).toBe(true);
      expect(isValidNextActionCategory("recommendation")).toBe(true);
      expect(isValidNextActionCategory("optional_preparation")).toBe(true);
    });

    test("rejects invalid next action categories", () => {
      expect(isValidNextActionCategory("contact")).toBe(false);
      expect(isValidNextActionCategory("build")).toBe(false);
    });
  });

  describe("isValidFindingCategory", () => {
    test("accepts all valid finding categories", () => {
      expect(isValidFindingCategory("cadastral_restriction")).toBe(true);
      expect(isValidFindingCategory("planning")).toBe(true);
      expect(isValidFindingCategory("environment")).toBe(true);
      expect(isValidFindingCategory("heritage")).toBe(true);
      expect(isValidFindingCategory("road")).toBe(true);
      expect(isValidFindingCategory("utility")).toBe(true);
      expect(isValidFindingCategory("access")).toBe(true);
      expect(isValidFindingCategory("permit")).toBe(true);
      expect(isValidFindingCategory("cost")).toBe(true);
      expect(isValidFindingCategory("other")).toBe(true);
    });

    test("rejects invalid finding categories", () => {
      expect(isValidFindingCategory("building")).toBe(false);
      expect(isValidFindingCategory("violation")).toBe(false);
    });
  });

  describe("isValidCompletenessState", () => {
    test("accepts all valid completeness states", () => {
      expect(isValidCompletenessState("complete")).toBe(true);
      expect(isValidCompletenessState("partial")).toBe(true);
      expect(isValidCompletenessState("unknown")).toBe(true);
    });

    test("rejects invalid completeness states", () => {
      expect(isValidCompletenessState("full")).toBe(false);
      expect(isValidCompletenessState("incomplete")).toBe(false);
    });
  });

  describe("isValidFreshnessState", () => {
    test("accepts all valid freshness states", () => {
      expect(isValidFreshnessState("fresh")).toBe(true);
      expect(isValidFreshnessState("warning")).toBe(true);
      expect(isValidFreshnessState("stale")).toBe(true);
      expect(isValidFreshnessState("unknown")).toBe(true);
    });

    test("rejects invalid freshness states", () => {
      expect(isValidFreshnessState("current")).toBe(false);
      expect(isValidFreshnessState("expired")).toBe(false);
    });
  });

  describe("isValidOverallResult", () => {
    test("accepts all valid overall results", () => {
      expect(isValidOverallResult("conflict")).toBe(true);
      expect(isValidOverallResult("incomplete")).toBe(true);
      expect(isValidOverallResult("condition")).toBe(true);
      expect(isValidOverallResult("no_conflict_in_checked_scope")).toBe(true);
    });

    test("rejects invalid overall results", () => {
      expect(isValidOverallResult("approved")).toBe(false);
      expect(isValidOverallResult("pending")).toBe(false);
    });
  });

  describe("validateFinding", () => {
    test("returns valid for a complete clear finding with no evidence", () => {
      const result = validateFinding(makeValidFinding());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns valid for a conflict finding with evidence", () => {
      const finding = makeValidFinding({
        state: "conflict",
        severity: "critical",
        evidence: [
          {
            evidenceType: "constraint",
            constraintSnapshotId: "constraint-1",
            source: {
              sourceId: "maru.protection_zones",
              sourceDatasetVersionId: "version-1",
              sourceSyncRunId: "sync-1",
              normalizerVersion: "1",
              retrievedAt: "2026-08-01T00:00:00Z",
            },
          },
        ],
      });
      const result = validateFinding(finding);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("requires id", () => {
      const result = validateFinding(makeValidFinding({ id: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    test("requires analysisId", () => {
      const result = validateFinding(makeValidFinding({ analysisId: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "analysisId")).toBe(true);
    });

    test("requires code", () => {
      const result = validateFinding(makeValidFinding({ code: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("rejects code exceeding max length", () => {
      const result = validateFinding(makeValidFinding({ code: "x".repeat(101) }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("requires category", () => {
      const result = validateFinding(makeValidFinding({ category: "" as FindingCategory }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    });

    test("rejects invalid category", () => {
      const result = validateFinding(makeValidFinding({ category: "invalid" as FindingCategory }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    });

    test("requires state", () => {
      const result = validateFinding(makeValidFinding({ state: "" as FindingState }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "state")).toBe(true);
    });

    test("rejects invalid state", () => {
      const result = validateFinding(makeValidFinding({ state: "pending" as FindingState }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "state")).toBe(true);
    });

    test("requires severity", () => {
      const result = validateFinding(makeValidFinding({ severity: "" as FindingSeverity }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "severity")).toBe(true);
    });

    test("rejects invalid severity", () => {
      const result = validateFinding(makeValidFinding({ severity: "high" as FindingSeverity }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "severity")).toBe(true);
    });

    test("requires titleKey", () => {
      const result = validateFinding(makeValidFinding({ titleKey: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "titleKey")).toBe(true);
    });

    test("rejects titleKey exceeding max length", () => {
      const result = validateFinding(makeValidFinding({ titleKey: "x".repeat(201) }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "titleKey")).toBe(true);
    });

    test("requires facts", () => {
      const result = validateFinding(
        makeValidFinding({ facts: null as unknown as Finding["facts"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts")).toBe(true);
    });

    test("requires source", () => {
      const result = validateFinding(
        makeValidFinding({ source: null as unknown as FindingSourceReference })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source")).toBe(true);
    });

    test("requires source.sourceId", () => {
      const result = validateFinding(
        makeValidFinding({ source: { ...makeBaseSource(), sourceId: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceId")).toBe(true);
    });

    test("requires source.retrievedAt", () => {
      const result = validateFinding(
        makeValidFinding({ source: { ...makeBaseSource(), retrievedAt: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
    });

    test("rejects source.retrievedAt with invalid timestamp", () => {
      const result = validateFinding(
        makeValidFinding({ source: { ...makeBaseSource(), retrievedAt: "not-a-date" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
    });

    test("requires dataRelease", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: null as unknown as DataReleaseManifest })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease")).toBe(true);
    });

    test("requires dataRelease.dataReleaseId", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: { ...makeBaseDataRelease(), dataReleaseId: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.dataReleaseId")).toBe(true);
    });

    test("requires dataRelease.releaseKey", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: { ...makeBaseDataRelease(), releaseKey: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.releaseKey")).toBe(true);
    });

    test("requires dataRelease.status", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: { ...makeBaseDataRelease(), status: "" as DataReleaseManifest["status"] },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.status")).toBe(true);
    });

    test("requires dataRelease.releasedAt", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: { ...makeBaseDataRelease(), releasedAt: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.releasedAt")).toBe(true);
    });

    test("requires dataRelease.profile", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: { ...makeBaseDataRelease(), profile: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.profile")).toBe(true);
    });

    test("requires dataRelease.ruleSetManifestId", () => {
      const result = validateFinding(
        makeValidFinding({ dataRelease: { ...makeBaseDataRelease(), ruleSetManifestId: "" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.ruleSetManifestId")).toBe(true);
    });

    test("requires createdAt", () => {
      const result = validateFinding(makeValidFinding({ createdAt: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects invalid createdAt timestamp", () => {
      const result = validateFinding(makeValidFinding({ createdAt: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("validates nextAction.code length", () => {
      const result = validateFinding(
        makeValidFinding({
          nextAction: {
            code: "x".repeat(101),
            category: "recommendation",
            priority: 1,
            titleKey: "action.title",
          } as FindingNextAction,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "nextAction.code")).toBe(true);
    });

    test("requires nextAction.category", () => {
      const result = validateFinding(
        makeValidFinding({
          nextAction: {
            code: "action_1",
            category: "" as NextActionCategory,
            priority: 1,
            titleKey: "action.title",
          } as FindingNextAction,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "nextAction.category")).toBe(true);
    });

    test("requires nextAction.titleKey", () => {
      const result = validateFinding(
        makeValidFinding({
          nextAction: {
            code: "action_1",
            category: "recommendation",
            priority: 1,
            titleKey: "",
          } as FindingNextAction,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "nextAction.titleKey")).toBe(true);
    });

    test("validates evidence type", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [
            {
              evidenceType: "invalid" as EvidenceType,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceType")).toBe(true);
    });

    test("requires parcelSnapshotId for parcel evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [{ evidenceType: "parcel" } as FindingEvidence],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].parcelSnapshotId")).toBe(true);
    });

    test("requires constraintSnapshotId for constraint evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [{ evidenceType: "constraint" } as FindingEvidence],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].constraintSnapshotId")).toBe(true);
    });

    test("requires planningSnapshotId for planning evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [{ evidenceType: "planning" } as FindingEvidence],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].planningSnapshotId")).toBe(true);
    });

    test("requires sourceSyncRunId or sourceDatasetVersionId for source evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [{ evidenceType: "source" } as FindingEvidence],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0]")).toBe(true);
    });

    test("requires legalSourceId for legal evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [{ evidenceType: "legal" } as FindingEvidence],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].legalSourceId")).toBe(true);
    });

    test("requires evidenceGeometry for geometry evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [
            { evidenceType: "geometry", evidenceGeometryCrs: "EPSG:3301" } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceGeometry")).toBe(true);
    });

    test("requires evidenceGeometryCrs for geometry evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceGeometryCrs")).toBe(true);
    });

    test("accepts valid evidence of all types", () => {
      const finding = makeValidFinding({
        evidence: [
          {
            evidenceType: "parcel",
            parcelSnapshotId: "parcel-1",
          },
          {
            evidenceType: "constraint",
            constraintSnapshotId: "constraint-1",
          },
          {
            evidenceType: "planning",
            planningSnapshotId: "planning-1",
          },
          {
            evidenceType: "source",
            sourceSyncRunId: "sync-1",
            sourceDatasetVersionId: "version-1",
            source: {
              sourceId: "maru.cadastre.parcels",
              sourceDatasetVersionId: "version-1",
              sourceSyncRunId: "sync-1",
              normalizerVersion: "1",
              retrievedAt: "2026-08-01T00:00:00Z",
            },
          },
          {
            evidenceType: "legal",
            legalSourceId: "legal-1",
            legalReference: {
              legalSourceId: "legal-1",
              authority: "Riigi Teataja",
              officialUrl: "https://www.riigiteataja.ee",
            },
          },
          {
            evidenceType: "geometry",
            evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
            evidenceGeometryCrs: "EPSG:3301",
          },
        ],
      });
      const result = validateFinding(finding);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("computeOverallResult", () => {
    const makeCompleteness = (overrides: Partial<CompletenessStatus> = {}): CompletenessStatus => ({
      sourceCategory: "cadastre",
      required: true,
      available: true,
      completenessState: "complete",
      freshnessState: "fresh",
      ...overrides,
    });

    test("returns conflict when any finding has state conflict", () => {
      const findings: Finding[] = [
        makeValidFinding({ state: "conflict", severity: "critical" }),
        makeValidFinding({ id: "finding-2", state: "clear" }),
      ];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("conflict");
    });

    test("returns incomplete when critical unknown finding exists", () => {
      const findings: Finding[] = [makeValidFinding({ state: "unknown", severity: "critical" })];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns incomplete when required source is unavailable", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ required: true, available: false }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns conflict when both conflict and critical unknown exist (conflict takes precedence)", () => {
      const findings: Finding[] = [
        makeValidFinding({ state: "conflict", severity: "info" }),
        makeValidFinding({ id: "finding-2", state: "unknown", severity: "critical" }),
      ];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("conflict");
    });

    test("returns condition when any finding has state condition (no conflict/unknown)", () => {
      const findings: Finding[] = [makeValidFinding({ state: "condition", severity: "warning" })];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("condition");
    });

    test("returns no_conflict_in_checked_scope when all findings are clear and sources complete", () => {
      const findings: Finding[] = [
        makeValidFinding({ state: "clear", severity: "info" }),
        makeValidFinding({ id: "finding-2", state: "clear", severity: "info" }),
      ];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ required: true, available: true }),
        makeCompleteness({ sourceCategory: "planning", required: true, available: true }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("returns conflict takes precedence over condition", () => {
      const findings: Finding[] = [
        makeValidFinding({ state: "condition", severity: "warning" }),
        makeValidFinding({ id: "finding-2", state: "conflict", severity: "critical" }),
      ];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("conflict");
    });

    test("returns no_conflict_in_checked_scope with empty findings and complete sources", () => {
      const result = computeOverallResult([], [makeCompleteness()]);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("returns incomplete with empty findings but required source unavailable", () => {
      const result = computeOverallResult(
        [],
        [makeCompleteness({ required: true, available: false })]
      );
      expect(result).toBe("incomplete");
    });

    test("returns no_conflict_in_checked_scope when optional source unavailable", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ required: false, available: false }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("non-critical unknown does not cause incomplete", () => {
      const findings: Finding[] = [makeValidFinding({ state: "unknown", severity: "info" })];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("conflict finding takes precedence over non-critical unknown", () => {
      const findings: Finding[] = [
        makeValidFinding({ state: "conflict", severity: "critical" }),
        makeValidFinding({ id: "finding-2", state: "unknown", severity: "info" }),
      ];
      const completeness: CompletenessStatus[] = [makeCompleteness()];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("conflict");
    });
  });

  describe("isMaterialFinding", () => {
    test("returns true for conflict findings", () => {
      expect(isMaterialFinding(makeValidFinding({ state: "conflict" }))).toBe(true);
    });

    test("returns true for condition findings", () => {
      expect(isMaterialFinding(makeValidFinding({ state: "condition" }))).toBe(true);
    });

    test("returns true for unknown findings", () => {
      expect(isMaterialFinding(makeValidFinding({ state: "unknown" }))).toBe(true);
    });

    test("returns false for clear findings", () => {
      expect(isMaterialFinding(makeValidFinding({ state: "clear" }))).toBe(false);
    });
  });

  describe("hasProvenance", () => {
    test("returns true for valid material finding with evidence and dataset version", () => {
      expect(hasProvenance(makeValidFinding())).toBe(true);
    });

    test("returns false when source is missing", () => {
      expect(
        hasProvenance(makeValidFinding({ source: null as unknown as FindingSourceReference }))
      ).toBe(false);
    });

    test("returns false when source.sourceId is missing", () => {
      expect(
        hasProvenance(makeValidFinding({ source: { ...makeBaseSource(), sourceId: "" } }))
      ).toBe(false);
    });

    test("returns false when dataRelease is missing", () => {
      expect(
        hasProvenance(makeValidFinding({ dataRelease: null as unknown as DataReleaseManifest }))
      ).toBe(false);
    });

    test("returns false for material finding without sourceDatasetVersionId", () => {
      expect(
        hasProvenance(
          makeValidFinding({
            source: { ...makeBaseSource(), sourceDatasetVersionId: "" },
          })
        )
      ).toBe(false);
    });

    test("returns false for material finding with empty evidence", () => {
      const finding = makeValidFinding({ state: "conflict", evidence: [] });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns true for clear finding without evidence (provenance sufficient for non-material)", () => {
      const finding = makeValidFinding({ state: "clear", evidence: [] });
      expect(hasProvenance(finding)).toBe(true);
    });
  });

  describe("isValidFindingKind", () => {
    test("accepts valid kinds", () => {
      expect(isValidFindingKind("rule")).toBe(true);
      expect(isValidFindingKind("technical")).toBe(true);
    });

    test("rejects invalid kinds", () => {
      expect(isValidFindingKind("derived")).toBe(false);
      expect(isValidFindingKind("automated")).toBe(false);
    });
  });

  describe("isValidRuleStatus", () => {
    test("accepts valid statuses", () => {
      expect(isValidRuleStatus("draft")).toBe(true);
      expect(isValidRuleStatus("verified")).toBe(true);
      expect(isValidRuleStatus("retired")).toBe(true);
    });

    test("rejects invalid statuses", () => {
      expect(isValidRuleStatus("active")).toBe(false);
      expect(isValidRuleStatus("published")).toBe(false);
    });
  });

  describe("validateFinding - kind and rule provenance", () => {
    test("returns valid for technical material finding without rule reference", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "unknown",
          severity: "critical",
          evidence: [
            {
              evidenceType: "source",
              sourceSyncRunId: "sync-1",
              sourceDatasetVersionId: "v1",
              source: makeBaseSourceProvenance(),
            },
          ],
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects rule finding missing ruleVersionId when state is conflict", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "rule",
          ruleVersionId: undefined,
          state: "conflict",
          severity: "critical",
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "ruleVersionId")).toBe(true);
    });

    test("rejects rule finding missing rule reference when state is condition", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "rule",
          rule: undefined,
          state: "condition",
          severity: "warning",
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule")).toBe(true);
    });

    test("rejects invalid kind", () => {
      const result = validateFinding(makeValidFinding({ kind: "derived" as FindingKind }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "kind")).toBe(true);
    });

    test("rejects rule reference with invalid status", () => {
      const result = validateFinding(
        makeValidFinding({
          state: "conflict",
          rule: { ...makeBaseRule(), status: "active" as FindingRuleReference["status"] },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.status")).toBe(true);
    });

    test("rejects rule reference with mismatched ruleVersionId", () => {
      const result = validateFinding(
        makeValidFinding({
          ruleVersionId: "rule-version-1",
          rule: { ...makeBaseRule(), ruleVersionId: "rule-version-2" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.ruleVersionId")).toBe(true);
    });

    test("rejects rule reference with non-positive version", () => {
      const result = validateFinding(
        makeValidFinding({
          state: "conflict",
          rule: { ...makeBaseRule(), version: 0 },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.version")).toBe(true);
    });

    test("rejects rule reference missing implementationKey", () => {
      const result = validateFinding(
        makeValidFinding({
          state: "conflict",
          rule: { ...makeBaseRule(), implementationKey: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.implementationKey")).toBe(true);
    });

    test("rejects rule reference missing ruleCode", () => {
      const result = validateFinding(
        makeValidFinding({
          state: "conflict",
          rule: { ...makeBaseRule(), ruleCode: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.ruleCode")).toBe(true);
    });

    test("rejects rule reference missing ruleVersionId in nested object", () => {
      const result = validateFinding(
        makeValidFinding({
          rule: { ...makeBaseRule(), ruleVersionId: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rule.ruleVersionId")).toBe(true);
    });
  });

  describe("validateFinding - runtime type guards for non-string values", () => {
    test("rejects sourceId as number", () => {
      const result = validateFinding(
        makeValidFinding({
          source: { ...makeBaseSource(), sourceId: 123 as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === "source.sourceId" && e.message === "source.sourceId must be a string"
        )
      ).toBe(true);
    });

    test("rejects sourceDatasetVersionId as number", () => {
      const result = validateFinding(
        makeValidFinding({
          source: { ...makeBaseSource(), sourceDatasetVersionId: 456 as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceDatasetVersionId")).toBe(true);
    });

    test("rejects dataReleaseId as number", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: { ...makeBaseDataRelease(), dataReleaseId: 789 as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === "dataRelease.dataReleaseId" &&
            e.message === "dataRelease.dataReleaseId must be a string"
        )
      ).toBe(true);
    });

    test("rejects releaseKey as boolean", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: { ...makeBaseDataRelease(), releaseKey: true as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === "dataRelease.releaseKey" &&
            e.message === "dataRelease.releaseKey must be a string"
        )
      ).toBe(true);
    });

    test("rejects ruleSetManifestId as number", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: { ...makeBaseDataRelease(), ruleSetManifestId: 111 as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === "dataRelease.ruleSetManifestId" &&
            e.message === "dataRelease.ruleSetManifestId must be a string"
        )
      ).toBe(true);
    });

    test("rejects retrievedAt as number", () => {
      const result = validateFinding(
        makeValidFinding({
          source: { ...makeBaseSource(), retrievedAt: 12345 as unknown as string },
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === "source.retrievedAt" && e.message === "source.retrievedAt must be a string"
        )
      ).toBe(true);
    });

    test("rejects createdAt as null", () => {
      const result = validateFinding(makeValidFinding({ createdAt: null as unknown as string }));
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === "createdAt" && e.message === "createdAt must be a string"
        )
      ).toBe(true);
    });

    test("rejects parcelSnapshotId as number for parcel evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "parcel",
              parcelSnapshotId: 123 as unknown as string,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].parcelSnapshotId")).toBe(true);
    });
  });

  describe("validateFinding - evidence geometry CRS and measurement validation", () => {
    test("rejects geometry evidence with non-canonical CRS (EPSG:4326)", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:4326",
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceGeometryCrs")).toBe(true);
    });

    test("rejects geometry evidence with invalid CRS (EPSG:banana)", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:banana",
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceGeometryCrs")).toBe(true);
    });

    test("rejects geometry evidence with coordinates outside Estonian bounds", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [1000, 0],
                    [1000, 1000],
                    [0, 1000],
                    [0, 0],
                  ],
                ],
              },
              evidenceGeometryCrs: "EPSG:3301",
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.field.startsWith("evidence[0].evidenceGeometry.coordinates[0][")
        )
      ).toBe(true);
    });

    test("rejects geometry evidence with non-finite coordinate", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: {
                type: "Point",
                coordinates: [NaN, 6600000],
              } as ConstraintGeometry,
              evidenceGeometryCrs: "EPSG:3301",
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === "evidence[0].evidenceGeometry.coordinates[0]")
      ).toBe(true);
    });

    test("rejects invalid CRS before validating geometry coordinates", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: {
                type: "Polygon",
                coordinates: [[[-9999, -9999]]],
              } as ConstraintGeometry,
              evidenceGeometryCrs: "EPSG:banana",
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].evidenceGeometryCrs")).toBe(true);
    });
  });

  describe("validateFinding - measurement validation", () => {
    test("rejects distance measurement with non-finite valueM", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "clear",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:3301",
              measurement: { type: "distance", valueM: NaN } as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].measurement.valueM")).toBe(true);
    });

    test("rejects area measurement with non-number valueM2", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:3301",
              measurement: {
                type: "area",
                valueM2: "not-a-number",
              } as unknown as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].measurement.valueM2")).toBe(true);
    });

    test("rejects intersection measurement with non-boolean meetsRequirement", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:3301",
              measurement: {
                type: "clearance",
                distanceM: 5,
                requiredDistanceM: 3,
                meetsRequirement: "yes" as unknown as boolean,
              } as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === "evidence[0].measurement.meetsRequirement")
      ).toBe(true);
    });

    test("rejects unknown measurement type", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "geometry",
              evidenceGeometry: VALID_EVIDENCE_GEOMETRY,
              evidenceGeometryCrs: "EPSG:3301",
              measurement: { type: "unknown_type", value: 1 } as unknown as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].measurement.type")).toBe(true);
    });
  });

  describe("validateEvidenceMeasurement", () => {
    test("validates distance measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement({ type: "distance", valueM: 5.5 }, "measurement", errors);
      expect(errors).toHaveLength(0);
    });

    test("rejects distance measurement with non-finite valueM", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "distance", valueM: NaN } as EvidenceMeasurement,
        "measurement",
        errors
      );
      expect(errors.some((e) => e.field === "measurement.valueM")).toBe(true);
    });

    test("validates area measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement({ type: "area", valueM2: 100 }, "measurement", errors);
      expect(errors).toHaveLength(0);
    });

    test("validates intersection measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "intersection", overlapM2: 50, totalM2: 100, overlapPercentage: 50 },
        "measurement",
        errors
      );
      expect(errors).toHaveLength(0);
    });

    test("validates clearance measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "clearance", distanceM: 5, requiredDistanceM: 3, meetsRequirement: true },
        "measurement",
        errors
      );
      expect(errors).toHaveLength(0);
    });

    test("validates count measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "count", count: 5, unit: "zones" },
        "measurement",
        errors
      );
      expect(errors).toHaveLength(0);
    });

    test("validates presence measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "presence", present: true, detail: "found" },
        "measurement",
        errors
      );
      expect(errors).toHaveLength(0);
    });

    test("rejects unknown measurement type", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(
        { type: "unknown" } as unknown as EvidenceMeasurement,
        "measurement",
        errors
      );
      expect(errors.some((e) => e.field === "measurement.type")).toBe(true);
    });

    test("rejects null measurement", () => {
      const errors: FindingError[] = [];
      validateEvidenceMeasurement(null as unknown as EvidenceMeasurement, "measurement", errors);
      expect(
        errors.some(
          (e) => e.field === "measurement" && e.message === "measurement must be an object"
        )
      ).toBe(true);
    });
  });

  describe("computeOverallResult - completeness and freshness", () => {
    const makeCompleteness = (overrides: Partial<CompletenessStatus> = {}): CompletenessStatus => ({
      sourceCategory: "cadastre",
      required: true,
      available: true,
      completenessState: "complete",
      freshnessState: "fresh",
      ...overrides,
    });

    test("returns incomplete when required source has partial completeness", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ completenessState: "partial" }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns incomplete when required source has unknown completeness even if available", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ available: true, completenessState: "unknown" }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns incomplete when required source is stale", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [makeCompleteness({ freshnessState: "stale" })];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns incomplete when required source has unknown freshness", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [makeCompleteness({ freshnessState: "unknown" })];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns no_conflict when required source is warning (not stale) and complete", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ freshnessState: "warning", completenessState: "complete" }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("returns no_conflict when optional source is partial/stale", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({
          required: false,
          completenessState: "partial",
          freshnessState: "stale",
        }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("no_conflict_in_checked_scope");
    });

    test("returns incomplete when multiple required sources and one is stale", () => {
      const findings: Finding[] = [makeValidFinding({ state: "clear" })];
      const completeness: CompletenessStatus[] = [
        makeCompleteness({ sourceCategory: "cadastre", freshnessState: "fresh" }),
        makeCompleteness({ sourceCategory: "planning", freshnessState: "stale" }),
      ];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });

    test("returns incomplete takes precedence over condition", () => {
      const findings: Finding[] = [makeValidFinding({ state: "condition", severity: "warning" })];
      const completeness: CompletenessStatus[] = [makeCompleteness({ freshnessState: "stale" })];
      const result = computeOverallResult(findings, completeness);
      expect(result).toBe("incomplete");
    });
  });

  describe("hasProvenance - material finding evidence requirements", () => {
    test("returns false for material finding with source evidence lacking evidence-level version and empty release sources", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [
          {
            evidenceType: "source",
            source: makeBaseSourceProvenance(),
          } as FindingEvidence,
        ],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: {},
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns true for material finding with source evidence carrying dataset version", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [
          {
            evidenceType: "source",
            sourceSyncRunId: "sync-1",
            sourceDatasetVersionId: "dataset-version-1",
            source: makeBaseSourceProvenance(),
          } as FindingEvidence,
        ],
      });
      expect(hasProvenance(finding)).toBe(true);
    });

    test("returns true for material finding with data release sources mapping", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [
          { evidenceType: "constraint", constraintSnapshotId: "constraint-1" } as FindingEvidence,
        ],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: {
            "maru.cadastre.parcels": "dataset-version-1",
            "maru.planning.spatial": "dataset-version-1",
          },
        },
      });
      expect(hasProvenance(finding)).toBe(true);
    });

    test("returns false for material finding with empty data release sources map", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [
          { evidenceType: "constraint", constraintSnapshotId: "constraint-1" } as FindingEvidence,
        ],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: {},
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns true for clear finding without evidence (non-material, basic provenance sufficient)", () => {
      const finding = makeValidFinding({ state: "clear", evidence: [] });
      expect(hasProvenance(finding)).toBe(true);
    });
  });

  describe("validateFinding - material evidence requirement (review fix 1)", () => {
    test("rejects material finding with empty evidence as error", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "conflict",
          severity: "critical",
          evidence: [],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === "evidence" && e.message.includes("required for material findings")
        )
      ).toBe(true);
    });

    test("rejects material finding with empty evidence when state is condition", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "condition",
          severity: "warning",
          evidence: [],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence")).toBe(true);
    });

    test("rejects material finding with empty evidence when state is unknown", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "unknown",
          severity: "info",
          evidence: [],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence")).toBe(true);
    });

    test("accepts clear (non-material) finding with empty evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "clear",
          evidence: [],
        })
      );
      expect(result.valid).toBe(true);
    });

    test("accepts material finding with non-empty evidence", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          state: "conflict",
          evidence: [
            { evidenceType: "constraint", constraintSnapshotId: "constraint-1" } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("validateFinding - measurement validation on non-geometry evidence (review fix 2)", () => {
    test("rejects constraint evidence with malformed measurement", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "constraint",
              constraintSnapshotId: "constraint-1",
              measurement: { type: "distance", valueM: NaN } as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].measurement.valueM")).toBe(true);
    });

    test("rejects parcel evidence with malformed measurement", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "parcel",
              parcelSnapshotId: "parcel-1",
              measurement: {
                type: "clearance",
                distanceM: 5,
                requiredDistanceM: 3,
                meetsRequirement: "yes" as unknown as boolean,
              } as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === "evidence[0].measurement.meetsRequirement")
      ).toBe(true);
    });

    test("rejects planning evidence with unknown measurement type", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "planning",
              planningSnapshotId: "planning-1",
              measurement: { type: "bogus" } as unknown as EvidenceMeasurement,
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "evidence[0].measurement.type")).toBe(true);
    });

    test("accepts constraint evidence with valid measurement", () => {
      const result = validateFinding(
        makeValidFinding({
          kind: "technical",
          evidence: [
            {
              evidenceType: "constraint",
              constraintSnapshotId: "constraint-1",
              measurement: { type: "distance", valueM: 5.5 },
            } as FindingEvidence,
          ],
        })
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("validateFinding - dataRelease.sources manifest validation (review fix 3)", () => {
    test("rejects dataRelease.sources with non-string value", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: {
            ...makeBaseDataRelease(),
            sources: { cadastre: 123 as unknown as string },
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.sources")).toBe(true);
    });

    test("rejects dataRelease.sources with empty string value", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: {
            ...makeBaseDataRelease(),
            sources: { cadastre: "" },
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.sources")).toBe(true);
    });

    test("rejects dataRelease.sources with null value", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: {
            ...makeBaseDataRelease(),
            sources: null as unknown as Record<string, string>,
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.sources")).toBe(true);
    });

    test("rejects dataRelease.sources as array", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: {
            ...makeBaseDataRelease(),
            sources: ["invalid"] as unknown as Record<string, string>,
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "dataRelease.sources")).toBe(true);
    });

    test("accepts valid dataRelease.sources with multiple entries", () => {
      const result = validateFinding(
        makeValidFinding({
          dataRelease: {
            ...makeBaseDataRelease(),
            sources: {
              cadastre: "dataset-version-1",
              planning_spatial: "dataset-version-1",
            },
          },
        })
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("hasProvenance - sources manifest validation (review fix 3)", () => {
    test("returns false when sources has non-string value", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: { unrelated: 123 as unknown as string },
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns false when sources has empty string value", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: { unrelated: "" },
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns false when sources is null", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: null as unknown as Record<string, string>,
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns false when sources is empty object even with other evidence", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: {},
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns true when sources resolves finding's sourceId to exact dataset version", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
      });
      expect(hasProvenance(finding)).toBe(true);
    });

    test("returns false when dataRelease.sources does not contain finding's sourceId", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: { "unrelated.source": "dataset-version-1" },
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns false when dataRelease.sources has mismatched version for finding's sourceId", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [{ evidenceType: "constraint", constraintSnapshotId: "c1" } as FindingEvidence],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: {
            "maru.cadastre.parcels": "dataset-version-2",
            "maru.planning.spatial": "dataset-version-1",
          },
        },
      });
      expect(hasProvenance(finding)).toBe(false);
    });

    test("returns true with evidence-level source evidence even when release sources mismatch", () => {
      const finding = makeValidFinding({
        state: "conflict",
        evidence: [
          {
            evidenceType: "source",
            sourceSyncRunId: "sync-1",
            sourceDatasetVersionId: "dataset-version-1",
            source: makeBaseSourceProvenance(),
          } as FindingEvidence,
        ],
        dataRelease: {
          ...makeBaseDataRelease(),
          sources: { "unrelated.source": "dataset-version-1" },
        },
      });
      expect(hasProvenance(finding)).toBe(true);
    });
  });
});
