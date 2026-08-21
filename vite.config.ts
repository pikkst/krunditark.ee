/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const copy404Plugin = () => {
  const isGitHubPagesPreview = () => {
    const base = process.env.VITE_BASE_PATH;
    return typeof base === "string" && base !== "/" && base.endsWith("krunditark.ee/");
  };

  return {
    name: "vite-plugin-copy-404",
    closeBundle() {
      if (!isGitHubPagesPreview()) {
        return;
      }
      const outDir = path.resolve("dist");
      const indexPath = path.join(outDir, "index.html");
      const notFoundPath = path.join(outDir, "404.html");
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
      }
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";

  return {
    plugins: [react(), copy404Plugin()],
    base,
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      include: ["src/test/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: ["tests/e2e/**/*", "node_modules/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
      },
    },
  };
});
