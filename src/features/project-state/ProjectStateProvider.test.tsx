import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ProjectStateProvider, useProjectState } from "./index";
import type { Parcel } from "../../domain/parcel/types";

const mockParcel: Parcel = {
  id: "parcel-1",
  cadastralId: "123456789012",
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
  facts: {
    areaM2Computed: 10000,
    addressText: "Test address",
  },
  source: {
    sourceId: "test",
    sourceDatasetVersionId: "2026-08-16",
    sourceSyncRunId: "sync-1",
    normalizerVersion: "1",
    retrievedAt: "2026-08-16T00:00:00Z",
  },
  freshnessState: "fresh",
  contentHash: "hash-1",
};

describe("ProjectStateProvider", () => {
  it("provides default empty state", () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    expect(result.current.selectedParcel).toBeNull();
    expect(result.current.selectedIntent).toBeNull();
    expect(result.current.project).toBeNull();
    expect(result.current.draft).toBeNull();
  });

  it("allows setting selected parcel", () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    act(() => {
      result.current.setSelectedParcel(mockParcel);
    });

    expect(result.current.selectedParcel).toEqual(mockParcel);
  });

  it("allows setting selected intent", () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    act(() => {
      result.current.setSelectedIntent("build");
    });

    expect(result.current.selectedIntent).toBe("build");
  });

  it("clears project state", () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    act(() => {
      result.current.setSelectedParcel(mockParcel);
      result.current.setSelectedIntent("build");
    });

    expect(result.current.selectedParcel).toEqual(mockParcel);
    expect(result.current.selectedIntent).toBe("build");

    act(() => {
      result.current.clearProject();
    });

    expect(result.current.selectedParcel).toBeNull();
    expect(result.current.selectedIntent).toBeNull();
    expect(result.current.project).toBeNull();
    expect(result.current.draft).toBeNull();
  });

  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useProjectState());
    }).toThrow("useProjectState must be used within a ProjectStateProvider");
  });
});
