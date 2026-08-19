import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAddressSearch } from "./useAddressSearch";
import { searchAddress } from "./client";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  const mockedSearchAddress = vi.fn(actual.searchAddress);
  return {
    ...actual,
    searchAddress: mockedSearchAddress,
    createDebouncedSearch: vi.fn(() => ({
      search: (query: string, signal?: AbortSignal) => mockedSearchAddress(query, { signal }),
    })),
  };
});

const MOCK_SUPABASE_URL = "http://127.0.0.1:54321";

beforeEach(() => {
  (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL = MOCK_SUPABASE_URL;
  (import.meta.env as Record<string, string | undefined>).VITE_APP_ENV = "test";
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAddressSearch", () => {
  it("returns empty state for empty query", () => {
    const { result } = renderHook(() => useAddressSearch(""));
    expect(result.current.results).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns INVALID_INPUT error for too long query", () => {
    const { result } = renderHook(() => useAddressSearch("a".repeat(257)));
    expect(result.current.results).toHaveLength(0);
    expect(result.current.error?.code).toBe("INVALID_INPUT");
    expect(result.current.isLoading).toBe(false);
  });

  it("does not produce unhandled rejection when query changes before debounce fires", async () => {
    vi.mocked(searchAddress).mockResolvedValue({
      valid: true,
      results: [
        {
          id: "1",
          addressId: "1",
          label: "test",
          objectType: "street",
          objectTypeCode: "1",
          coordinates: { lat: 0, lon: 0 },
          coordinatesEpsg3301: { x: 0, y: 0 },
          source: { id: "test", authority: "test" },
          administrative: {},
          status: "K",
          primary: false,
          provenance: {
            sourceId: "test",
            sourceObjectId: "1",
            normalizerVersion: "1",
            retrievedAt: new Date().toISOString(),
          },
        },
      ],
      warnings: [],
    });

    const { rerender } = renderHook(({ query }: { query: string }) => useAddressSearch(query), {
      initialProps: { query: "first" },
    });

    rerender({ query: "second" });

    await act(async () => {
      vi.advanceTimersByTimeAsync(1000);
    });

    const calls = vi.mocked(searchAddress).mock.calls.map((args) => args[0]);
    expect(calls).toContain("second");
  });
});
