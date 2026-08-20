import { parseMaruWfsFeature, parseMaruWfsResponse } from "./maru-wfs.parser";

const RETRIEVED_AT = "2026-08-20T06:00:00Z";
const SYNC_RUN = "test-sync-run-001";

const VALID_FEATURE_1 = {
  type: "Feature",
  id: "CP.CadastralParcel.C-78401:101:3143",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [548139.54000001, 6589085.57999901],
        [548148.56000001, 6589089.40999901],
        [548128.31000001, 6589138.55999901],
        [548140.75000001, 6589144.11999901],
        [548125.86000001, 6589181.10999901],
        [548103.10000001, 6589171.44999901],
        [548139.54000001, 6589085.57999901],
      ],
    ],
  },
  properties: {
    nationalcadastralreference: "78401:101:3143",
    areavalue: 1511,
    label: "Punane tn 61c",
    validfrom: "20170831",
    beginlifespanversion: "20250228",
    gml_description: "Last update:2026-08-16",
    inspireid_identifier_localid: "C-78401:101:3143",
    inspireid_identifier_namespace: "ee.maaamet.cp-mr-kataster",
  },
};

const VALID_FEATURE_2 = {
  type: "Feature",
  id: "CP.CadastralParcel.C-78407:701:6840",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [539615.36000001, 6587248.25999901],
        [539599.06000001, 6587247.78999901],
        [539556.31000001, 6587158.41999901],
        [539594.28000001, 6587140.80999901],
        [539618.27000001, 6587129.68999901],
        [539635.56000001, 6587121.67999901],
        [539639.54000001, 6587119.81999901],
        [539676.12000001, 6587204.62999901],
        [539692.80000001, 6587243.30999901],
        [539694.13000001, 6587246.58999901],
        [539627.38000001, 6587274.64999901],
        [539615.36000001, 6587248.25999901],
      ],
    ],
  },
  properties: {
    nationalcadastralreference: "78407:701:6840",
    areavalue: 11690,
    label: "Mustamäe tee 51",
    validfrom: "19980629",
    beginlifespanversion: "20250228",
    gml_description: "Last update:2026-08-16",
    inspireid_identifier_localid: "C-78407:701:6840",
    inspireid_identifier_namespace: "ee.maaamet.cp-mr-kataster",
  },
};

const VALID_FEATURE_COLLECTION = {
  type: "FeatureCollection",
  features: [VALID_FEATURE_1],
  numberMatched: 1,
  numberReturned: 1,
  timeStamp: "2026-08-20T05:57:55.739Z",
  crs: {
    type: "name",
    properties: {
      name: "urn:ogc:def:crs:EPSG::3301",
    },
  },
};

describe("parseMaruWfsFeature (KT-033)", () => {
  test("parses a valid cadastral parcel feature to DTO", () => {
    const result = parseMaruWfsFeature(VALID_FEATURE_1, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.dto.cadastralNumber).toBe("78401:101:3143");
      expect(result.dto.geometry.type).toBe("Polygon");
      expect(result.dto.geometry.coordinates[0][0][0]).toBeCloseTo(548139.54, 1);
      expect(result.dto.geometry.coordinates[0][0][1]).toBeCloseTo(6589085.58, 1);
      expect(result.dto.crs).toBe("EPSG:3301");
      expect(result.dto.facts.areaSqm).toBe(1511);
      expect(result.dto.facts.addressText).toBe("Punane tn 61c");
      expect(result.dto.facts.landUseData?.validFrom).toBe("20170831");
      expect(result.dto.source.id).toBe("maru.cadastre.parcels.inspire");
      expect(result.dto.source.objectId).toBe("C-78401:101:3143");
      expect(result.dto.source.normalizerVersion).toBe("1");
      expect(result.dto.freshness).toBe("fresh");
      expect(result.dto.contentHash).toBe("");
      expect(result.dto.source.syncRun).toBe(SYNC_RUN);
    }
  });

  test("parses source version from gml_description", () => {
    const result = parseMaruWfsFeature(VALID_FEATURE_1, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.dto.source.datasetVersion).toBe("2026-08-16");
    }
  });

  test("produces deterministic output for same inputs", () => {
    const first = parseMaruWfsFeature(VALID_FEATURE_1, RETRIEVED_AT, SYNC_RUN);
    const second = parseMaruWfsFeature(VALID_FEATURE_1, RETRIEVED_AT, SYNC_RUN);
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (first.valid && second.valid) {
      expect(first.dto).toEqual(second.dto);
    }
  });

  test("rejects feature with missing gml_description source version", () => {
    const bad = {
      ...VALID_FEATURE_1,
      properties: { ...VALID_FEATURE_1.properties, gml_description: undefined },
    };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "SOURCE_VERSION_PARSE_FAILED")).toBe(true);
    }
  });

  test("rejects feature with missing nationalcadastralreference", () => {
    const bad = {
      ...VALID_FEATURE_1,
      properties: { ...VALID_FEATURE_1.properties, nationalcadastralreference: "" },
    };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "MISSING_NATIONAL_REFERENCE")).toBe(true);
    }
  });

  test("rejects feature with missing areavalue", () => {
    const bad = {
      ...VALID_FEATURE_1,
      properties: { ...VALID_FEATURE_1.properties, areavalue: undefined },
    };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "MISSING_AREA_VALUE")).toBe(true);
    }
  });

  test("rejects feature with non-numeric areavalue", () => {
    const bad = {
      ...VALID_FEATURE_1,
      properties: { ...VALID_FEATURE_1.properties, areavalue: "1511" },
    };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "INVALID_AREA_VALUE")).toBe(true);
    }
  });

  test("rejects feature with invalid geometry type", () => {
    const bad = {
      ...VALID_FEATURE_1,
      geometry: {
        type: "LineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
      },
    };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "INVALID_GEOMETRY_TYPE")).toBe(true);
    }
  });

  test("rejects feature with missing geometry", () => {
    const bad = { ...VALID_FEATURE_1, geometry: undefined };
    const result = parseMaruWfsFeature(bad, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.code === "MISSING_GEOMETRY")).toBe(true);
    }
  });

  test("never throws on malformed input", () => {
    const malformed: unknown[] = [null, undefined, 123, "string", true, false, [], {}];
    for (const input of malformed) {
      expect(() => parseMaruWfsFeature(input, RETRIEVED_AT, SYNC_RUN)).not.toThrow();
    }
  });
});

describe("parseMaruWfsResponse (KT-033)", () => {
  test("parses a valid FeatureCollection to canonical Parcel", () => {
    const result = parseMaruWfsResponse(VALID_FEATURE_COLLECTION, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parcels).toHaveLength(1);
      expect(result.parcels[0].cadastralId).toBe("784011013143");
      expect(result.parcels[0].geometryCrs).toBe("EPSG:3301");
      expect(result.parcels[0].facts.areaM2Computed).toBe(1511);
      expect(result.parcels[0].facts.addressText).toBe("Punane tn 61c");
      expect(result.parcels[0].source.sourceId).toBe("maru.cadastre.parcels.inspire");
      expect(result.parcels[0].source.sourceDatasetVersionId).toBe("2026-08-16");
      expect(result.parcels[0].freshnessState).toBe("fresh");
      expect(result.parcels[0].source.sourceSyncRunId).toBe(SYNC_RUN);
    }
  });

  test("rejects non-object response", () => {
    const result = parseMaruWfsResponse(null, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect((result.errors[0] as { code: string }).code).toBe("INVALID_RESPONSE_TYPE");
    }
  });

  test("rejects response with wrong type", () => {
    const result = parseMaruWfsResponse(
      { type: "NotFeatureCollection", features: [] },
      RETRIEVED_AT,
      SYNC_RUN
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect((result.errors[0] as { code: string }).code).toBe("INVALID_RESPONSE_TYPE");
    }
  });

  test("rejects empty features array", () => {
    const result = parseMaruWfsResponse(
      {
        type: "FeatureCollection",
        features: [],
        crs: { type: "name", properties: { name: "EPSG:3301" } },
      },
      RETRIEVED_AT,
      SYNC_RUN
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect((result.errors[0] as { code: string }).code).toBe("MISSING_FEATURES");
    }
  });

  test("rejects multiple features for exact lookup", () => {
    const multi = {
      type: "FeatureCollection",
      features: [VALID_FEATURE_1, VALID_FEATURE_2],
      numberMatched: 2,
      numberReturned: 2,
      timeStamp: "2026-08-20T06:00:00Z",
      crs: { type: "name", properties: { name: "EPSG:3301" } },
    };
    const result = parseMaruWfsResponse(multi, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect((result.errors[0] as { code: string }).code).toBe("MULTIPLE_FEATURES");
    }
  });

  test("propagates domain validation errors from normalizer", () => {
    const badFeature = {
      ...VALID_FEATURE_1,
      properties: { ...VALID_FEATURE_1.properties, nationalcadastralreference: "not-a-id" },
    };
    const response = {
      type: "FeatureCollection",
      features: [badFeature],
      numberMatched: 1,
      numberReturned: 1,
      timeStamp: "2026-08-20T06:00:00Z",
      crs: { type: "name", properties: { name: "EPSG:3301" } },
    };
    const result = parseMaruWfsResponse(response, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => (e as { code: string }).code === "INVALID_CADASTRAL_NUMBER")
      ).toBe(true);
    }
  });

  test("returns second feature as MultiPolygon", () => {
    const multiPolygonFeature = {
      ...VALID_FEATURE_1,
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [548139.54000001, 6589085.57999901],
              [548148.56000001, 6589089.40999901],
              [548128.31000001, 6589138.55999901],
              [548140.75000001, 6589144.11999901],
              [548139.54000001, 6589085.57999901],
            ],
          ],
          [
            [
              [539615.36000001, 6587248.25999901],
              [539599.06000001, 6587247.78999901],
              [539556.31000001, 6587158.41999901],
              [539594.28000001, 6587140.80999901],
              [539615.36000001, 6587248.25999901],
            ],
          ],
        ],
      },
    };
    const response = {
      type: "FeatureCollection",
      features: [multiPolygonFeature],
      numberMatched: 1,
      numberReturned: 1,
      timeStamp: "2026-08-20T06:00:00Z",
      crs: { type: "name", properties: { name: "EPSG:3301" } },
    };
    const result = parseMaruWfsResponse(response, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parcels[0].geometry.type).toBe("MultiPolygon");
    }
  });

  test("rejects response with missing CRS", () => {
    const response = {
      type: "FeatureCollection",
      features: [VALID_FEATURE_1],
      numberMatched: 1,
      numberReturned: 1,
      timeStamp: "2026-08-20T06:00:00Z",
    };
    const result = parseMaruWfsResponse(response, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => (e as { code: string }).code === "UNSUPPORTED_CRS")).toBe(
        true
      );
    }
  });

  test("rejects response with wrong CRS", () => {
    const response = {
      type: "FeatureCollection",
      features: [VALID_FEATURE_1],
      numberMatched: 1,
      numberReturned: 1,
      timeStamp: "2026-08-20T06:00:00Z",
      crs: { type: "name", properties: { name: "EPSG:4326" } },
    };
    const result = parseMaruWfsResponse(response, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => (e as { code: string }).code === "UNSUPPORTED_CRS")).toBe(
        true
      );
    }
  });

  test("accepts urn:ogc:def:crs:EPSG::3301 CRS", () => {
    const response = {
      type: "FeatureCollection",
      features: [VALID_FEATURE_1],
      numberMatched: 1,
      numberReturned: 1,
      timeStamp: "2026-08-20T06:00:00Z",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };
    const result = parseMaruWfsResponse(response, RETRIEVED_AT, SYNC_RUN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parcels[0].geometryCrs).toBe("EPSG:3301");
    }
  });
});
