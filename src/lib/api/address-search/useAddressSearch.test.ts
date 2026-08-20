import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAddressSearch } from "./useAddressSearch";

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
    const { rerender } = renderHook(({ query }: { query: string }) => useAddressSearch(query), {
      initialProps: { query: "first" },
    });

    rerender({ query: "second" });

    await act(async () => {
      vi.advanceTimersByTimeAsync(1000);
    });
  });

  it("does not crash when query changes rapidly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ addresses: [{ adr_id: "1" }] }),
    } as Response);

    const { rerender } = renderHook(({ query }: { query: string }) => useAddressSearch(query), {
      initialProps: { query: "A" },
    });

    rerender({ query: "B" });
    rerender({ query: "C" });

    await act(async () => {
      vi.advanceTimersByTimeAsync(1000);
    });

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(0);
  });
});
