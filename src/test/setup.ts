import "@testing-library/jest-dom";

if (typeof HTMLDialogElement !== "undefined") {
  const originalShowModal = HTMLDialogElement.prototype.showModal;

  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
    if (typeof originalShowModal === "function") {
      originalShowModal.call(this);
    }
  };

  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close", { bubbles: false, cancelable: true }));
  };
}
