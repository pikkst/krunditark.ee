/// <reference types="vitest" />
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import Input from "./Input";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("Input", () => {
  it("renders with an associated label", () => {
    renderWithI18n(<Input label="Name" />);
    expect(screen.getByLabelText("Name")).toBeDefined();
  });

  it("uses provided id for label association", () => {
    renderWithI18n(<Input id="custom-id" label="Email" />);
    expect(screen.getByLabelText("Email")).toHaveProperty("id", "custom-id");
  });

  it("associates error message via aria-describedby", () => {
    renderWithI18n(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input).toHaveAttribute("aria-describedby");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("accepts keyboard input", () => {
    renderWithI18n(<Input label="Search" />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "test" } });
    expect(input).toHaveValue("test");
  });
});
