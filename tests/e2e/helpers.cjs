/**
 * @param {import('@playwright/test').Page} page
 * @param {string} pin
 */
async function signInWithTeamPin(page, pin) {
  await page.goto("/");
  await page.locator("#teamLoginPin").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("#teamLoginPin").fill(pin);
  await page.locator("#teamLoginBtn").click();
  await page.waitForFunction(() => document.body.classList.contains("team-authenticated"), {
    timeout: 60_000
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} region e.g. USA
 */
async function loadRegion(page, region) {
  await page.locator("#regionLoadSelect").selectOption(region);
  await page.locator("#loadRegionBtn").click();
}

module.exports = { signInWithTeamPin, loadRegion };
