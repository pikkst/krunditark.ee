/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import SourceBadge from "./SourceBadge";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("SourceBadge", () => {
  it("renders authority text", () => {
    renderWithI18n(<SourceBadge authority="Maa- ja Ruumiamet" />);
    expect(screen.getByText("Maa- ja Ruumiamet")).toBeDefined();
  });

  it("renders as a link when href is provided", () => {
    renderWithI18n(<SourceBadge authority="Maa- ja Ruumiamet" href="https://example.com" />);
    const link = screen.getByRole("link", { name: "Maa- ja Ruumiamet" });
    expect(link).toHaveProperty("href", "https://example.com/");
  });

  it("renders date when provided", () => {
    renderWithI18n(<SourceBadge authority="Maa- ja Ruumiamet" date="2026-08-15" />);
    expect(screen.getByText("2026-08-15")).toBeDefined();
  });
});
