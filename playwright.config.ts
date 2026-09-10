import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke-test config. CI-ready but intentionally decoupled from `npm run build`:
 * e2e is never required for a green build.
 *
 * To run locally against a dev server:
 *   npm run dev            # in one terminal (serves http://127.0.0.1:5173)
 *   npm run test:e2e       # in another
 *
 * Uncomment `webServer` to have Playwright boot the dev server itself.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://127.0.0.1:5173",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
