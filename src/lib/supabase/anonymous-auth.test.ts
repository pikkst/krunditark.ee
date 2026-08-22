import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnonymousAuth } from "./anonymous-auth";

const mockUser = {
  id: "user-1",
  is_anonymous: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockSession = {
  user: mockUser,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock("./client", () => ({
  getSupabaseClient: vi.fn(() => mockClient),
}));

describe("useAnonymousAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockClient.auth.getSession.mockClear();
    mockClient.auth.onAuthStateChange.mockClear();
    mockClient.auth.signInAnonymously.mockClear();
    mockClient.auth.signOut.mockClear();
  });

  it("reports isAnonymous from top-level user.is_anonymous", async () => {
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useAnonymousAuth());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isAnonymous).toBe(true);
  });

  it("reports false for permanent user", async () => {
    const permanentUser = { ...mockUser, is_anonymous: false };
    const permanentSession = { ...mockSession, user: permanentUser };
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: permanentSession },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useAnonymousAuth());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isAnonymous).toBe(false);
  });

  it("signInAnonymously returns the created user", async () => {
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockClient.auth.signInAnonymously.mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useAnonymousAuth());

    await act(async () => {
      await Promise.resolve();
    });

    const user = await act(async () => {
      return result.current.signInAnonymously();
    });

    expect(user).toEqual(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAnonymous).toBe(true);
  });
});
