import {
  isValidFindingState,
  isValidSeverity,
  isValidEvidenceType,
  isValidNextActionCategory,
  isValidFindingCategory,
  isValidCompletenessState,
  isValidFreshnessState,
  isValidOverallResult,
  validateFinding,
  computeOverallResult,
  isMaterialFinding,
  hasProvenance,
  type Finding,
  type FindingState,
  type FindingSeverity,
  type EvidenceType,
  type NextActionCategory,
  type FindingCategory,
  type FindingEvidence,
  type CompletenessStatus,
  type FindingNextAction,
  type FindingSourceReference,
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
    authority: "Maa- ja Ruumiamet",
    officialUrl: "https://example.ee",
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
      cadastre: "dataset-version-1",
      planning_spatial: "dataset-version-1",
    },
    ruleSetManifestId: "ruleset-1",
  };
}

function makeValidFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-1",
    analysisId: "analysis-1",
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
    test("returns true when source and dataRelease are present", () => {
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
  });
});
