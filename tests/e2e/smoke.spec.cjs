const { test, expect } = require("@playwright/test");

test.describe("Meher Container Load Planner — smoke", () => {
  test("document title and primary shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Meher/i);
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#step1-title")).toContainText(/Step 1/i);
  });

  test("guest UI: team login visible; plan actions locked", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#teamLoginOverlay")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#teamLoginPin")).toBeVisible();
    await expect(page.locator("#addBtn")).toBeDisabled();
    await expect(page.locator("#calcBtn")).toBeDisabled();
  });

  test("Firebase client bootstraps", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => typeof window.firebase !== "undefined" && window.firebase !== null, {
      timeout: 45_000
    });
  });

  test("Step 1 region catalog control", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#regionLoadSelect")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#regionLoadSelect option[value='USA']")).toHaveCount(1);
  });

  test("no critical page errors during bootstrap", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err && err.message ? err.message : err)));
    await page.goto("/");
    await page.waitForTimeout(8_000);
    const benign = /ResizeObserver|AbortError|Non-Error promise rejection|ChunkLoadError|Loading chunk \d+ failed/i;
    const bad = errors.filter((m) => !benign.test(m));
    expect.soft(bad, `Unexpected page errors: ${JSON.stringify(bad)}`).toEqual([]);
  });
});
