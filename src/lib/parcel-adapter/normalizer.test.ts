import { parseProviderParcel } from "./normalizer";
import type { ProviderParcelDTO } from "./types";

const VALID_PROVIDER_PAYLOAD: ProviderParcelDTO = {
  cadastralNumber: "78401:101:3143",
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
  crs: "EPSG:3301",
  facts: {
    areaSqm: 100000,
    addressText: "Test address 1",
    landUseData: { zone: "residential" },
  },
  source: {
    id: "maru.cadastre.parcels",
    datasetVersion: "2026-08-01",
    syncRun: "sync-2026-08-01-001",
    objectId: "obj-12345",
    normalizerVersion: "1",
    retrievedAt: "2026-08-01T00:00:00Z",
    effectiveAt: "2026-08-01T00:00:00Z",
  },
  freshness: "fresh",
  contentHash: "abc123def456",
};

const VALID_MULTIPOLYGON_PAYLOAD: ProviderParcelDTO = {
  cadastralNumber: "1234567890",
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
  },
  crs: "EPSG:3301",
  facts: {
    areaSqm: 200000,
  },
  source: {
    id: "maru.cadastre.parcels",
    datasetVersion: "2026-08-01",
    syncRun: "sync-2026-08-01-002",
    normalizerVersion: "1",
    retrievedAt: "2026-08-01T00:00:00Z",
  },
  freshness: "fresh",
};

describe("parseProviderParcel (KT-028 runtime boundary)", () => {
  describe("success path", () => {
    test("normalizes a valid Polygon provider payload to canonical Parcel", () => {
      const result = parseProviderParcel(VALID_PROVIDER_PAYLOAD);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parcel.id).toBe("obj-12345");
        expect(result.parcel.cadastralId).toBe("784011013143");
        expect(result.parcel.geometry.type).toBe("Polygon");
        expect(result.parcel.geometryCrs).toBe("EPSG:3301");
        expect(result.parcel.facts.areaM2Computed).toBe(100000);
        expect(result.parcel.facts.addressText).toBe("Test address 1");
        expect(result.parcel.facts.landUseData).toEqual({ zone: "residential" });
        expect(result.parcel.source.sourceId).toBe("maru.cadastre.parcels");
        expect(result.parcel.source.sourceDatasetVersionId).toBe("2026-08-01");
        expect(result.parcel.source.sourceSyncRunId).toBe("sync-2026-08-01-001");
        expect(result.parcel.source.sourceObjectId).toBe("obj-12345");
        expect(result.parcel.source.normalizerVersion).toBe("1");
        expect(result.parcel.source.retrievedAt).toBe("2026-08-01T00:00:00Z");
        expect(result.parcel.source.sourceEffectiveAt).toBe("2026-08-01T00:00:00Z");
        expect(result.parcel.freshnessState).toBe("fresh");
        expect(result.parcel.contentHash).toBe("abc123def456");
        expect(result.warnings).toHaveLength(0);
      }
    });

    test("normalizes a valid MultiPolygon provider payload to canonical Parcel", () => {
      const result = parseProviderParcel(VALID_MULTIPOLYGON_PAYLOAD);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parcel.geometry.type).toBe("MultiPolygon");
        expect(result.parcel.cadastralId).toBe("1234567890");
        expect(result.parcel.facts.areaM2Computed).toBe(200000);
      }
    });

    test("generates id from source.objectId when present", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        source: {
          ...VALID_PROVIDER_PAYLOAD.source,
          objectId: "obj-99999",
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parcel.id).toBe("obj-99999");
      }
    });

    test("rejects invalid freshness", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        freshness: "not-a-state" as unknown as string,
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FRESHNESS")).toBe(true);
      }
    });

    test("defaults contentHash to empty string when missing", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        contentHash: undefined,
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parcel.contentHash).toBe("");
      }
    });

    test("ignores unknown provider fields", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        providerSecret: "should-be-ignored",
        anotherUnknown: 42,
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        const serialized = JSON.stringify(result.parcel);
        expect(serialized).not.toContain("providerSecret");
        expect(serialized).not.toContain("anotherUnknown");
      }
    });

    test("returns domain warnings when contentHash is empty", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        contentHash: "",
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.field === "contentHash")).toBe(true);
      }
    });

    test("returns domain warnings when areaM2Computed is non-positive", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: {
          ...VALID_PROVIDER_PAYLOAD.facts,
          areaSqm: 0,
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.field === "facts.areaM2Computed")).toBe(true);
      }
    });

    test("accepts EPSG:4326 coordinates within valid bounds", () => {
      const payload: ProviderParcelDTO = {
        ...VALID_PROVIDER_PAYLOAD,
        crs: "EPSG:4326",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -90],
              [180, -90],
              [180, 90],
              [-180, 90],
              [-180, -90],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parcel.geometryCrs).toBe("EPSG:4326");
      }
    });
  });

  describe("top-level malformed payloads", () => {
    test("rejects null payload", () => {
      const result = parseProviderParcel(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects undefined payload", () => {
      const result = parseProviderParcel(undefined);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects array payload", () => {
      const result = parseProviderParcel([]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects string payload", () => {
      const result = parseProviderParcel("not-an-object");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects number payload", () => {
      const result = parseProviderParcel(42);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });
  });

  describe("missing required fields", () => {
    test("rejects missing cadastralNumber", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, cadastralNumber: undefined };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_CADASTRAL_NUMBER")).toBe(true);
      }
    });

    test("rejects null cadastralNumber", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, cadastralNumber: null };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_CADASTRAL_NUMBER")).toBe(true);
      }
    });

    test("rejects missing geometry", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, geometry: undefined };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_GEOMETRY")).toBe(true);
      }
    });

    test("rejects geometry as array", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, geometry: [] };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_GEOMETRY")).toBe(true);
      }
    });

    test("rejects missing geometry type", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { coordinates: VALID_PROVIDER_PAYLOAD.geometry.coordinates },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_GEOMETRY_TYPE")).toBe(true);
      }
    });

    test("rejects invalid geometry type", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "LineString", coordinates: [] },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_GEOMETRY_TYPE")).toBe(true);
      }
    });

    test("rejects missing coordinates", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "Polygon" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_COORDINATES")).toBe(true);
      }
    });

    test("rejects missing crs", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, crs: undefined };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_CRS")).toBe(true);
      }
    });

    test("rejects unsupported crs", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, crs: "EPSG:9999" };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "UNSUPPORTED_CRS")).toBe(true);
      }
    });

    test("rejects missing facts", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, facts: undefined };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_FACTS")).toBe(true);
      }
    });

    test("rejects missing facts.areaSqm", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, areaSqm: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_FACTS_AREA_SQM")).toBe(true);
      }
    });

    test("rejects missing source", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, source: undefined };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_SOURCE")).toBe(true);
      }
    });

    test("rejects source as array", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, source: [] };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_SOURCE")).toBe(true);
      }
    });

    test("rejects missing source.id", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, id: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_SOURCE_ID")).toBe(true);
      }
    });

    test("rejects missing source.datasetVersion", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, datasetVersion: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_DATASET_VERSION")).toBe(true);
      }
    });

    test("rejects missing source.syncRun", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, syncRun: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_SYNC_RUN")).toBe(true);
      }
    });

    test("rejects missing source.normalizerVersion", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, normalizerVersion: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_NORMALIZER_VERSION")).toBe(true);
      }
    });

    test("rejects missing source.retrievedAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: undefined },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_RETRIEVED_AT")).toBe(true);
      }
    });
  });

  describe("wrong runtime types", () => {
    test("rejects cadastralNumber as number", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, cadastralNumber: 12345 };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_CADASTRAL_NUMBER")).toBe(true);
      }
    });

    test("rejects geometry.type as number", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: 123, coordinates: VALID_PROVIDER_PAYLOAD.geometry.coordinates },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_GEOMETRY_TYPE")).toBe(true);
      }
    });

    test("rejects geometry.coordinates as string", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "Polygon", coordinates: "not-array" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_COORDINATES")).toBe(true);
      }
    });

    test("rejects crs as number", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, crs: 4326 };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_CRS")).toBe(true);
      }
    });

    test("rejects source.id as number", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, id: 123 },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_SOURCE_ID")).toBe(true);
      }
    });

    test("rejects source.datasetVersion as number", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, datasetVersion: 2026 },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_DATASET_VERSION")).toBe(true);
      }
    });

    test("rejects source.retrievedAt as number", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: 20260801 },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_RETRIEVED_AT")).toBe(true);
      }
    });

    test("rejects facts.areaSqm as string", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, areaSqm: "100" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_AREA_SQM")).toBe(true);
      }
    });

    test("rejects source.objectId as number when provided", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, objectId: 123 },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
      }
    });

    test("rejects contentHash as number when provided", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        contentHash: 123,
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
      }
    });

    test("rejects facts.addressText as number when provided", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, addressText: 123 },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_ADDRESS_TEXT")).toBe(true);
      }
    });

    test("rejects facts.landUseData as string when provided", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, landUseData: "not-an-object" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_LAND_USE_DATA")).toBe(true);
      }
    });
  });

  describe("invalid geometry", () => {
    test("rejects empty Polygon coordinates", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "Polygon", coordinates: [] },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
      }
    });

    test("rejects Polygon ring with fewer than 4 positions", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "Polygon",
          coordinates: [
            [650000, 6600000],
            [651000, 6600000],
            [651000, 6601000],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
      }
    });

    test("rejects Polygon with unclosed ring", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "Polygon",
          coordinates: [
            [650000, 6600000],
            [651000, 6600000],
            [651000, 6601000],
            [650000, 6601000],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
      }
    });

    test("rejects Polygon with non-finite coordinate", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [650000, 6600000],
              [651000, 6600000],
              [651000, 6601000],
              [650000, 6601000],
              [NaN, 6600000],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][4][0]")).toBe(true);
      }
    });

    test("rejects Polygon with extra malformed ordinate", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [650000, 6600000],
              [651000, 6600000],
              [651000, 6601000],
              [650000, 6601000],
              [650000, 6600000, "junk"],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][4]")).toBe(true);
      }
    });

    test("rejects MultiPolygon with empty coordinates", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "MultiPolygon", coordinates: [] },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
      }
    });

    test("rejects MultiPolygon with empty polygon", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: { type: "MultiPolygon", coordinates: [[]] },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
      }
    });

    test("rejects MultiPolygon with short ring", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [650000, 6600000],
              [651000, 6600000],
              [651000, 6601000],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0]")).toBe(true);
      }
    });

    test("rejects MultiPolygon with unclosed ring", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [650000, 6600000],
              [651000, 6600000],
              [651000, 6601000],
              [650500, 6600500],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0]")).toBe(true);
      }
    });

    test("rejects MultiPolygon with Infinity coordinate", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
                [650000, 6601000],
                [650000, Infinity],
              ],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0][4][1]")).toBe(
          true
        );
      }
    });

    test("rejects EPSG:4326 coordinate out of longitude range", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        crs: "EPSG:4326",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [999, 59.4],
              [999, 59.4],
              [999, 59.4],
              [999, 59.4],
              [999, 59.4],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0][0]")).toBe(true);
      }
    });

    test("rejects EPSG:4326 coordinate out of latitude range", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        crs: "EPSG:4326",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [24.7, 999],
              [24.7, 999],
              [24.7, 999],
              [24.7, 999],
              [24.7, 999],
            ],
          ],
        },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "geometry.coordinates[0][0][1]")).toBe(true);
      }
    });

    test("rejects EPSG:3301 coordinate outside Estonian bounds", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        geometry: {
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
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(
          result.errors.some(
            (e) => e.field.startsWith("geometry.coordinates[0][") && e.field.endsWith("][0]")
          )
        ).toBe(true);
      }
    });
  });

  describe("non-finite numeric input", () => {
    test("rejects NaN areaSqm", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, areaSqm: NaN },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_AREA_SQM")).toBe(true);
      }
    });

    test("rejects Infinity areaSqm", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, areaSqm: Infinity },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_AREA_SQM")).toBe(true);
      }
    });

    test("rejects -Infinity areaSqm", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        facts: { ...VALID_PROVIDER_PAYLOAD.facts, areaSqm: -Infinity },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FACTS_AREA_SQM")).toBe(true);
      }
    });
  });

  describe("invalid timestamps", () => {
    test("rejects invalid retrievedAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "not-a-date" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
      }
    });

    test("rejects invalid effectiveAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, effectiveAt: "not-a-date" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.effectiveAt")).toBe(true);
      }
    });

    test("rejects impossible calendar date 2026-02-30", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "2026-02-30T00:00:00Z" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
      }
    });

    test("rejects locale-style date string", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "01.08.2026 00:00:00" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
      }
    });

    test("rejects empty string retrievedAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_RETRIEVED_AT")).toBe(true);
      }
    });

    test("rejects empty string effectiveAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, effectiveAt: "" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("rejects timezone offset +24:00", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "2026-01-01T00:00:00+24:00" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
      }
    });

    test("rejects timezone offset +01:60", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "2026-01-01T00:00:00+01:60" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "source.retrievedAt")).toBe(true);
      }
    });

    test("accepts valid retrievedAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, retrievedAt: "2026-01-01T00:00:00Z" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
    });

    test("accepts valid effectiveAt", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: { ...VALID_PROVIDER_PAYLOAD.source, effectiveAt: "2026-01-01T00:00:00Z" },
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid freshness", () => {
    test("rejects invalid freshness", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, freshness: "not-a-state" };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FRESHNESS")).toBe(true);
      }
    });

    test("rejects non-string freshness as number", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, freshness: 123 };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FRESHNESS")).toBe(true);
      }
    });

    test("rejects non-string freshness as object", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, freshness: {} };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FRESHNESS")).toBe(true);
      }
    });

    test("rejects non-string freshness as array", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, freshness: [] };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_FRESHNESS")).toBe(true);
      }
    });

    test("accepts all valid freshness values", () => {
      const states = ["fresh", "warning", "stale", "unknown"];
      for (const state of states) {
        const payload = { ...VALID_PROVIDER_PAYLOAD, freshness: state };
        const result = parseProviderParcel(payload);
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.parcel.freshnessState).toBe(state);
        }
      }
    });
  });

  describe("domain validation failures", () => {
    test("rejects provider payload with invalid cadastralId format via domain validation", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        cadastralNumber: "not-a-id",
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_CADASTRAL_NUMBER")).toBe(true);
      }
    });

    test("rejects provider payload with unsupported CRS via domain validation", () => {
      const payload = { ...VALID_PROVIDER_PAYLOAD, crs: "EPSG:banana" };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "UNSUPPORTED_CRS")).toBe(true);
      }
    });

    test("rejects provider payload with empty id after construction", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        source: {
          ...VALID_PROVIDER_PAYLOAD.source,
          objectId: undefined,
        },
        cadastralNumber: "",
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(false);
    });
  });

  describe("extras / unknown fields policy", () => {
    test("unknown top-level fields do not appear in canonical Parcel", () => {
      const payload = {
        ...VALID_PROVIDER_PAYLOAD,
        providerSecret: "secret-value",
        internalFlag: true,
      };
      const result = parseProviderParcel(payload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        const serialized = JSON.stringify(result.parcel);
        expect(serialized).not.toContain("providerSecret");
        expect(serialized).not.toContain("internalFlag");
      }
    });
  });

  describe("no uncaught exceptions", () => {
    test("never throws on any input", () => {
      const malformedInputs: unknown[] = [
        null,
        undefined,
        123,
        "string",
        true,
        false,
        [],
        {},
        { geometry: null },
        { source: null },
        { cadastralNumber: { nested: "object" } },
        { geometry: { type: null, coordinates: null } },
        {
          source: {
            id: null,
            datasetVersion: null,
            syncRun: null,
            normalizerVersion: null,
            retrievedAt: null,
          },
        },
      ];
      for (const input of malformedInputs) {
        expect(() => parseProviderParcel(input)).not.toThrow();
      }
    });
  });

  describe("canonical contract isolation", () => {
    test("successful parse returns only canonical Parcel shape", () => {
      const result = parseProviderParcel(VALID_PROVIDER_PAYLOAD);
      expect(result.valid).toBe(true);
      if (result.valid) {
        const keys = Object.keys(result.parcel);
        expect(keys).toEqual([
          "id",
          "cadastralId",
          "geometry",
          "geometryCrs",
          "facts",
          "source",
          "freshnessState",
          "contentHash",
        ]);
        expect(
          (result.parcel as unknown as Record<string, unknown>).cadastralNumber
        ).toBeUndefined();
        expect((result.parcel as unknown as Record<string, unknown>).areaSqm).toBeUndefined();
        expect((result.parcel as unknown as Record<string, unknown>).crs).toBeUndefined();
        expect((result.parcel as unknown as Record<string, unknown>).geometry).toBeDefined();
        expect((result.parcel as unknown as Record<string, unknown>).source).toBeDefined();
      }
    });
  });
});
