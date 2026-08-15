/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import Sheet from "./Sheet";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("Sheet", () => {
  it("does not crash when open transitions from true to false", () => {
    const handleClose = vi.fn();
    const { rerender } = renderWithI18n(
      <Sheet open={true} onClose={handleClose} title="Sheet">
        Body
      </Sheet>
    );

    expect(() => {
      rerender(
        <Sheet open={false} onClose={handleClose} title="Sheet">
          Body
        </Sheet>
      );
    }).not.toThrow();
  });

  it("does not crash or reopen when open stays true but onClose changes", () => {
    const handleCloseA = vi.fn();
    const handleCloseB = vi.fn();
    const { rerender } = renderWithI18n(
      <Sheet open={true} onClose={handleCloseA} title="Sheet">
        Body
      </Sheet>
    );

    expect(() => {
      rerender(
        <Sheet open={true} onClose={handleCloseB} title="Sheet">
          Body
        </Sheet>
      );
    }).not.toThrow();

    expect(handleCloseA).toHaveBeenCalledTimes(0);
    expect(handleCloseB).toHaveBeenCalledTimes(0);
  });

  it("renders two sheets with unique accessible names", () => {
    renderWithI18n(
      <>
        <Sheet open={true} onClose={() => {}} title="First sheet">
          First
        </Sheet>
        <Sheet open={true} onClose={() => {}} title="Second sheet">
          Second
        </Sheet>
      </>
    );
    const sheets = screen.getAllByRole("dialog");
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toHaveAccessibleName("First sheet");
    expect(sheets[1]).toHaveAccessibleName("Second sheet");
  });
});
