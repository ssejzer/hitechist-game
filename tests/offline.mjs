import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import assert from "node:assert/strict";
const fallback =
  "/home/user/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:5174/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".character-card").first().waitFor({ state: "attached" });
  assert.equal(await page.locator(".character-card").count(), 11);
  await page.locator("#character-button").click();
  await page.waitForFunction(() => [...document.querySelectorAll(".character-card img")].every(img => img.complete && img.naturalWidth > 0));
  await page.locator('[data-character="jason"]').click();
  await page.locator("#confirm-character").click();
  await page.locator("#start-button").click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#hud").isVisible(), true);
  assert.equal(await page.locator("#player-name").innerText(), "JASON");
  assert.deepEqual(errors, []);
  console.log(
    "✓ Production game reloads and plays completely offline after first visit.",
  );
} finally {
  await browser.close();
}
