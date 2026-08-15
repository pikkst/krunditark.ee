/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import LandingPage from "./LandingPage";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("LandingPage", () => {
  it("renders the product name and tagline", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
    expect(screen.getByText("Tea enne, kui ehitad.")).toBeDefined();
  });

  it("renders the search input with Estonian placeholder", () => {
    renderWithI18n(<LandingPage />);
    expect(
      screen.getByPlaceholderText("Nt Pärnu mnt 10, Tallinn või 12345:678:9012")
    ).toBeDefined();
  });

  it("renders the search button", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
  });
});
