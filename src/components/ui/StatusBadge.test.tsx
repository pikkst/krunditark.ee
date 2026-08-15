/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import StatusBadge from "./StatusBadge";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("StatusBadge", () => {
  it("renders with status text, not color-only", () => {
    renderWithI18n(<StatusBadge status="conflict" />);
    expect(screen.getByText("conflict")).toBeDefined();
  });

  it("provides an accessible label", () => {
    renderWithI18n(<StatusBadge status="clear" />);
    expect(screen.getByLabelText("Status: clear")).toBeDefined();
  });

  it("uses custom label when provided", () => {
    renderWithI18n(<StatusBadge status="unknown" label="Not checked" />);
    expect(screen.getByText("Not checked")).toBeDefined();
    expect(screen.getByLabelText("Status: Not checked")).toBeDefined();
  });

  it("emits a CSS-matching variant class", () => {
    renderWithI18n(<StatusBadge status="condition" />);
    const badge = screen.getByText("condition").closest("span");
    expect(badge?.className).toContain("status-badge-condition");
  });
});
