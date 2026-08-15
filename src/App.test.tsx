/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  it("renders the landing page with default locale", () => {
    render(
      <MemoryRouter initialEntries={["/et/landing"]}>
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
});
