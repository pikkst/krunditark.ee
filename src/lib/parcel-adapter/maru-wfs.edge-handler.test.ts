import { describe, test, expect, vi } from "vitest";
import { edgeParcelLookup } from "./maru-wfs.edge-handler";

function mockFetchResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "content-type": "application/json",
      ...headers,
    }),
    json: async () => body,
  } as unknown as Response;
}

const BASE_WFS_URL = "https://inspire.geoportaal.ee/geoserver/CP_katastriyksused/wfs";
const SYNC_RUN = "test-sync-run-001";
const RETRIEVED_AT = "2026-08-20T06:00:00Z";

const VALID_FEATURE_COLLECTION = {
  type: "FeatureCollection",
  features: [
    {
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
    },
  ],
  crs: {
    type: "name",
    properties: {
      name: "urn:ogc:def:crs:EPSG::3301",
    },
  },
};

describe("edgeParcelLookup (KT-033)", () => {
  test("returns canonical Parcel for valid response", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(VALID_FEATURE_COLLECTION));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parcel.id).toBe("CP.CadastralParcel.C-78401:101:3143");
      expect(result.parcel.cadastralId).toBe("784011013143");
      expect(result.parcel.geometryCrs).toBe("EPSG:3301");
      expect(result.parcel.facts.areaM2Computed).toBe(1511);
      expect(result.parcel.source.sourceId).toBe("maru.cadastre.parcels.inspire");
      expect(result.parcel.source.sourceDatasetVersionId).toBe("2026-08-16");
      expect(result.parcel.source.sourceSyncRunId).toBe(SYNC_RUN);
      expect(result.parcel.freshnessState).toBe("fresh");
    }
  });

  test("rejects PARCEL_NOT_FOUND for empty features", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "FeatureCollection",
        features: [],
        crs: { type: "name", properties: { name: "EPSG:3301" } },
      })
    );

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("PARCEL_NOT_FOUND");
      expect(result.status).toBe(404);
    }
  });

  test("rejects AMBIGUOUS_RESULT for multiple features", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "FeatureCollection",
        features: [VALID_FEATURE_COLLECTION.features[0], VALID_FEATURE_COLLECTION.features[0]],
        crs: { type: "name", properties: { name: "EPSG:3301" } },
      })
    );

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("AMBIGUOUS_RESULT");
      expect(result.status).toBe(409);
    }
  });

  test("rejects UNSUPPORTED_CRS for wrong response CRS", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        ...VALID_FEATURE_COLLECTION,
        crs: { type: "name", properties: { name: "EPSG:4326" } },
      })
    );

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("CRS must be EPSG:3301");
      expect(result.status).toBe(502);
    }
  });

  test("rejects malformed geometry with null position", async () => {
    const badCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "CP.CadastralParcel.C-78401:101:3143",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [548139.54000001, 6589085.57999901],
                null,
                [548128.31000001, 6589138.55999901],
                [548140.75000001, 6589144.11999901],
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
        },
      ],
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };

    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(badCollection));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("INVALID_COORDINATES");
      expect(result.status).toBe(502);
    }
  });

  test("rejects malformed geometry with wrong nested shape", async () => {
    const badCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "CP.CadastralParcel.C-78401:101:3143",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [548139.54000001, 6589085.57999901, "extra"],
                [548148.56000001, 6589089.40999901],
                [548128.31000001, 6589138.55999901],
                [548140.75000001, 6589144.11999901],
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
        },
      ],
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };

    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(badCollection));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("INVALID_COORDINATES");
      expect(result.status).toBe(502);
    }
  });

  test("retries once on transient 502 then succeeds", async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        return mockFetchResponse({ error: "UPSTREAM_ERROR" }, 502);
      }
      return mockFetchResponse(VALID_FEATURE_COLLECTION);
    });

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(true);
    expect(calls).toBe(2);
  });

  test("does not retry non-retryable 400", async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      calls++;
      return mockFetchResponse({ error: "BAD_REQUEST" }, 400);
    });

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    expect(calls).toBe(1);
  });

  test("rejects missing feature.id", async () => {
    const badCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: null,
          geometry: VALID_FEATURE_COLLECTION.features[0].geometry,
          properties: VALID_FEATURE_COLLECTION.features[0].properties,
        },
      ],
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };

    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(badCollection));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_FEATURE_ID");
      expect(result.status).toBe(502);
    }
  });

  test("rejects mismatched nationalcadastralreference", async () => {
    const badCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "CP.CadastralParcel.C-78401:101:3143",
          geometry: VALID_FEATURE_COLLECTION.features[0].geometry,
          properties: {
            ...VALID_FEATURE_COLLECTION.features[0].properties,
            nationalcadastralreference: "78407:701:6840",
          },
        },
      ],
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };

    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(badCollection));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_NATIONAL_REFERENCE");
      expect(result.status).toBe(502);
    }
  });

  test("rejects invalid beginlifespanversion via domain validation", async () => {
    const badCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "CP.CadastralParcel.C-78401:101:3143",
          geometry: VALID_FEATURE_COLLECTION.features[0].geometry,
          properties: {
            ...VALID_FEATURE_COLLECTION.features[0].properties,
            beginlifespanversion: "20251301",
          },
        },
      ],
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
    };

    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(badCollection));

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("DOMAIN_VALIDATION_FAILED");
      expect(result.status).toBe(502);
    }
  });

  test("rejects wrong collection type", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "NotAFeatureCollection",
        features: [VALID_FEATURE_COLLECTION.features[0]],
        crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
      })
    );

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_RESPONSE_TYPE");
      expect(result.status).toBe(502);
    }
  });

  test("rejects wrong feature type", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "FeatureCollection",
        features: [
          {
            type: "NotAFeature",
            id: "CP.CadastralParcel.C-78401:101:3143",
            geometry: VALID_FEATURE_COLLECTION.features[0].geometry,
            properties: VALID_FEATURE_COLLECTION.features[0].properties,
          },
        ],
        crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
      })
    );

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_FEATURE_TYPE");
      expect(result.status).toBe(502);
    }
  });

  test("rejects malformed JSON without retrying", async () => {
    const badResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => {
        throw new SyntaxError("Unexpected token in JSON");
      },
    } as unknown as Response;

    global.fetch = vi.fn().mockResolvedValue(badResponse);

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("PARSE_ERROR");
      expect(result.status).toBe(502);
    }
  });

  test("rejects null JSON root without retrying", async () => {
    const nullResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => null,
    } as unknown as Response;

    global.fetch = vi.fn().mockResolvedValue(nullResponse);

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_RESPONSE_TYPE");
      expect(result.status).toBe(502);
    }
  });

  test("rejects string JSON root without retrying", async () => {
    const stringResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => "not-an-object",
    } as unknown as Response;

    global.fetch = vi.fn().mockResolvedValue(stringResponse);

    const wfsUrl = new URL(BASE_WFS_URL);
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 10000,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("INVALID_RESPONSE_TYPE");
      expect(result.status).toBe(502);
    }
  });

  test("timeout protects body consumption and does not exceed maxAttempts", async () => {
    let fetchCalls = 0;
    global.fetch = vi
      .fn()
      .mockImplementation(async (_url: string, options?: { signal?: AbortSignal }) => {
        fetchCalls++;
        const signal = options?.signal;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 2000);
              signal?.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new DOMException("The user aborted a request.", "AbortError"));
              });
            });
            return {
              type: "FeatureCollection",
              features: [],
              crs: { type: "name", properties: { name: "EPSG:3301" } },
            };
          },
        } as unknown as Response;
      });

    const wfsUrl = new URL(BASE_WFS_URL);
    const startTime = Date.now();
    const result = await edgeParcelLookup({
      cadastralId: "78401:101:3143",
      wfsUrl,
      maxAttempts: 2,
      retryableStatuses: new Set([502]),
      timeoutMs: 100,
      syncRun: SYNC_RUN,
      retrievedAt: RETRIEVED_AT,
    });
    const elapsed = Date.now() - startTime;

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("SOURCE_TIMEOUT");
    }
    expect(fetchCalls).toBe(2);
    expect(elapsed).toBeLessThan(500);
  });
});
