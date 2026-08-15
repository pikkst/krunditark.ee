import { useEffect, useRef, useCallback, useId } from "react";
import { cn } from "../../lib/cn.ts";
import "./Sheet.css";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  closeLabel?: string;
};

function Sheet({ open, onClose, title, children, className, closeLabel = "Close" }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openRef = useRef(false);
  const titleId = useId();

  const handleClose = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onDialogClose = () => {
      onClose();
    };

    dialog.addEventListener("close", onDialogClose);

    if (open && !openRef.current) {
      dialog.showModal();
      const closeBtn = dialog.querySelector("[data-sheet-close]");
      setTimeout(() => (closeBtn as HTMLElement | null)?.focus(), 0);
    } else if (!open && openRef.current) {
      dialog.close();
    }

    openRef.current = open;

    return () => dialog.removeEventListener("close", onDialogClose);
  }, [open, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={cn("sheet", className)}
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
    >
      <div className="sheet-content">
        <div className="sheet-header">
          <h2 id={titleId} className="sheet-title">
            {title}
          </h2>
          <button
            type="button"
            data-sheet-close
            className="sheet-close"
            onClick={handleClose}
            aria-label={closeLabel}
          >
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}

export default Sheet;
