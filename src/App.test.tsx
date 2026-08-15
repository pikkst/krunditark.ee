/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
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
});
