const { defineConfig, devices } = require("@playwright/test");

/**
 * E2E config. Env:
 * - SMOKE_BASE_URL — default https://meher-container-loader.web.app
 * - SMOKE_PLANNER_PIN — Planner/Admin PIN for tests in planner-full.spec.cjs
 * - SMOKE_REGION — catalog region (default USA); needs parts in Firestore meherRegions/{region}
 */
module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || "https://meher-container-loader.web.app",
    trace: "on-first-retry",
    video: "off"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
