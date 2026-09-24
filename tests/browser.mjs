import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
const fallback =
  "/home/user/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined),
  args: ["--no-sandbox"],
});
const base = process.env.TEST_URL || "http://localhost:5173/";
const errors = [];
let passed = 0;
function pass(message) {
  console.log(`✓ ${message}`);
  passed++;
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?test=1`);
  await page.locator("#start-button").waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("h1").innerText(), "ROOT\nACCESS_");
  assert.equal(await page.locator("#start-screen").isVisible(), true);
  pass("Title screen renders with local fonts and assets");
  await page.locator("#help-button").click();
  assert.equal(await page.locator("#help-dialog").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#help-dialog").isVisible(), false);
  pass("Field manual opens and dismisses with Escape");
  await page.locator("#character-button").click();
  assert.equal(await page.locator(".character-card").count(), 11);
  await page.locator('[data-character="juan-ignacio"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#character-dialog").isVisible(), true);
  assert.equal(await page.evaluate(() => window.__game.menu), true);
  await page.locator("#confirm-character").click();
  await page.reload();
  assert.equal(await page.locator("#selected-character").innerText(), "Juan Ignacio");
  await page.locator("#character-button").click();
  await page.waitForFunction(() => [...document.querySelectorAll(".character-card img")].every(img => img.complete && img.naturalWidth > 0));
  await page.screenshot({ path: "/tmp/root-access-character-roster.png", fullPage: true });
  await page.keyboard.press("Escape");
  pass("All 11 portraits load; keyboard selection stays in dialog and persists after reload");
  await page.locator("#game").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#hud").isVisible(), true);
  assert.equal(await page.locator("#player-name").innerText(), "JUAN IGNACIO");
  assert.equal(await page.evaluate(() => window.__game.snapshot().state.player.characterId), "juan-ignacio");
  await page.locator("#switch-player-button").click();
  assert.equal(await page.locator("#character-dialog").isVisible(), true);
  assert.equal(await page.evaluate(() => window.__game.menu), true);
  await page.locator('[data-character="erez"]').click();
  await page.locator("#confirm-character").click();
  await page.locator("#start-button").click();
  assert.equal(await page.locator("#player-name").innerText(), "EREZ");
  pass("Switch player ends the current shift and starts a new one with the chosen character");
  const startX = await page.evaluate(() => window.__game.state.player.x);
  await page.keyboard.down("d");
  await page.waitForTimeout(450);
  await page.keyboard.up("d");
  assert.ok(
    (await page.evaluate(() => window.__game.state.player.x)) > startX + 40,
  );
  pass("Enter starts the game and keyboard movement changes player position");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__game.state.player.dashCooldown > 0);
  assert.ok(
    (await page.evaluate(() => window.__game.state.player.dashCooldown)) > 2,
  );
  await page.keyboard.press("q");
  await page.waitForFunction(
    () => window.__game.state.player.pulseCooldown > 0,
  );
  assert.ok(
    (await page.evaluate(() => window.__game.state.player.pulseCooldown)) > 9,
  );
  pass("Dash and sudo pulse activate through keyboard controls");
  await page.keyboard.press("p");
  assert.equal(await page.locator("#pause-screen").isVisible(), true);
  const paused = await page.evaluate(() => window.__game.state.time);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__game.state.time), paused);
  await page.locator("#resume-button").click();
  pass("Pause freezes simulation and resume restores it");
  await page.evaluate(() => {
    const g = window.__game.state;
    g.player.x = g.servers[0].x;
    g.player.y = g.servers[0].y + 55;
    g.spawnTimer = 100;
  });
  await page.keyboard.down("e");
  await page.waitForFunction(() => window.__game.state.objectives[0].completed, null, { timeout: 5000 });
  await page.keyboard.up("e");
  assert.equal(await page.evaluate(() => window.__game.state.patches), 8);
  pass("Holding E near the Wi-Fi router completes the objective for four patches");
  await page.evaluate(() => {
    window.__game.state.waveTime = 24;
  });
  await page.locator("#upgrade-screen").waitFor();
  assert.equal(await page.locator(".upgrade-card").count(), 3);
  await page.locator(".upgrade-card").first().click();
  assert.equal(await page.evaluate(() => window.__game.state.wave), 1);
  assert.equal(
    await page.evaluate(() => window.__game.state.upgrades.length),
    1,
  );
  pass("Incident transition offers three working upgrade choices");
  await page.evaluate(() => {
    window.__game.state.objectives[1].completed = true;
    window.__game.state.waveTime = 28;
  });
  await page.locator("#upgrade-screen").waitFor();
  await page.locator(".upgrade-card").first().click();
  await page.evaluate(() => {
    window.__game.state.objectives[2].completed = true;
    window.__game.state.waveTime = 32;
  });
  await page.locator("#boss-hud").waitFor();
  await page.waitForTimeout(1800);
  assert.ok(
    await page.evaluate(() =>
      window.__game.state.enemies.some((e) => e.type === "boss"),
    ),
  );
  await page.evaluate(() => {
    window.__game.state.bossKilled = true;
    window.__game.state.score = 5000;
  });
  await page.locator("#end-screen").waitFor();
  assert.match(await page.locator("#end-title").innerText(), /Shift complete/);
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem("hitechist-root-access-career")).unlocked.includes("call_center")));
  assert.ok(
    await page.evaluate(
      () => Number(localStorage.getItem("hitechist-root-access-best")) >= 5000,
    ),
  );
  pass(
    "Final incident spawns the boss, victory renders, and high score persists",
  );
  await page.locator("#restart-button").click();
  assert.equal(
    await page.evaluate(() => window.__game.state.upgrades.length),
    0,
  );
  await page.evaluate(() => {
    window.__game.state.player.hp = 0;
  });
  await page.locator("#end-screen").waitFor();
  assert.match(await page.locator("#end-title").innerText(), /escalated/);
  await page.locator("#home-button").click();
  assert.equal(await page.locator("#start-screen").isVisible(), true);
  assert.equal(await page.locator(".career-location").nth(1).isEnabled(), true);
  await page.locator(".career-location").nth(1).click();
  await page.locator("#start-button").click();
  assert.equal(await page.evaluate(() => window.__game.state.locationId), "call_center");
  await page.locator("#end-shift-button").click();
  pass("Restart resets progression; defeat and return-to-title work");
  await page.locator("#start-button").click();
  await page.locator("#end-shift-button").click();
  assert.equal(await page.locator("#start-screen").isVisible(), true);
  assert.equal(await page.locator("#hud").isVisible(), false);
  pass("End shift returns directly to the title");
  await page.locator("#sound-button").click();
  assert.equal(
    await page.locator("#sound-button").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#sound-button").click();
  assert.equal(
    await page.locator("#sound-button").getAttribute("aria-pressed"),
    "false",
  );
  pass("Sound toggles on and off");
  await page.close();
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(`${base}?test=1`);
  await phone.locator("#character-button").click();
  await phone.locator('[data-character="rotem"]').click();
  await phone.screenshot({ path: "/tmp/root-access-character-mobile.png", fullPage: true });
  await phone.locator("#confirm-character").click();
  await phone.locator("#start-button").click();
  assert.equal(await phone.locator("#player-name").innerText(), "ROTEM");
  assert.equal(await phone.locator("#joystick").isVisible(), true);
  assert.equal(await phone.locator("#ability-bar").isVisible(), false);
  assert.ok(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const x = await phone.evaluate(() => window.__game.state.player.x);
  await phone.locator("#joystick").dispatchEvent("pointerdown", {
    pointerId: 1,
    clientX: 115,
    clientY: 510,
    pointerType: "touch",
  });
  await phone.waitForTimeout(300);
  await phone
    .locator("#joystick")
    .dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch" });
  assert.notEqual(await phone.evaluate(() => window.__game.state.player.x), x);
  await phone
    .locator("#touch-pulse")
    .dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch" });
  await phone.waitForFunction(
    () => window.__game.state.player.pulseCooldown > 0,
  );
  assert.ok(
    (await phone.evaluate(() => window.__game.state.player.pulseCooldown)) > 9,
  );
  pass("Phone layout has no horizontal overflow; joystick and pulse work");
  await phone.screenshot({
    path: "/tmp/root-access-tested-mobile.png",
    fullPage: true,
  });
  await phone.close();
  assert.deepEqual(errors, []);
  pass("No uncaught browser errors");
  console.log(`\n${passed} browser checks passed.`);
} finally {
  await browser.close();
}
