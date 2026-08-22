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

vi.mock("./client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
          limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
        })),
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe("useGuestProject", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("createProject inserts when no active project exists", async () => {
    const { supabase } = await import("./client");

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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
    const { supabase } = await import("./client");

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProject,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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
    const { supabase } = await import("./client");
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useGuestProject(mockUser));

    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.loadProject("project-1");
    });

    expect(loaded).toEqual(mockProject);
    expect(result.current.project).toEqual(mockProject);
  });

  it("loadProject returns null when not found", async () => {
    const { supabase } = await import("./client");
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "Not found" },
          }),
        })),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useGuestProject(mockUser));

    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.loadProject("nonexistent");
    });

    expect(loaded).toBeNull();
  });

  it("archiveProject soft-deletes by id", async () => {
    const { supabase } = await import("./client");
    vi.mocked(supabase.from).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useGuestProject(mockUser));

    await act(async () => {
      await result.current.archiveProject("project-1");
    });

    expect(result.current.project).toBeNull();
  });
});
