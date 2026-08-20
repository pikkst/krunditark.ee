import { vi } from "vitest";
import { resolveParcelByCadastralId } from "./client";

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

test("returns canonical Parcel shape from successful resolve", async () => {
  const mockParcel = {
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
    facts: { areaM2Computed: 1511, addressText: "Punane tn 61c" },
    source: {
      sourceId: "maru.cadastre.parcels.inspire",
      sourceDatasetVersionId: "2026-08-16",
      sourceSyncRunId: "edge-sync-123",
      sourceObjectId: "C-78401:101:3143",
      normalizerVersion: "1",
      retrievedAt: "2026-08-20T06:00:00Z",
      sourceEffectiveAt: "2025-02-28T00:00:00Z",
    },
    freshnessState: "fresh",
    contentHash: "",
  };

  global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ valid: true, parcel: mockParcel }));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parcel.cadastralId).toBe("784011013143");
    expect(result.parcel.geometryCrs).toBe("EPSG:3301");
    expect(result.parcel.source.sourceId).toBe("maru.cadastre.parcels.inspire");
    expect(result.parcel.source.sourceDatasetVersionId).toBe("2026-08-16");
    expect(result.parcel.freshnessState).toBe("fresh");
    expect(result.parcel.facts.areaM2Computed).toBe(1511);
  }
});

test("maps PARCEL_NOT_FOUND error", async () => {
  global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: "PARCEL_NOT_FOUND" }, 404));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("PARCEL_NOT_FOUND");
  }
});

test("maps AMBIGUOUS_RESULT error", async () => {
  global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: "AMBIGUOUS_RESULT" }, 409));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("AMBIGUOUS_RESULT");
  }
});

test("maps SOURCE_TIMEOUT error", async () => {
  global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: "SOURCE_TIMEOUT" }, 502));

  const result = await resolveParcelByCadastralId("78401:101:3143");

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("SOURCE_TIMEOUT");
  }
});
