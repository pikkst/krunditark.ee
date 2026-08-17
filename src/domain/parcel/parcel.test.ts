import {
  normalizeCadastralId,
  isValidCadastralId,
  validateParcel,
  type Parcel,
  type ParcelGeometry,
  type SourceProvenance,
  type GeometryType,
} from "./types";

describe("parcel domain model (KT-020)", () => {
  describe("normalizeCadastralId", () => {
    test("trims whitespace", () => {
      expect(normalizeCadastralId("  12345  ")).toBe("12345");
    });

    test("removes dots dashes and spaces", () => {
      expect(normalizeCadastralId("12345-6789")).toBe("123456789");
      expect(normalizeCadastralId("12345.6789")).toBe("123456789");
      expect(normalizeCadastralId("12345 6789")).toBe("123456789");
    });

    test("preserves already-normalized id", () => {
      expect(normalizeCadastralId("1234567890")).toBe("1234567890");
    });
  });

  describe("isValidCadastralId", () => {
    test("accepts numeric ids of typical length", () => {
      expect(isValidCadastralId("1234567890")).toBe(true);
      expect(isValidCadastralId("12345")).toBe(true);
    });

    test("rejects ids with letters", () => {
      expect(isValidCadastralId("12345abc")).toBe(false);
    });

    test("rejects empty string", () => {
      expect(isValidCadastralId("")).toBe(false);
    });

    test("normalizes before validating", () => {
      expect(isValidCadastralId(" 12345-6789 ")).toBe(true);
    });
  });

  describe("validateParcel", () => {
    const makeParcel = (overrides: Partial<Parcel> = {}): Parcel => ({
      id: "parcel-1",
      cadastralId: "1234567890",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      geometryCrs: "EPSG:3301",
      facts: { areaM2Computed: 1000 },
      source: {
        sourceId: "maru.cadastre.parcels",
        sourceDatasetVersionId: "version-1",
        sourceSyncRunId: "sync-1",
        normalizerVersion: "1",
        retrievedAt: "2026-08-01T00:00:00Z",
      },
      freshnessState: "fresh",
      contentHash: "abc123",
      ...overrides,
    });

    test("returns valid for a complete parcel", () => {
      const result = validateParcel(makeParcel());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("requires id", () => {
      const result = validateParcel(makeParcel({ id: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    test("requires cadastralId", () => {
      const result = validateParcel(makeParcel({ cadastralId: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "cadastralId")).toBe(true);
    });

    test("requires valid cadastralId format", () => {
      const result = validateParcel(makeParcel({ cadastralId: "not-a-id" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "cadastralId")).toBe(true);
    });

    test("requires geometry", () => {
      const result = validateParcel(makeParcel({ geometry: null as unknown as ParcelGeometry }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("requires Polygon or MultiPolygon geometry type", () => {
      const result = validateParcel(
        makeParcel({ geometry: { type: "LineString" as GeometryType, coordinates: [] } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("requires geometryCrs", () => {
      const result = validateParcel(makeParcel({ geometryCrs: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("warns when computed area is non-positive", () => {
      const result = validateParcel(makeParcel({ facts: { areaM2Computed: 0 } }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((e) => e.field === "facts.areaM2Computed")).toBe(true);
    });

    test("requires source fields", () => {
      const result = validateParcel(
        makeParcel({
          source: {
            sourceId: "",
            sourceDatasetVersionId: "",
            sourceSyncRunId: "",
            normalizerVersion: "",
            retrievedAt: "",
          } as SourceProvenance,
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.filter((e) => e.field.startsWith("source."))).toHaveLength(5);
    });

    test("warns when contentHash is empty", () => {
      const result = validateParcel(makeParcel({ contentHash: "" }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((e) => e.field === "contentHash")).toBe(true);
    });
  });
});
