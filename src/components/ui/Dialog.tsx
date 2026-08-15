import { useEffect, useRef, useCallback, useId } from "react";
import { cn } from "../../lib/cn.ts";
import "./Dialog.css";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  closeLabel?: string;
};

function Dialog({ open, onClose, title, children, className, closeLabel = "Close" }: DialogProps) {
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
      const closeBtn = dialog.querySelector("[data-dialog-close]");
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
      className={cn("dialog", className)}
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          <button
            type="button"
            data-dialog-close
            className="dialog-close"
            onClick={handleClose}
            aria-label={closeLabel}
          >
            ×
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
}

export default Dialog;
