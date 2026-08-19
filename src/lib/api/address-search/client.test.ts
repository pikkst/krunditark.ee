import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchAddress,
  searchAddressByAdrid,
  createDebouncedSearch,
  getAddressSearchCache,
} from "./client";

const MOCK_SUPABASE_URL = "http://127.0.0.1:54321";

const VALID_INAKS_RESPONSE = {
  addresses: [
    {
      adr_id: "2105921",
      aadresstekst: "Mustamäe tee 51",
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      liik: "E",
      liikVal: "EHITISHOONE",
      tunnus: "120221727",
      ads_oid: "ME01087725",
      adob_id: "10439325",
      sihtnumber: "10621",
      viitepunkt_x: "539625.35",
      viitepunkt_y: "6587225.42",
      viitepunkt_l: "24.697966",
      viitepunkt_b: "59.421047",
      boundingbox:
        "539582.68,6587127.73 539668.50,6587127.73 539668.50,6587245.34 539582.68,6587245.34 539582.68,6587127.73",
      g_boundingbox:
        "59.4201805280,24.6972084304 59.4201805280,24.6987269644 59.4212227590,24.6987269644 59.4212227590,24.6972084304 59.4201805280,24.6972084304",
      poid: [],
      primary: "true",
      kvaliteet: "adrid",
      olek: "K",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "1",
      onkort: "0",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      tehn_id2: "1152850",
      kaugus: "0",
      ietunnus: "0",
    },
  ],
  host: "inaks-api-test",
};

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL = MOCK_SUPABASE_URL;
  (import.meta.env as Record<string, string | undefined>).VITE_APP_ENV = "test";
  getAddressSearchCache().clear();
  fetchSpy = vi.spyOn(globalThis, "fetch");
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockFetchOk(json: unknown) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(json),
  } as unknown as Response);
}

describe("searchAddress", () => {
  it("returns INVALID_INPUT for empty query", async () => {
    const result = await searchAddress("");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });

  it("returns INVALID_INPUT for query exceeding max length", async () => {
    const longQuery = "a".repeat(257);
    const result = await searchAddress(longQuery);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });

  it("accepts query at max length boundary", async () => {
    mockFetchOk({ addresses: [] });
    const maxQuery = "a".repeat(256);
    const result = await searchAddress(maxQuery);
    expect(result.valid).toBe(true);
  });

  it("returns ADDRESS_SEARCH_UNAVAILABLE on network failure", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network down"));

    const result = await searchAddress("Mustamäe tee 51");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("ADDRESS_SEARCH_UNAVAILABLE");
    }
  });

  it("preserves ADDRESS_SEARCH_UNAVAILABLE from flat Edge 502 body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: "ADDRESS_SEARCH_UNAVAILABLE", message: "In-AKS down" }),
    } as unknown as Response);

    const result = await searchAddress("Mustamäe tee 51");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("ADDRESS_SEARCH_UNAVAILABLE");
    }
  });

  it("preserves INVALID_INPUT from flat Edge 400 body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "INVALID_INPUT", message: "bad query" }),
    } as unknown as Response);

    const result = await searchAddress("Mustamäe tee 51");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });

  it("returns UPSTREAM_ERROR when Edge Function returns non-ok without known code", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const result = await searchAddress("Mustamäe tee 51");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("UPSTREAM_ERROR");
    }
  });

  it("returns valid empty results for empty addresses array", async () => {
    mockFetchOk({ addresses: [] });

    const result = await searchAddress("nonexistent address xyz");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.results).toHaveLength(0);
    }
  });

  it("distinguishes empty results from service unavailable", async () => {
    mockFetchOk({ addresses: [] });
    const emptyResult = await searchAddress("empty result");
    expect(emptyResult.valid).toBe(true);
    if (emptyResult.valid) {
      expect(emptyResult.results).toHaveLength(0);
    }

    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    const unavailableResult = await searchAddress("network error");
    expect(unavailableResult.valid).toBe(false);
    if (!unavailableResult.valid) {
      expect(unavailableResult.error.code).toBe("ADDRESS_SEARCH_UNAVAILABLE");
    }
  });

  it("caches successful results and avoids duplicate fetch", async () => {
    mockFetchOk(VALID_INAKS_RESPONSE);

    const first = await searchAddress("Mustamäe tee 51");
    expect(first.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await searchAddress("Mustamäe tee 51");
    expect(second.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns PARSE_ERROR when normalizer fails", async () => {
    mockFetchOk({ addresses: [{}] });

    const result = await searchAddress("test");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("PARSE_ERROR");
    }
  });

  it("handles AbortSignal cancellation", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await searchAddress("test", { signal: controller.signal });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("uses free-text mode by default even for digits-only query", async () => {
    mockFetchOk({ addresses: [] });

    await searchAddress("12");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("q=12"), expect.anything());
  });

  it("uses adrid mode only when explicitly requested", async () => {
    mockFetchOk({ addresses: [] });

    await searchAddressByAdrid("12");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("adrid=12"), expect.anything());
  });

  it("uses 24h cache for explicit adrid lookup", async () => {
    mockFetchOk(VALID_INAKS_RESPONSE);

    const first = await searchAddressByAdrid("2105921");
    expect(first.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    const second = await searchAddressByAdrid("2105921");
    expect(second.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    const third = await searchAddressByAdrid("2105921");
    expect(third.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses 1h cache for free-text queries", async () => {
    mockFetchOk(VALID_INAKS_RESPONSE);

    const first = await searchAddress("Tartu mnt 1");
    expect(first.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(59 * 60 * 1000);
    const second = await searchAddress("Tartu mnt 1");
    expect(second.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    const third = await searchAddress("Tartu mnt 1");
    expect(third.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses 5min cache for empty results", async () => {
    mockFetchOk({ addresses: [] });

    const first = await searchAddress("zzzz_not_found");
    expect(first.valid).toBe(true);
    expect(first.valid && first.results).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4 * 60 * 1000);
    const second = await searchAddress("zzzz_not_found");
    expect(second.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 1000);
    const third = await searchAddress("zzzz_not_found");
    expect(third.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses 5min cache for empty adrid exact lookup", async () => {
    mockFetchOk({ addresses: [] });

    const first = await searchAddressByAdrid("999999999");
    expect(first.valid).toBe(true);
    expect(first.valid && first.results).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4 * 60 * 1000);
    const second = await searchAddressByAdrid("999999999");
    expect(second.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 1000);
    const third = await searchAddressByAdrid("999999999");
    expect(third.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("createDebouncedSearch", () => {
  it("delays execution by debounceMs", async () => {
    mockFetchOk({ addresses: [] });

    const debounced = createDebouncedSearch({ debounceMs: 500 });
    const controller = new AbortController();
    const promise = debounced.search("test", controller.signal);

    expect(fetchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects previous pending search when a new query arrives", async () => {
    mockFetchOk({ addresses: [] });

    const debounced = createDebouncedSearch({ debounceMs: 500 });
    const firstPromise = debounced.search("first");
    vi.advanceTimersByTime(200);
    const secondPromise = debounced.search("second");
    vi.advanceTimersByTime(500);

    await expect(firstPromise).rejects.toThrow("Debounced search aborted");
    const secondResult = await secondPromise;
    expect(secondResult.valid).toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("q=second"), expect.anything());
  });

  it("resolves newest query even if older in-flight request finishes later", async () => {
    const normalizer = await import("../../inaks-adapter/normalizer");
    const parseSpy = vi.spyOn(normalizer, "parseInAksAddressResponse").mockReturnValue({
      valid: true,
      results: [
        {
          id: "inaks-B",
          addressId: "B",
          label: "Address B",
          objectType: "building",
          objectTypeCode: "E",
          coordinates: { lat: 0, lon: 0 },
          coordinatesEpsg3301: { x: 0, y: 0 },
          source: { id: "maru.inaks", authority: "Maa- ja Ruumiamet" },
          administrative: {},
          status: "K",
          primary: true,
          provenance: {
            sourceId: "maru.inaks",
            sourceObjectId: "B",
            normalizerVersion: "1",
            retrievedAt: new Date().toISOString(),
          },
        },
      ],
      warnings: [],
    });

    fetchSpy.mockImplementation((url: string) => {
      if (url.includes("q=A")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ addresses: [{ adr_id: "A" }] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ addresses: [{ adr_id: "B" }] }),
      } as Response);
    });

    const debounced = createDebouncedSearch({ debounceMs: 500 });
    const resultA = debounced.search("A");
    vi.advanceTimersByTime(200);
    const resultB = debounced.search("B");
    vi.advanceTimersByTime(500);

    await expect(resultA).rejects.toThrow("Debounced search aborted");
    const finalB = await resultB;
    expect(finalB.valid).toBe(true);
    if (finalB.valid) {
      expect(finalB.results[0].addressId).toBe("B");
    }

    parseSpy.mockRestore();
  });

  it("cancels pending search on explicit abort signal", async () => {
    mockFetchOk({ addresses: [] });

    const debounced = createDebouncedSearch({ debounceMs: 500 });
    const controller = new AbortController();
    const promise = debounced.search("test", controller.signal);
    controller.abort();

    vi.advanceTimersByTime(1000);
    await expect(promise).rejects.toThrow("Debounced search aborted");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("aborting older invocation does not cancel newer query timer", async () => {
    mockFetchOk({ addresses: [] });

    const debounced = createDebouncedSearch({ debounceMs: 500 });
    const controllerA = new AbortController();
    const promiseA = debounced.search("A", controllerA.signal);
    vi.advanceTimersByTime(200);
    const promiseB = debounced.search("B");
    vi.advanceTimersByTime(200);
    controllerA.abort();

    vi.advanceTimersByTime(500);
    await expect(promiseA).rejects.toThrow("Debounced search aborted");
    const resultB = await promiseB;
    expect(resultB.valid).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("q=B"), expect.anything());
  });
});

describe("getAddressSearchCache", () => {
  it("clear empties the cache", async () => {
    const cache = getAddressSearchCache();
    mockFetchOk({ addresses: [] });

    await searchAddress("test");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    cache.clear();
    await searchAddress("test");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
