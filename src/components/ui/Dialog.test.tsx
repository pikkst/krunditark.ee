/// <reference types="vitest" />
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n";
import Dialog from "./Dialog";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("Dialog", () => {
  it("renders with dialog role and labelledby", () => {
    const handleClose = vi.fn();
    renderWithI18n(
      <Dialog open={true} onClose={handleClose} title="Confirm">
        Body
      </Dialog>
    );
    const dialog = screen.getByRole("dialog", { name: "Confirm" });
    expect(dialog).toBeDefined();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape key", () => {
    const handleClose = vi.fn();
    renderWithI18n(
      <Dialog open={true} onClose={handleClose} title="Confirm">
        Body
      </Dialog>
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("has a focusable close button", () => {
    renderWithI18n(
      <Dialog open={true} onClose={() => {}} title="Confirm">
        Body
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeDefined();
  });

  it("does not crash when open transitions from true to false", () => {
    const handleClose = vi.fn();
    const { rerender } = renderWithI18n(
      <Dialog open={true} onClose={handleClose} title="Confirm">
        Body
      </Dialog>
    );

    expect(() => {
      rerender(
        <Dialog open={false} onClose={handleClose} title="Confirm">
          Body
        </Dialog>
      );
    }).not.toThrow();
  });

  it("does not crash or reopen when open stays true but onClose changes", () => {
    const handleCloseA = vi.fn();
    const handleCloseB = vi.fn();
    const { rerender } = renderWithI18n(
      <Dialog open={true} onClose={handleCloseA} title="Confirm">
        Body
      </Dialog>
    );

    expect(() => {
      rerender(
        <Dialog open={true} onClose={handleCloseB} title="Confirm">
          Body
        </Dialog>
      );
    }).not.toThrow();

    expect(handleCloseA).toHaveBeenCalledTimes(0);
    expect(handleCloseB).toHaveBeenCalledTimes(0);
  });

  it("renders two dialogs with unique accessible names", () => {
    renderWithI18n(
      <>
        <Dialog open={true} onClose={() => {}} title="First dialog">
          First
        </Dialog>
        <Dialog open={true} onClose={() => {}} title="Second dialog">
          Second
        </Dialog>
      </>
    );
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    expect(dialogs[0]).toHaveAccessibleName("First dialog");
    expect(dialogs[1]).toHaveAccessibleName("Second dialog");
  });
});
