import {
  normalizeCadastralId,
  isValidCadastralId,
  validateParcel,
  type Parcel,
  type SourceProvenance,
  type FreshnessState,
} from "./types";

describe("parcel domain model (KT-020)", () => {
  describe("normalizeCadastralId", () => {
    test("trims whitespace", () => {
      expect(normalizeCadastralId("  12345  ")).toBe("12345");
    });

    test("removes dots dashes spaces and colons", () => {
      expect(normalizeCadastralId("12345-6789")).toBe("123456789");
      expect(normalizeCadastralId("12345.6789")).toBe("123456789");
      expect(normalizeCadastralId("12345 6789")).toBe("123456789");
      expect(normalizeCadastralId("41201:004:0110")).toBe("412010040110");
    });

    test("normalizes official colon-delimited cadastral id", () => {
      expect(normalizeCadastralId("78401:101:3143")).toBe("784011013143");
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

    test("accepts official colon-delimited ids", () => {
      expect(isValidCadastralId("41201:004:0110")).toBe(true);
      expect(isValidCadastralId("78401:101:3143")).toBe(true);
    });

    test("rejects ids with letters", () => {
      expect(isValidCadastralId("12345abc")).toBe(false);
    });

    test("rejects empty string", () => {
      expect(isValidCadastralId("")).toBe(false);
    });

    test("normalizes before validating", () => {
      expect(isValidCadastralId(" 12345-6789 ")).toBe(true);
      expect(isValidCadastralId(" 41201:004:0110 ")).toBe(true);
    });
  });

  describe("validateParcel", () => {
    const makePolygon = (overrides: Partial<Parcel> = {}): Parcel => ({
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

    const makeMultiPolygon = (overrides: Partial<Parcel> = {}): Parcel => ({
      id: "parcel-2",
      cadastralId: "1234567890",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        ],
      },
      geometryCrs: "EPSG:3301",
      facts: { areaM2Computed: 2000 },
      source: {
        sourceId: "maru.cadastre.parcels",
        sourceDatasetVersionId: "version-1",
        sourceSyncRunId: "sync-1",
        normalizerVersion: "1",
        retrievedAt: "2026-08-01T00:00:00Z",
      },
      freshnessState: "fresh",
      contentHash: "def456",
      ...overrides,
    });

    test("returns valid for a complete Polygon parcel", () => {
      const result = validateParcel(makePolygon());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns valid for a complete MultiPolygon parcel", () => {
      const result = validateParcel(makeMultiPolygon());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("requires id", () => {
      const result = validateParcel(makePolygon({ id: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    test("requires cadastralId", () => {
      const result = validateParcel(makePolygon({ cadastralId: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "cadastralId")).toBe(true);
    });

    test("requires valid cadastralId format", () => {
      const result = validateParcel(makePolygon({ cadastralId: "not-a-id" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "cadastralId")).toBe(true);
    });

    test("requires geometry", () => {
      const result = validateParcel(
        makePolygon({ geometry: null as unknown as Parcel["geometry"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("requires Polygon or MultiPolygon geometry type", () => {
      const result = validateParcel(
        makePolygon({
          geometry: { type: "LineString" as Parcel["geometry"]["type"], coordinates: [] },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("rejects empty Polygon coordinates", () => {
      const result = validateParcel(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [],
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects Polygon with MultiPolygon nesting (4-D coordinates)", () => {
      const result = validateParcel(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, 0],
                ],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon ring with fewer than 4 positions", () => {
      const result = validateParcel(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon with unclosed ring", () => {
      const result = validateParcel(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon with non-finite coordinate", () => {
      const result = validateParcel(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [NaN, 0],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0][4][0]")).toBe(true);
    });

    test("rejects empty MultiPolygon coordinates", () => {
      const result = validateParcel(
        makeMultiPolygon({
          geometry: {
            type: "MultiPolygon",
            coordinates: [],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects MultiPolygon with empty polygon", () => {
      const result = validateParcel(
        makeMultiPolygon({
          geometry: {
            type: "MultiPolygon",
            coordinates: [[]],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects MultiPolygon with short ring", () => {
      const result = validateParcel(
        makeMultiPolygon({
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0]")).toBe(true);
    });

    test("rejects MultiPolygon with unclosed ring", () => {
      const result = validateParcel(
        makeMultiPolygon({
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0]")).toBe(true);
    });

    test("rejects MultiPolygon with non-finite coordinate", () => {
      const result = validateParcel(
        makeMultiPolygon({
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, Infinity],
                ],
              ],
            ],
          } as unknown as Parcel["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0][4][1]")).toBe(true);
    });

    test("requires geometryCrs", () => {
      const result = validateParcel(makePolygon({ geometryCrs: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("rejects unsupported geometryCrs", () => {
      const result = validateParcel(makePolygon({ geometryCrs: "EPSG:banana" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("accepts supported geometryCrs values", () => {
      const epsg4326 = validateParcel(makePolygon({ geometryCrs: "EPSG:4326" }));
      expect(epsg4326.valid).toBe(true);

      const epsg3301 = validateParcel(makePolygon({ geometryCrs: "EPSG:3301" }));
      expect(epsg3301.valid).toBe(true);
    });

    test("warns when computed area is non-positive", () => {
      const result = validateParcel(makePolygon({ facts: { areaM2Computed: 0 } }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((e) => e.field === "facts.areaM2Computed")).toBe(true);
    });

    test("requires source fields", () => {
      const result = validateParcel(
        makePolygon({
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

    test("rejects invalid retrievedAt timestamp", () => {
      const result = validateParcel(
        makePolygon({ source: { ...makePolygon().source, retrievedAt: "not-a-date" } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
    });

    test("rejects invalid sourceEffectiveAt timestamp", () => {
      const result = validateParcel(
        makePolygon({
          source: {
            ...makePolygon().source,
            sourceEffectiveAt: "not-a-date",
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "source.sourceEffectiveAt")).toBe(true);
    });

    test("accepts valid sourceEffectiveAt timestamp", () => {
      const result = validateParcel(
        makePolygon({
          source: {
            ...makePolygon().source,
            sourceEffectiveAt: "2026-01-01T00:00:00Z",
          },
        })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects invalid freshnessState", () => {
      const result = validateParcel(
        makePolygon({ freshnessState: "not-a-state" as unknown as FreshnessState })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "freshnessState")).toBe(true);
    });

    test("accepts all valid freshnessState values", () => {
      const states: FreshnessState[] = ["fresh", "warning", "stale", "unknown"];
      for (const state of states) {
        const result = validateParcel(makePolygon({ freshnessState: state }));
        expect(result.valid).toBe(true);
      }
    });

    test("warns when contentHash is empty", () => {
      const result = validateParcel(makePolygon({ contentHash: "" }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((e) => e.field === "contentHash")).toBe(true);
    });
  });
});
