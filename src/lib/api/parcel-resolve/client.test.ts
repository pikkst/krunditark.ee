import { vi } from "vitest";
import {
  resolveParcelByCadastralId,
  resolveParcelByAddressResult,
  resolveParcelByPoint,
} from "./client";

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("resolveParcelByCadastralId sends POST with cadastral selector", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "resolved",
      candidates: [
        {
          id: "C-78401:101:3143",
          cadastralId: "784011013143",
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
          facts: { areaM2Computed: 1511 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "2026-08-16",
            sourceSyncRunId: "edge-sync-123",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "fresh",
          contentHash: "",
        },
      ],
    })
  );

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("resolved");
    expect(result.response.candidates).toHaveLength(1);
    expect(result.response.candidates[0].cadastralId).toBe("784011013143");
  }

  const calledFetch = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
  const fetchOptions = calledFetch[1] as { method?: string; body?: string } | undefined;
  expect(fetchOptions?.method).toBe("POST");
  const body = JSON.parse(fetchOptions?.body ?? "{}");
  expect(body.selector.type).toBe("cadastral");
  expect(body.selector.cadastralId).toBe("78401:101:3143");
});

test("resolveParcelByAddressResult sends POST with address selector", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "resolved",
      candidates: [
        {
          id: "C-78401:101:3143",
          cadastralId: "784011013143",
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
          facts: { areaM2Computed: 1511 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "2026-08-16",
            sourceSyncRunId: "edge-sync-123",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "fresh",
          contentHash: "",
        },
      ],
    })
  );

  const result = await resolveParcelByAddressResult("inaks-0", "1234567890");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("resolved");
  }

  const calledFetch = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
  const fetchOptions = calledFetch[1] as { method?: string; body?: string } | undefined;
  expect(fetchOptions?.method).toBe("POST");
  const body = JSON.parse(fetchOptions?.body ?? "{}");
  expect(body.selector.type).toBe("address");
  expect(body.selector.addressResultId).toBe("inaks-0");
  expect(body.selector.addressId).toBe("1234567890");
});

test("resolveParcelByPoint sends POST with point selector", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "ambiguous",
      candidates: [
        {
          id: "C-78401:101:3143",
          cadastralId: "784011013143",
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
          facts: { areaM2Computed: 1511 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "2026-08-16",
            sourceSyncRunId: "edge-sync-123",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "fresh",
          contentHash: "",
        },
        {
          id: "C-78401:101:3144",
          cadastralId: "784011013144",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 0],
                [2, 0],
                [2, 1],
                [1, 1],
                [1, 0],
              ],
            ],
          },
          geometryCrs: "EPSG:3301",
          facts: { areaM2Computed: 1200 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "2026-08-16",
            sourceSyncRunId: "edge-sync-123",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "fresh",
          contentHash: "",
        },
      ],
    })
  );

  const result = await resolveParcelByPoint({ lat: 59.437, lng: 24.753 });

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("ambiguous");
    expect(result.response.candidates).toHaveLength(2);
    expect(result.response.candidates[0].cadastralId).toBe("784011013143");
    expect(result.response.candidates[1].cadastralId).toBe("784011013144");
  }

  const calledFetch = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
  const fetchOptions = calledFetch[1] as { method?: string; body?: string } | undefined;
  expect(fetchOptions?.method).toBe("POST");
  const body = JSON.parse(fetchOptions?.body ?? "{}");
  expect(body.selector.type).toBe("point");
  expect(body.selector.point.lat).toBe(59.437);
  expect(body.selector.point.lng).toBe(24.753);
});

test("maps ambiguous response preserving all candidates", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "ambiguous",
      candidates: [
        {
          id: "C-1",
          cadastralId: "784011013143",
          geometry: { type: "Polygon", coordinates: [] },
          geometryCrs: "EPSG:3301",
          facts: { areaM2Computed: 1000 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "v1",
            sourceSyncRunId: "run-1",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "fresh",
          contentHash: "",
        },
        {
          id: "C-2",
          cadastralId: "784011013144",
          geometry: { type: "Polygon", coordinates: [] },
          geometryCrs: "EPSG:3301",
          facts: { areaM2Computed: 2000 },
          source: {
            sourceId: "maru.cadastre.parcels.inspire",
            sourceDatasetVersionId: "v1",
            sourceSyncRunId: "run-1",
            normalizerVersion: "1",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
          freshnessState: "stale",
          contentHash: "",
        },
      ],
    })
  );

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("ambiguous");
    expect(result.response.candidates).toHaveLength(2);
    expect(result.response.candidates[0].freshnessState).toBe("fresh");
    expect(result.response.candidates[1].freshnessState).toBe("stale");
  }
});

test("maps not_found response", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValue(mockFetchResponse({ status: "not_found", candidates: [] }));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("not_found");
    expect(result.response.candidates).toHaveLength(0);
  }
});

test("maps invalid_source response", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValue(mockFetchResponse({ status: "invalid_source", candidates: [] }));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.response.status).toBe("invalid_source");
  }
});

test("returns invalid input for empty cadastralId", async () => {
  const result = await resolveParcelByCadastralId("   ");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_INPUT");
  }
});

test("returns invalid input for empty addressResultId", async () => {
  const result = await resolveParcelByAddressResult("", "12345");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_INPUT");
  }
});

test("returns invalid input for empty addressId", async () => {
  const result = await resolveParcelByAddressResult("inaks-0", "  ");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_INPUT");
  }
});

test("returns invalid input for non-finite point lat", async () => {
  const result = await resolveParcelByPoint({ lat: NaN, lng: 24.753 });
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_INPUT");
  }
});

test("returns invalid input for non-finite point lng", async () => {
  const result = await resolveParcelByPoint({ lat: 59.437, lng: Infinity });
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_INPUT");
  }
});

test("maps HTTP error codes", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValue(mockFetchResponse({ error: "INVALID_CADASTRAL_ID" }, 400));

  const result = await resolveParcelByCadastralId("bad");

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_CADASTRAL_ID");
  }
});

test("maps network error", async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error("network failure"));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("PARCEL_UNAVAILABLE");
  }
});
