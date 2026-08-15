/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("renders the product name and tagline", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
    expect(screen.getByText("Tea enne, kui ehitad.")).toBeDefined();
  });

  it("renders the search input with Estonian placeholder", () => {
    render(<LandingPage />);
    expect(
      screen.getByPlaceholderText("Nt Pärnu mnt 10, Tallinn või 12345:678:9012")
    ).toBeDefined();
  });

  it("renders the search button", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
  });
});
