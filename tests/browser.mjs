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
  assert.match(await page.locator("#restart-button").innerText(), /PLAY CALL-CENTER IT/);
  assert.ok(
    await page.evaluate(
      () => Number(localStorage.getItem("hitechist-root-access-best")) >= 5000,
    ),
  );
  pass(
    "Final incident spawns the boss, victory renders, and high score persists",
  );
  await page.locator("#restart-button").click();
  assert.equal(await page.evaluate(() => window.__game.state.locationId), "call_center");
  assert.match(await page.locator("#stage-label").innerText(), /LEVEL 02 · CALL-CENTER IT/);
  assert.match(await page.locator("#room-label").innerText(), /EMPLOYEE OPEN SPACE/);
  await page.evaluate(() => {
    const g = window.__game.state;
    g.player.x = 2000; g.player.y = 880;
  });
  await page.waitForFunction(() => document.querySelector("#room-label").textContent.includes("COMMUNICATIONS ROOM"));
  pass("Promotion starts level 2; the HUD identifies both call-center rooms");
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
  assert.match(await page.locator("#career-progress").innerText(), /1 \/ 6 COMPLETED/);
  assert.equal(await page.locator('.career-location[data-status="completed"]').count(), 1);
  assert.equal(await page.locator(".career-location").nth(1).isEnabled(), true);
  await page.locator(".career-location").nth(1).click();
  await page.locator("#start-button").click();
  assert.equal(await page.evaluate(() => window.__game.state.locationId), "call_center");
  await page.locator("#end-shift-button").click();
  pass("New shifts reset upgrades; defeat and return-to-title work");
  await page.locator("#start-button").click();
  await page.locator("#end-shift-button").click();
  assert.equal(await page.locator("#start-screen").isVisible(), true);
  assert.equal(await page.locator("#hud").isVisible(), false);
  await page.reload();
  assert.equal(await page.locator(".career-location").nth(1).getAttribute("aria-pressed"), "true");
  pass("End shift returns directly to the title");
  assert.equal(await page.locator("#sound-button").getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("#sound-button").innerText(), "SOUND ON");
  await page.locator("#sound-button").click();
  assert.equal(
    await page.locator("#sound-button").getAttribute("aria-pressed"),
    "false",
  );
  await page.locator("#sound-button").click();
  assert.equal(await page.locator("#sound-button").getAttribute("aria-pressed"), "true");
  assert.deepEqual(await page.evaluate(() => {
    const { effectsGain, musicGain } = window.__game.audioStats;
    return { effectsGain, musicGain };
  }), { effectsGain: 1, musicGain: 0.5 });
  pass("Sound starts enabled and toggles off and on");
  await page.close();
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(`${base}?test=1`);
  const mobileTitle = await phone.evaluate(() => {
    const frame = document.querySelector("#viewport").getBoundingClientRect();
    const start = document.querySelector("#start-button").getBoundingClientRect();
    return { frameBottom: frame.bottom, startBottom: start.bottom };
  });
  assert.ok(mobileTitle.startBottom <= mobileTitle.frameBottom, "mobile start button must fit below the career graph");
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
  const campaign = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  campaign.on("pageerror", (e) => errors.push(e.message));
  await campaign.goto(`${base}?test=1`);
  await campaign.evaluate(() => localStorage.setItem("hitechist-root-access-career", JSON.stringify({
    unlocked: ["office", "call_center", "sysadmin", "tech_lead", "datacenter", "manager"], ratings: {},
  })));
  await campaign.reload();
  assert.equal(await campaign.locator(".career-location").count(), 6);
  assert.equal(await campaign.locator(".career-location").nth(5).getAttribute("aria-pressed"), "true");
  for (const [index, id] of [[2, "sysadmin"], [3, "tech_lead"], [4, "datacenter"], [5, "manager"]]) {
    await campaign.locator(".career-location").nth(index).click();
    await campaign.locator("#start-button").click();
    assert.equal(await campaign.evaluate(() => window.__game.state.locationId), id);
    if (index === 2) {
      await campaign.waitForFunction(() => window.__game.audioStats.musicPaused === false);
    }
    assert.equal(await campaign.locator("#server-status span").count(), id === "manager" ? 4 : 6);
    assert.equal(await campaign.locator("#site-map").isVisible(), ["tech_lead", "datacenter"].includes(id));
    if (id === "tech_lead" || id === "datacenter") {
      if (id === "datacenter") {
        assert.equal(await campaign.locator("#shuttle-guide").isVisible(), false);
      }
      const panels = await campaign.evaluate(() => ({
        viewportBottom: document.querySelector("#viewport").getBoundingClientRect().bottom,
        siteTop: document.querySelector("#site-map").getBoundingClientRect().top,
      }));
      assert.ok(panels.siteTop >= panels.viewportBottom, "travel controls must sit below the minimap");
      await campaign.locator('[data-room]').nth(2).click();
      if (id === "datacenter") {
        assert.equal(await campaign.evaluate(() => window.__game.state.vehicle), null);
        assert.equal(await campaign.evaluate(() => window.__game.state.shuttleDestination), "az_c");
        await campaign.locator("#shuttle-status").getByText("DEST: AVAILABILITY ZONE C").waitFor();
        assert.equal(await campaign.locator("#shuttle-guide").isVisible(), false);
        await campaign.evaluate(() => {
          const g = window.__game.state;
          g.player.characterId = "erez";
          g.player.x = 605; g.player.y = 1870; g.spawnTimer = 1000;
        });
        await campaign.locator("#shuttle-guide-text").getByText(/STAY BY THE STOP/).waitFor();
        assert.equal(await campaign.locator("#shuttle-guide").isVisible(), true);
        await campaign.waitForFunction(() => window.__game.state.vehicle?.phase === "boarding");
        assert.equal(await campaign.evaluate(() => window.__game.renderStats.playerCharacter), "erez");
        assert.ok(await campaign.evaluate(() => window.__game.state.grace > 0));
        assert.equal(await campaign.locator("#wave-banner").isVisible(), false);
        await campaign.waitForFunction(() => window.__game.state.vehicle?.phase === "riding" && window.__game.state.player.y >= 2100);
        assert.equal(await campaign.locator("#shuttle-guide").isVisible(), false);
        await campaign.waitForFunction(() => window.__game.state.vehicle?.phase === "exiting");
        assert.equal(await campaign.evaluate(() => window.__game.renderStats.playerCharacter), "erez");
        await campaign.waitForFunction(() => window.__game.state.vehicle === null);
        assert.equal(await campaign.evaluate(() => window.__game.state.player.x), 3685);
      } else assert.ok(await campaign.evaluate(() => window.__game.state.grace > 0));
      await campaign.locator("#support-button").click();
      assert.ok(await campaign.evaluate(() => window.__game.state.supportCooldown > 0));
    }
    await campaign.locator("#end-shift-button").click();
    assert.equal(await campaign.evaluate(() => window.__game.audioStats.musicPaused), true);
  }
  pass("All later workplaces open with their objectives; travel and support controls work");
  await campaign.close();
  const companions = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  companions.on("pageerror", (e) => errors.push(e.message));
  await companions.goto(`${base}?test=1`);
  for (const [character, species] of [["elad", "dog"], ["nenad", "cat"]]) {
    await companions.locator("#character-button").click();
    await companions.locator(`[data-character="${character}"]`).click();
    await companions.locator("#confirm-character").click();
    await companions.locator("#start-button").click();
    await companions.waitForFunction((expected) => window.__game.renderStats.companion?.species === expected, species);
    const before = await companions.evaluate(() => window.__game.renderStats.companion.x);
    await companions.keyboard.down("d");
    await companions.waitForTimeout(500);
    await companions.keyboard.up("d");
    assert.ok((await companions.evaluate(() => window.__game.renderStats.companion.x)) > before + 5,
      `${character}'s companion follows movement`);
    await companions.locator("#end-shift-button").click();
  }
  const companionAssets = await companions.evaluate(async () => Promise.all(
    ["elad-dog", "nenad-cat"].map(async (name) => {
      const image = new Image();
      image.src = `assets/companions/${name}.png`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return { width: image.width, alpha: ctx.getImageData(0, 0, 1, 1).data[3] };
    }),
  ));
  assert.ok(companionAssets.every((asset) => asset.width > 1000 && asset.alpha === 0));
  pass("Elad's dog and Nenad's transparent cat sprites follow their engineers");
  await companions.close();
  assert.deepEqual(errors, []);
  pass("No uncaught browser errors");
  console.log(`\n${passed} browser checks passed.`);
} finally {
  await browser.close();
}
