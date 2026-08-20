import { vi } from "vitest";
import { edgeParcelResolve } from "./maru-wfs.resolve-handler";

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

const BASE_WFS_URL = "https://inspire.geoportaal.ee/geoserver/CP_katastriyksused/wfs";

function buildWfsUrl(cadastralRef: string): string {
  const url = new URL(BASE_WFS_URL);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", "CP_katastriyksused:CP.CadastralParcel");
  url.searchParams.set("cql_filter", `nationalcadastralreference='${cadastralRef}'`);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("count", "20");
  url.searchParams.set("srsName", "EPSG:3301");
  return url.toString();
}

const singleFeatureResponse = (cadastralRef: string) => ({
  type: "FeatureCollection",
  crs: { properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
  features: [
    {
      type: "Feature",
      id: "CP.CadastralParcel.1",
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
      properties: {
        nationalcadastralreference: cadastralRef,
        areavalue: 100000,
        label: "Test Address",
        gml_description: "Last update:2026-08-01",
        beginlifespanversion: "20260801",
        inspireid_identifier_localid: "local-1",
      },
    },
  ],
});

const ambiguousFeatureResponse = (ref1: string, ref2: string) => ({
  type: "FeatureCollection",
  crs: { properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
  features: [
    {
      type: "Feature",
      id: "CP.CadastralParcel.1",
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
      properties: {
        nationalcadastralreference: ref1,
        areavalue: 100000,
        label: "Address A",
        gml_description: "Last update:2026-08-01",
        beginlifespanversion: "20260801",
        inspireid_identifier_localid: "local-a",
      },
    },
    {
      type: "Feature",
      id: "CP.CadastralParcel.2",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [652000, 6602000],
            [653000, 6602000],
            [653000, 6603000],
            [652000, 6603000],
            [652000, 6602000],
          ],
        ],
      },
      properties: {
        nationalcadastralreference: ref2,
        areavalue: 110000,
        label: "Address B",
        gml_description: "Last update:2026-08-01",
        beginlifespanversion: "20260801",
        inspireid_identifier_localid: "local-b",
      },
    },
  ],
});

describe("edgeParcelResolve (KT-034)", () => {
  const syncRun = `maru-wfs-test-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  test("returns resolved when WFS returns exactly one feature", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(singleFeatureResponse("78401:101:3143")));

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].cadastralId).toBe("784011013143");
      expect(result.candidates[0].areaM2).toBe(100000);
      expect(result.candidates[0].source.id).toBe("maru.cadastre.parcels.inspire");
    }
  });

  test("returns ambiguous when WFS returns multiple features", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        mockFetchResponse(ambiguousFeatureResponse("78401:101:3143", "78401:101:3144"))
      );

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates).toHaveLength(2);
    }
  });

  test("returns not_found when WFS returns empty features", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "FeatureCollection",
        crs: { properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
        features: [],
      })
    );

    const result = await edgeParcelResolve({
      cadastralId: "000000000000",
      wfsUrl: new URL(buildWfsUrl("00000:000:0000")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("not_found");
    expect(result.candidates).toHaveLength(0);
  });

  test("returns not_found for parse errors that are not critical", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        type: "FeatureCollection",
        crs: { properties: { name: "urn:ogc:def:crs:EPSG::3301" } },
        features: [],
      })
    );

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("not_found");
  });

  test("returns unavailable on non-JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse("not json", 200));

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("unavailable");
  });

  test("returns unavailable on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network failure"));

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("unavailable");
  });

  test("retries on retryable status and eventually succeeds", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockFetchResponse({ error: "rate limited" }, 429);
      }
      return mockFetchResponse(singleFeatureResponse("78401:101:3143"));
    });

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("resolved");
    expect(callCount).toBe(2);
  });

  test("returns not_found on non-retryable upstream error", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: "forbidden" }, 403));

    const result = await edgeParcelResolve({
      cadastralId: "784011013143",
      wfsUrl: new URL(buildWfsUrl("78401:101:3143")),
      maxAttempts: 2,
      retryableStatuses: new Set([429, 502, 503, 504]),
      timeoutMs: 10_000,
      syncRun,
      retrievedAt,
    });

    expect(result.status).toBe("unavailable");
  });
});
