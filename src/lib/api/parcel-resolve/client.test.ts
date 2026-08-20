import { vi } from "vitest";
import { resolveParcel } from "./client";

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

test("returns resolved status with single candidate", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "resolved",
      candidates: [
        {
          cadastralId: "784011013143",
          address: "Test Address",
          areaM2: 100000,
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          source: {
            id: "maru.cadastre.parcels.inspire",
            datasetVersionId: "2026-08-16",
            retrievedAt: "2026-08-20T06:00:00Z",
          },
        },
      ],
    })
  );

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.status).toBe("resolved");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].cadastralId).toBe("784011013143");
    expect(result.candidates[0].areaM2).toBe(100000);
  }
});

test("returns ambiguous status with multiple candidates", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "ambiguous",
      candidates: [
        {
          cadastralId: "784011013143",
          address: "Address A",
          areaM2: 100000,
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          source: { id: "maru.cadastre", datasetVersionId: "v1", retrievedAt: "2026-08-20T06:00:00Z" },
        },
        {
          cadastralId: "784011013144",
          address: "Address B",
          areaM2: 110000,
          geometry: { type: "Polygon", coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] },
          source: { id: "maru.cadastre", datasetVersionId: "v1", retrievedAt: "2026-08-20T06:00:00Z" },
        },
      ],
    })
  );

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toHaveLength(2);
  }
});

test("returns failure on PARCEL_NOT_FOUND error", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({ error: "PARCEL_NOT_FOUND", message: "No matching parcel" }, 404)
  );

  const result = await resolveParcel({ cadastralId: "000000000000" });

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("PARCEL_NOT_FOUND");
  }
});

test("returns failure on SOURCE_UNAVAILABLE error", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({ error: "SOURCE_UNAVAILABLE", message: "Service down" }, 503)
  );

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("SOURCE_UNAVAILABLE");
  }
});

test("returns failure on invalid response shape", async () => {
  global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ unexpected: true }));

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("PARSE_ERROR");
  }
});

test("maps addressResultId and addressId input", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "resolved",
      candidates: [
        {
          cadastralId: "784011013143",
          address: "Test Address",
          areaM2: 100000,
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          source: { id: "maru.cadastre", datasetVersionId: "v1", retrievedAt: "2026-08-20T06:00:00Z" },
        },
      ],
    })
  );

  const result = await resolveParcel({ addressResultId: "CU00473339", addressId: "2105921" });

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.status).toBe("resolved");
  }

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/functions/v1/parcel-resolve"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ addressResultId: "CU00473339", addressId: "2105921" }),
    })
  );
});

test("maps point input", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    mockFetchResponse({
      status: "resolved",
      candidates: [
        {
          cadastralId: "784011013143",
          address: "Test Address",
          areaM2: 100000,
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          source: { id: "maru.cadastre", datasetVersionId: "v1", retrievedAt: "2026-08-20T06:00:00Z" },
        },
      ],
    })
  );

  const result = await resolveParcel({
    point: { type: "Point", coordinates: [24.75, 59.43] },
  });

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.status).toBe("resolved");
  }

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/functions/v1/parcel-resolve"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ point: { type: "Point", coordinates: [24.75, 59.43] } }),
    })
  );
});

test("returns CONFIG_ERROR when VITE_SUPABASE_URL is missing", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("CONFIG_ERROR");
  }
});

test("returns source unavailable on fetch failure", async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error("network failure"));

  const result = await resolveParcel({ cadastralId: "78401:101:3143" });

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("SOURCE_UNAVAILABLE");
  }
});
