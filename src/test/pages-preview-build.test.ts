import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi } from "vitest";
import { shouldSkipReactMount } from "../lib/pagesAssetGuard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "../..");
const distDir = path.join(root, "dist");

function cleanupDist(): void {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
}

describe("GitHub Pages preview build", () => {
  afterEach(() => {
    cleanupDist();
  });

  it("does not emit 404.html for root production build", async () => {
    cleanupDist();
    execSync("npx vite build", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, VITE_BASE_PATH: "/" },
      timeout: 60000,
    });

    expect(fs.existsSync(path.join(distDir, "404.html"))).toBe(false);
  }, 60000);

  it("emits 404.html for repository-path preview build", async () => {
    cleanupDist();
    execSync("npx vite build", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, VITE_BASE_PATH: "/krunditark.ee/" },
      timeout: 60000,
    });

    expect(fs.existsSync(path.join(distDir, "404.html"))).toBe(true);
    const index = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
    const notFound = fs.readFileSync(path.join(distDir, "404.html"), "utf-8");
    expect(notFound).toBe(index);
  }, 60000);
});

describe("Pages fallback script", () => {
  const indexPath = path.join(root, "index.html");

  it("sets guard flag for asset paths without using throw or body.innerHTML", () => {
    const html = fs.readFileSync(indexPath, "utf-8");
    expect(html).toContain("window.__SKIP_REACT_MOUNT__");
    expect(html).toContain("assetPattern");
    expect(html).not.toContain("document.body.innerHTML");
    expect(html).not.toContain("throw new Error");
  });
});

describe("Asset guard prevents SPA mount", () => {
  it("does not mount React when skip flag is set for an asset path", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/krunditark.ee/assets/missing.js" },
      writable: true,
      configurable: true,
    });
    (window as unknown as { __SKIP_REACT_MOUNT__?: boolean }).__SKIP_REACT_MOUNT__ = true;

    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    const mockRender = vi.fn();
    const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

    const shouldMount = !shouldSkipReactMount();
    if (shouldMount) {
      mockCreateRoot().render(null);
    }

    expect(mockCreateRoot).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe("");
  });
});
