const { test, expect } = require("@playwright/test");
const { signInWithTeamPin, loadRegion } = require("./helpers.cjs");

/**
 * Full planner path against hosted app (or SMOKE_BASE_URL).
 * Required: SMOKE_PLANNER_PIN — a real Planner or Admin PIN from your Firebase `accessPins`.
 * Optional: SMOKE_REGION (default USA), SMOKE_BASE_URL (see playwright.config.cjs).
 */
const PLANNER_PIN = (process.env.SMOKE_PLANNER_PIN || "").trim();
const REGION = (process.env.SMOKE_REGION || "USA").trim();

test.skip(!PLANNER_PIN, "Planner E2E: set env SMOKE_PLANNER_PIN (Planner or Admin PIN).");

test.describe("Planner — full journey", () => {
  test("sign in → load region → add part → calculate → Summary PDF download", async ({ page }) => {
    test.setTimeout(180_000);

    await signInWithTeamPin(page, PLANNER_PIN);

    await expect(page.locator("#addBtn")).not.toBeDisabled({ timeout: 15_000 });

    await loadRegion(page, REGION);

    const partOption = page.locator("#partList option").first();
    await expect(partOption).toBeVisible({ timeout: 120_000 });
    const partNo = await partOption.getAttribute("value");
    expect(partNo).toBeTruthy();
    expect(String(partNo).trim().length).toBeGreaterThan(0);

    await page.locator("#partInput").fill(partNo);
    await page.locator("#qtyInput").fill("5");
    await page.locator("#addBtn").click();

    await expect(page.locator("#addedParts")).toContainText(/Shipment line items|lines/i, {
      timeout: 20_000
    });

    await expect(page.locator("#calcBtn")).not.toBeDisabled({ timeout: 30_000 });
    await page.locator("#calcBtn").click();

    await expect(page.locator("#results")).not.toBeEmpty({ timeout: 45_000 });

    const summaryBtn = page.locator("#exportSummaryPdfBtn");
    await expect(summaryBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      summaryBtn.click()
    ]);
    expect(download.suggestedFilename()).toMatch(/container-plan-summary.*\.pdf$/i);
  });

  test("Export Excel stays disabled without Step 2 vendor uploads", async ({ page }) => {
    test.setTimeout(180_000);
    await signInWithTeamPin(page, PLANNER_PIN);
    await loadRegion(page, REGION);
    const partOption = page.locator("#partList option").first();
    await expect(partOption).toBeVisible({ timeout: 120_000 });
    const partNo = await partOption.getAttribute("value");
    await page.locator("#partInput").fill(partNo);
    await page.locator("#qtyInput").fill("2");
    await page.locator("#addBtn").click();
    await expect(page.locator("#calcBtn")).not.toBeDisabled({ timeout: 30_000 });
    await page.locator("#calcBtn").click();
    await expect(page.locator("#results")).not.toBeEmpty({ timeout: 45_000 });
    await expect(page.locator("#exportBtn")).toBeDisabled();
  });
});