/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import Button from "./Button";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("Button", () => {
  it("renders as a button element", () => {
    renderWithI18n(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toBeDefined();
  });

  it("receives keyboard focus", () => {
    renderWithI18n(<Button>Focusable</Button>);
    const button = screen.getByRole("button", { name: "Focusable" });
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it("applies variant class", () => {
    renderWithI18n(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("btn-danger");
  });

  it("applies size class", () => {
    renderWithI18n(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: "Large" });
    expect(button.className).toContain("btn-lg");
  });

  it("supports disabled state", () => {
    renderWithI18n(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toHaveProperty("disabled", true);
  });
});
