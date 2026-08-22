import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import type { Parcel } from "../../domain/parcel/types";
import { useGuestProject } from "../../lib/supabase/guest-project";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUser = { id: "user-1", is_anonymous: true } as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSession = { user: mockUser } as any;
const mockProject = {
  id: "project-1",
  user_id: "user-1",
  name: "Uus projekt",
  cadastral_id: "123456789012",
  current_parcel_snapshot_id: null,
  intent_code: "build",
  created_at: "2026-08-22T00:00:00Z",
  updated_at: "2026-08-22T00:00:00Z",
  archived_at: null,
};

const storedState = {
  projectId: "project-1",
  parcel: {
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
  } as Parcel,
  intent: "build" as const,
};

vi.mock("../../lib/supabase/anonymous-auth", () => ({
  useAnonymousAuth: () => ({
    user: mockUser,
    isLoading: false,
    signInAnonymously: vi.fn().mockResolvedValue(mockUser),
    isAnonymous: true,
    session: mockSession,
    error: null,
  }),
}));

vi.mock("../../lib/supabase/guest-project", () => ({
  useGuestProject: vi.fn(),
}));

import { ProjectStateProvider, useProjectState } from "./index";

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
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useGuestProject).mockReturnValue({
      project: null,
      projects: [],
      isLoading: false,
      error: null,
      createProject: vi.fn().mockResolvedValue(mockProject),
      loadProject: vi.fn().mockResolvedValue(null),
      loadProjects: vi.fn().mockResolvedValue([]),
      getActiveProject: vi.fn().mockResolvedValue(null),
      updateProject: vi.fn(),
      archiveProject: vi.fn(),
    });
  });

  it("provides default empty state with new fields", () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    expect(result.current.selectedParcel).toBeNull();
    expect(result.current.selectedIntent).toBeNull();
    expect(result.current.project).toBeNull();
    expect(result.current.draft).toBeNull();
    expect(result.current.isBootstrapping).toBe(false);
    expect(result.current.bootstrapError).toBeNull();
    expect(result.current.isAnonymous).toBe(true);
    expect(result.current.guestError).toBeNull();
    expect(result.current.projectLoading).toBe(false);
    expect(result.current.authLoading).toBe(false);
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

  it("clears project state and sessionStorage", () => {
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

  it("ensureProject creates a new guest project and persists state", async () => {
    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    act(() => {
      result.current.setSelectedParcel(mockParcel);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createdProject: any;
    await act(async () => {
      createdProject = await result.current.ensureProject(mockParcel, "build");
    });

    expect(createdProject).toEqual(mockProject);
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.selectedParcel).toEqual(mockParcel);
    expect(result.current.selectedIntent).toBe("build");
    expect(result.current.isBootstrapping).toBe(false);
  });

  it("rehydrates from sessionStorage on mount", async () => {
    sessionStorage.setItem("krunditark_project_state", JSON.stringify(storedState));

    const loadProjectMock = vi.fn().mockResolvedValue(mockProject);
    vi.mocked(useGuestProject).mockReturnValue({
      project: null,
      projects: [],
      isLoading: false,
      error: null,
      createProject: vi.fn().mockResolvedValue(mockProject),
      loadProject: loadProjectMock,
      loadProjects: vi.fn().mockResolvedValue([]),
      getActiveProject: vi.fn().mockResolvedValue(null),
      updateProject: vi.fn(),
      archiveProject: vi.fn(),
    });

    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).toHaveBeenCalledWith("project-1");
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.selectedParcel).toEqual(storedState.parcel);
    expect(result.current.selectedIntent).toBe("build");
  });

  it("does not rehydrate when sessionStorage is empty", async () => {
    const loadProjectMock = vi.fn().mockResolvedValue(null);
    vi.mocked(useGuestProject).mockReturnValue({
      project: null,
      projects: [],
      isLoading: false,
      error: null,
      createProject: vi.fn().mockResolvedValue(mockProject),
      loadProject: loadProjectMock,
      loadProjects: vi.fn().mockResolvedValue([]),
      getActiveProject: vi.fn().mockResolvedValue(null),
      updateProject: vi.fn(),
      archiveProject: vi.fn(),
    });

    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadProjectMock).not.toHaveBeenCalled();
    expect(result.current.project).toBeNull();
    expect(result.current.selectedParcel).toBeNull();
    expect(result.current.selectedIntent).toBeNull();
  });

  it("clears sessionStorage when clearProject is called", async () => {
    sessionStorage.setItem("krunditark_project_state", JSON.stringify(storedState));

    const { result } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    act(() => {
      result.current.setSelectedParcel(mockParcel);
      result.current.setSelectedIntent("build");
    });

    act(() => {
      result.current.clearProject();
    });

    expect(sessionStorage.getItem("krunditark_project_state")).toBeNull();
  });

  it("survives a simulated refresh by rehydrating from sessionStorage", async () => {
    sessionStorage.setItem("krunditark_project_state", JSON.stringify(storedState));

    const loadProjectMock = vi.fn().mockResolvedValue(mockProject);
    vi.mocked(useGuestProject).mockReturnValue({
      project: null,
      projects: [],
      isLoading: false,
      error: null,
      createProject: vi.fn().mockResolvedValue(mockProject),
      loadProject: loadProjectMock,
      loadProjects: vi.fn().mockResolvedValue([]),
      getActiveProject: vi.fn().mockResolvedValue(null),
      updateProject: vi.fn(),
      archiveProject: vi.fn(),
    });

    const { result, unmount } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.project).toEqual(mockProject);
    expect(result.current.selectedParcel).toEqual(storedState.parcel);
    expect(result.current.selectedIntent).toBe("build");

    unmount();

    const { result: resultAfterRefresh } = renderHook(() => useProjectState(), {
      wrapper: ProjectStateProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(resultAfterRefresh.current.project).toEqual(mockProject);
    expect(resultAfterRefresh.current.selectedParcel).toEqual(storedState.parcel);
    expect(resultAfterRefresh.current.selectedIntent).toBe("build");
  });

  it("preserves project state across locale changes", async () => {
    sessionStorage.setItem("krunditark_project_state", JSON.stringify(storedState));

    const loadProjectMock = vi.fn().mockResolvedValue(mockProject);
    vi.mocked(useGuestProject).mockReturnValue({
      project: null,
      projects: [],
      isLoading: false,
      error: null,
      createProject: vi.fn().mockResolvedValue(mockProject),
      loadProject: loadProjectMock,
      loadProjects: vi.fn().mockResolvedValue([]),
      getActiveProject: vi.fn().mockResolvedValue(null),
      updateProject: vi.fn(),
      archiveProject: vi.fn(),
    });

    const { result } = renderHook(() => useProjectState(), {
      wrapper: ({ children }) => (
        <I18nextProvider i18n={i18n}>
          <ProjectStateProvider>{children}</ProjectStateProvider>
        </I18nextProvider>
      ),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.project).toEqual(mockProject);
    expect(result.current.selectedParcel).toEqual(storedState.parcel);
    expect(result.current.selectedIntent).toBe("build");
  });

  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useProjectState());
    }).toThrow("useProjectState must be used within a ProjectStateProvider");
  });
});
