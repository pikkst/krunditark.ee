import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4174/krunditark.ee";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["junit", { outputFile: "playwright-pages-junit.xml" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-pages",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-pages",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run preview:pages",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_APP_ENV: "local",
      VITE_APP_ORIGIN: "http://localhost:5173",
      VITE_BASE_PATH: "/krunditark.ee/",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    },
  },
});
