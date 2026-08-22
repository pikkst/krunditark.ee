import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

vi.mock("./lib/supabase/anonymous-auth", () => ({
  useAnonymousAuth: () => ({
    session: null,
    user: null,
    isLoading: false,
    error: null,
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
    isAnonymous: false,
  }),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the landing page with default locale via deep link", () => {
    render(
      <MemoryRouter initialEntries={["/et/landing"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("renders the landing page with ru locale via deep link", () => {
    render(
      <MemoryRouter initialEntries={["/ru/landing"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("renders the landing page with en locale via deep link", () => {
    render(
      <MemoryRouter initialEntries={["/en/landing"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("redirects root to detected locale landing page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("supports client-side navigation between locale routes", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    render(
      <MemoryRouter initialEntries={["/et/landing"]}>
        <App />
      </MemoryRouter>
    );

    const localeSelect = screen.getByRole("combobox", { name: /keel/i });
    await userEvent.selectOptions(localeSelect, "ru");

    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("falls back unknown routes to et landing", () => {
    render(
      <MemoryRouter initialEntries={["/et/unknown-route"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("renders deep links under a non-root deployment base path", () => {
    render(
      <MemoryRouter initialEntries={["/krunditark.ee/et/landing"]} basename="/krunditark.ee/">
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("renders root redirect under a non-root deployment base path", () => {
    render(
      <MemoryRouter initialEntries={["/krunditark.ee/"]} basename="/krunditark.ee/">
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("supports locale switching under a non-root deployment base path", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    render(
      <MemoryRouter initialEntries={["/krunditark.ee/et/landing"]} basename="/krunditark.ee/">
        <App />
      </MemoryRouter>
    );

    const localeSelect = screen.getByRole("combobox", { name: /keel/i });
    await userEvent.selectOptions(localeSelect, "ru");

    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("redirects invalid locale under a non-root deployment base path", () => {
    render(
      <MemoryRouter initialEntries={["/krunditark.ee/fr/landing"]} basename="/krunditark.ee/">
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });

  it("renders all supported locales under a non-root deployment base path", () => {
    for (const locale of ["et", "ru", "en"] as const) {
      render(
        <MemoryRouter
          initialEntries={[`/krunditark.ee/${locale}/landing`]}
          basename="/krunditark.ee/"
        >
          <App />
        </MemoryRouter>
      );
      expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
      cleanup();
    }
  });

  it("safely redirects malformed locale without throwing", () => {
    render(
      <MemoryRouter initialEntries={["/krunditark.ee/[invalid/landing"]} basename="/krunditark.ee/">
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
  });
});
