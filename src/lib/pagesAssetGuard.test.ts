import { isAssetPath, shouldSkipReactMount } from "./pagesAssetGuard";

describe("pagesAssetGuard", () => {
  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true,
      configurable: true,
    });
    delete (window as unknown as { __SKIP_REACT_MOUNT__?: boolean }).__SKIP_REACT_MOUNT__;
  });

  it("identifies asset paths under /assets/", () => {
    expect(isAssetPath("/assets/index.js")).toBe(true);
    expect(isAssetPath("/assets/missing.css")).toBe(true);
  });

  it("identifies asset paths by extension", () => {
    expect(isAssetPath("/static/map.png")).toBe(true);
    expect(isAssetPath("/fonts/symbol.woff2")).toBe(true);
  });

  it("does not flag application routes as assets", () => {
    expect(isAssetPath("/et/landing")).toBe(false);
    expect(isAssetPath("/krunditark.ee/ru/landing")).toBe(false);
    expect(isAssetPath("/assets")).toBe(false);
  });

  it("shouldSkipReactMount returns true for asset paths", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/assets/missing.js" },
      writable: true,
      configurable: true,
    });
    expect(shouldSkipReactMount()).toBe(true);
  });

  it("shouldSkipReactMount returns false for application routes", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/et/landing" },
      writable: true,
      configurable: true,
    });
    expect(shouldSkipReactMount()).toBe(false);
  });
});
