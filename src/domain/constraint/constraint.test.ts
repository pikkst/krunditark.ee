import {
  validateConstraint,
  type Constraint,
  type ConstraintGeometry,
  type FreshnessState,
} from "./types";

describe("constraint domain model (KT-022)", () => {
  const makePoint = (overrides: Partial<Constraint> = {}): Constraint => ({
    id: "constraint-1",
    category: "cadastral_restriction",
    geometry: { type: "Point", coordinates: [650000, 6600000] },
    geometryCrs: "EPSG:3301",
    source: {
      sourceId: "maru.cadastre.restrictions",
      sourceDatasetVersionId: "version-1",
      sourceSyncRunId: "sync-1",
      sourceObjectId: "OBJ-001",
      normalizerVersion: "1",
      retrievedAt: "2026-08-01T00:00:00Z",
    },
    facts: { name: "Test restriction" },
    freshnessState: "fresh",
    contentHash: "abc123",
    ...overrides,
  });

  const makePolygon = (overrides: Partial<Constraint> = {}): Constraint => ({
    id: "constraint-2",
    category: "environment",
    subcategory: "protected_area",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [650000, 6600000],
          [651000, 6600000],
          [651000, 6601000],
          [650000, 6601000],
          [650000, 6600000],
        ],
      ],
    },
    geometryCrs: "EPSG:3301",
    impactGeometry: {
      type: "Polygon",
      coordinates: [
        [
          [649500, 6599500],
          [651500, 6599500],
          [651500, 6601500],
          [649500, 6601500],
          [649500, 6599500],
        ],
      ],
    },
    impactGeometryCrs: "EPSG:3301",
    source: {
      sourceId: "eelis.protected_areas",
      sourceDatasetVersionId: "version-2",
      sourceSyncRunId: "sync-2",
      sourceObjectId: "OBJ-002",
      normalizerVersion: "1",
      retrievedAt: "2026-08-01T00:00:00Z",
    },
    facts: {
      name: "Protected zone",
      sourceAttributes: { level: "I" },
    },
    sourceEffectiveFrom: "2026-01-01T00:00:00Z",
    sourceEffectiveTo: "2027-01-01T00:00:00Z",
    freshnessState: "fresh",
    contentHash: "def456",
    ...overrides,
  });

  describe("validateConstraint", () => {
    test("returns valid for a complete Point constraint", () => {
      const result = validateConstraint(makePoint());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns valid for a complete Polygon constraint with impact geometry", () => {
      const result = validateConstraint(makePolygon());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("requires id", () => {
      const result = validateConstraint(makePoint({ id: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    test("requires category", () => {
      const result = validateConstraint(
        makePoint({ category: "" as unknown as Constraint["category"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    });

    test("rejects unsupported category value", () => {
      const result = validateConstraint(
        makePoint({ category: "banana" as unknown as Constraint["category"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    });

    test("rejects non-string category", () => {
      const result = validateConstraint(
        makePoint({ category: 123 as unknown as Constraint["category"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    });

    test("accepts all valid ConstraintCategory values", () => {
      const categories = [
        "cadastral_restriction",
        "environment",
        "heritage",
        "road",
        "utility",
        "planning",
        "other",
      ];
      for (const category of categories) {
        const result = validateConstraint(
          makePoint({ category: category as unknown as Constraint["category"] })
        );
        expect(result.valid).toBe(true);
      }
    });

    test("rejects non-string subcategory", () => {
      const result = validateConstraint(makePoint({ subcategory: 123 as unknown as string }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "subcategory")).toBe(true);
    });

    test("rejects subcategory exceeding max length", () => {
      const result = validateConstraint(makePoint({ subcategory: "a".repeat(101) }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "subcategory")).toBe(true);
    });

    test("requires geometry", () => {
      const result = validateConstraint(
        makePoint({ geometry: null as unknown as ConstraintGeometry })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("requires geometryCrs", () => {
      const result = validateConstraint(makePoint({ geometryCrs: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("rejects unsupported geometryCrs", () => {
      const result = validateConstraint(makePoint({ geometryCrs: "EPSG:4326" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("rejects invalid Point coordinates", () => {
      const result = validateConstraint(
        makePoint({
          geometry: { type: "Point", coordinates: [NaN, 6600000] } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Point with fewer than 2 coordinates", () => {
      const result = validateConstraint(
        makePoint({
          geometry: { type: "Point", coordinates: [650000] } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects LineString with fewer than 2 positions", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "LineString",
            coordinates: [[650000, 6600000]],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects Polygon with unclosed ring", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
                [650000, 6601000],
              ],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon ring with fewer than 4 positions", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
              ],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects MultiPolygon with empty coordinates", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "MultiPolygon",
            coordinates: [],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects MultiPolygon with empty polygon", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "MultiPolygon",
            coordinates: [[]],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects EPSG:3301 coordinate outside Estonian bounds", () => {
      const result = validateConstraint(
        makePoint({
          geometry: { type: "Point", coordinates: [0, 0] } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith("geometry.coordinates["))).toBe(true);
    });

    test("requires sourceId", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, sourceId: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceId")).toBe(true);
    });

    test("requires sourceDatasetVersionId", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, sourceDatasetVersionId: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceDatasetVersionId")).toBe(true);
    });

    test("requires sourceSyncRunId", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, sourceSyncRunId: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceSyncRunId")).toBe(true);
    });

    test("requires sourceObjectId", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, sourceObjectId: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceObjectId")).toBe(true);
    });

    test("requires normalizerVersion", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, normalizerVersion: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.normalizerVersion")).toBe(true);
    });

    test("requires retrievedAt", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, retrievedAt: "" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
    });

    test("rejects invalid retrievedAt timestamp", () => {
      const result = validateConstraint(
        makePoint({
          source: { ...makePoint().source, retrievedAt: "not-a-date" },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
    });

    test("rejects invalid sourceEffectiveFrom timestamp", () => {
      const result = validateConstraint(makePolygon({ sourceEffectiveFrom: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sourceEffectiveFrom")).toBe(true);
    });

    test("rejects invalid sourceEffectiveTo timestamp", () => {
      const result = validateConstraint(makePolygon({ sourceEffectiveTo: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sourceEffectiveTo")).toBe(true);
    });

    test("accepts valid effective date range", () => {
      const result = validateConstraint(
        makePolygon({
          sourceEffectiveFrom: "2026-01-01T00:00:00Z",
          sourceEffectiveTo: "2027-01-01T00:00:00Z",
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects effectiveFrom later than effectiveTo by numeric timestamp", () => {
      const result = validateConstraint(
        makePolygon({
          sourceEffectiveFrom: "2027-01-01T00:00:00Z",
          sourceEffectiveTo: "2026-01-01T00:00:00Z",
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sourceEffectiveFrom")).toBe(true);
    });

    test("accepts equal effective dates", () => {
      const result = validateConstraint(
        makePolygon({
          sourceEffectiveFrom: "2026-06-01T00:00:00Z",
          sourceEffectiveTo: "2026-06-01T00:00:00Z",
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects effectiveFrom later than effectiveTo with timezone offset", () => {
      const result = validateConstraint(
        makePolygon({
          sourceEffectiveFrom: "2027-01-01T10:00:00+03:00",
          sourceEffectiveTo: "2027-01-01T00:00:00-05:00",
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sourceEffectiveFrom")).toBe(true);
    });

    test("rejects invalid freshnessState", () => {
      const result = validateConstraint(
        makePoint({ freshnessState: "not-a-state" as unknown as FreshnessState })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "freshnessState")).toBe(true);
    });

    test("accepts all valid freshnessState values", () => {
      const states: FreshnessState[] = ["fresh", "warning", "stale", "unknown"];
      for (const state of states) {
        const result = validateConstraint(makePoint({ freshnessState: state }));
        expect(result.valid).toBe(true);
      }
    });

    test("rejects impactGeometry with mismatched CRS", () => {
      const result = validateConstraint(
        makePolygon({
          impactGeometryCrs: "EPSG:banana",
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "impactGeometryCrs")).toBe(true);
    });

    test("validates impactGeometry coordinates", () => {
      const result = validateConstraint(
        makePolygon({
          impactGeometry: {
            type: "Polygon",
            coordinates: [
              [
                [649500, 6599500],
                [651500, 6599500],
                [651500, 6601500],
              ],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith("impactGeometry.coordinates"))).toBe(
        true
      );
    });

    test("validates impactGeometry without separate CRS against geometryCrs", () => {
      const result = validateConstraint(
        makePolygon({
          impactGeometryCrs: undefined,
          impactGeometry: {
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
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith("impactGeometry.coordinates"))).toBe(
        true
      );
    });

    test("warns when contentHash is empty", () => {
      const result = validateConstraint(makePoint({ contentHash: "" }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((e) => e.field === "contentHash")).toBe(true);
    });

    test("accepts MultiLineString geometry", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6601000],
              ],
              [
                [652000, 6602000],
                [653000, 6603000],
              ],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(true);
    });

    test("accepts MultiPoint geometry", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "MultiPoint",
            coordinates: [
              [650000, 6600000],
              [651000, 6601000],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(true);
    });

    test("accepts MultiPolygon geometry", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [650000, 6600000],
                  [651000, 6600000],
                  [651000, 6601000],
                  [650000, 6601000],
                  [650000, 6600000],
                ],
              ],
              [
                [
                  [652000, 6602000],
                  [653000, 6602000],
                  [653000, 6603000],
                  [652000, 6603000],
                  [652000, 6602000],
                ],
              ],
            ],
          } as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects unknown geometry type", () => {
      const result = validateConstraint(
        makePoint({
          geometry: {
            type: "GeometryCollection",
            coordinates: [],
          } as unknown as ConstraintGeometry,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.type")).toBe(true);
    });

    test("requires sourceId when source object is present", () => {
      const result = validateConstraint(
        makePoint({
          source: {
            ...makePoint().source,
            sourceId: "",
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceId")).toBe(true);
    });

    test("returns validation errors instead of throwing when source is null", () => {
      const result = validateConstraint(
        makePoint({
          source: null as unknown as Constraint["source"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source")).toBe(true);
    });

    test("returns validation errors instead of throwing when source is undefined", () => {
      const result = validateConstraint(
        makePoint({
          source: undefined as unknown as Constraint["source"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source")).toBe(true);
    });

    test("validates sourceReference.sourceId when present", () => {
      const result = validateConstraint(
        makePoint({
          facts: {
            sourceReference: {
              sourceId: "",
            },
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.sourceReference.sourceId")).toBe(true);
    });

    test("accepts valid sourceReference", () => {
      const result = validateConstraint(
        makePolygon({
          facts: {
            name: "Test",
            sourceReference: {
              sourceId: "riigiteataja.ehitusseadustik",
              legalSourceId: "legal-1",
              authority: "Riigikogu",
              officialUrl: "https://www.riigiteataja.ee/akt/123",
              documentIdentifier: "EhS",
              sectionReference: "§ 12",
            },
          },
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects non-string sourceReference.officialUrl", () => {
      const result = validateConstraint(
        makePoint({
          facts: {
            sourceReference: {
              sourceId: "src-1",
              officialUrl: 123 as unknown as string,
            },
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.sourceReference.officialUrl")).toBe(true);
    });

    test("requires all source provenance fields", () => {
      const result = validateConstraint(
        makePoint({
          source: {
            sourceId: "",
            sourceDatasetVersionId: "",
            sourceSyncRunId: "",
            sourceObjectId: "",
            normalizerVersion: "",
            retrievedAt: "",
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.filter((e) => e.field.startsWith("source."))).toHaveLength(6);
    });
  });
});
