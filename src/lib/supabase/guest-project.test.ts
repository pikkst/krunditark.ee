import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuestProject } from "./guest-project";

const mockUser = {
  id: "user-1",
  is_anonymous: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

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

function createMockFrom() {
  const maybeSingle = vi.fn();
  const single = vi.fn();
  const insertSelectSingle = vi.fn();
  const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });

  const insertSelect = vi.fn(() => ({
    single: insertSelectSingle,
  }));

  const insert = vi.fn(() => ({
    select: insertSelect,
  }));

  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const is = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ is, single, maybeSingle, limit }));
  const select = vi.fn(() => ({ eq, order, is, limit, maybeSingle, single }));

  const update = vi.fn(() => ({ eq: updateEq }));

  return {
    select,
    insert,
    update,
  };
}

const mockClient = { from: vi.fn(createMockFrom) };

vi.mock("./client", () => ({
  getSupabaseClient: vi.fn(() => mockClient),
}));

describe("useGuestProject", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockClient.from.mockClear();
  });

  it("createProject inserts when no active project exists", async () => {
    const fromMockForGet = createMockFrom();
    const fromMockForInsert = createMockFrom();
    mockClient.from.mockReturnValueOnce(fromMockForGet);
    mockClient.from.mockReturnValueOnce(fromMockForInsert);
    fromMockForGet.select().eq().is().order().limit().maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    fromMockForInsert.insert().select().single.mockResolvedValue({
      data: mockProject,
      error: null,
    });

    const { result } = renderHook(() => useGuestProject(mockUser));

    let project: unknown;
    await act(async () => {
      project = await result.current.createProject({
        cadastralId: "123456789012",
        intentCode: "build",
      });
    });

    expect(project).toEqual(mockProject);
    expect(result.current.project).toEqual(mockProject);
  });

  it("createProject reuses active project when one exists", async () => {
    const fromMock = createMockFrom();
    mockClient.from.mockReturnValueOnce(fromMock);
    fromMock.select().eq().is().order().limit().maybeSingle.mockResolvedValue({
      data: mockProject,
      error: null,
    });

    const { result } = renderHook(() => useGuestProject(mockUser));

    let project: unknown;
    await act(async () => {
      project = await result.current.createProject({
        cadastralId: "123456789012",
        intentCode: "build",
      });
    });

    expect(project).toEqual(mockProject);
    expect(result.current.project).toEqual(mockProject);
  });

  it("loadProject fetches by id", async () => {
    const fromMock = createMockFrom();
    mockClient.from.mockReturnValueOnce(fromMock);
    fromMock.select().eq().single.mockResolvedValue({
      data: mockProject,
      error: null,
    });

    const { result } = renderHook(() => useGuestProject(mockUser));

    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.loadProject("project-1");
    });

    expect(loaded).toEqual(mockProject);
    expect(result.current.project).toEqual(mockProject);
  });

  it("loadProject returns null when not found", async () => {
    const fromMock = createMockFrom();
    mockClient.from.mockReturnValueOnce(fromMock);
    fromMock
      .select()
      .eq()
      .single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

    const { result } = renderHook(() => useGuestProject(mockUser));

    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.loadProject("nonexistent");
    });

    expect(loaded).toBeNull();
  });

  it("archiveProject soft-deletes by id", async () => {
    const fromMock = createMockFrom();
    mockClient.from.mockReturnValueOnce(fromMock);

    const { result } = renderHook(() => useGuestProject(mockUser));

    await act(async () => {
      await result.current.archiveProject("project-1");
    });

    expect(result.current.project).toBeNull();
  });
});
