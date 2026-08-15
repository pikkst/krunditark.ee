/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import FreshnessBadge from "./FreshnessBadge";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("FreshnessBadge", () => {
  it("renders with level text", () => {
    renderWithI18n(<FreshnessBadge level="fresh" />);
    expect(screen.getByText("fresh")).toBeDefined();
  });

  it("provides an accessible label with date", () => {
    renderWithI18n(<FreshnessBadge level="stale" date="2026-07-01" />);
    expect(screen.getByLabelText("Data freshness: stale, as of 2026-07-01")).toBeDefined();
  });

  it("provides an accessible label without date", () => {
    renderWithI18n(<FreshnessBadge level="unknown" />);
    expect(screen.getByLabelText("Data freshness: unknown")).toBeDefined();
  });

  it("emits a CSS-matching variant class", () => {
    renderWithI18n(<FreshnessBadge level="stale" date="2026-07-01" />);
    const badge = screen.getByLabelText("Data freshness: stale, as of 2026-07-01");
    expect(badge.className).toContain("freshness-stale");
  });
});
