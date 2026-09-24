import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  step,
  activateDash,
  activatePulse,
  repair,
  spawnEnemy,
  damageEnemy,
  pickUpgrade,
  upgradeChoices,
  WAVES,
} from "../src/engine.js";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../src/engine.js";
import { WORLD_COLS, WORLD_ROWS, TILE, blockAt, isSolidAt } from "../src/world.js";
const game = () => createGame(() => 0.5);
const START_X = WORLD_WIDTH / 2;
const START_Y = WORLD_HEIGHT / 2;
function advance(g, seconds, input = {}) {
  for (let i = 0; i < seconds * 60; i++) step(g, 1 / 60, input);
}
test("movement is normalized and contained inside the arena", () => {
  const g = game();
  advance(g, 1, { x: 1, y: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(
        (g.player.x - START_X - (g.player.y - START_Y)) / 2,
        (g.player.x - START_X + g.player.y - START_Y) / 4,
      ) - 172,
    ) < 1,
  );
  advance(g, 20, { x: 1, y: 1 });
  assert.ok(g.player.x <= WORLD_WIDTH - 66);
  assert.ok(g.player.y <= WORLD_HEIGHT - 66);
});
test("pause freezes the full simulation", () => {
  const g = game();
  g.mode = "paused";
  advance(g, 3, { x: 1 });
  assert.equal(g.time, 0);
  assert.equal(g.player.x, START_X);
  assert.equal(g.enemies.length, 0);
});
test("screen directions retain equal visible speed after isometric projection", () => {
  for (const input of [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
  ]) {
    const g = game();
    g.spawnTimer = 100;
    g.servers = [];
    // Retain one far-away server so the survival condition stays active.
    g.servers.push({ x: 100, y: 100, hp: 100 });
    advance(g, 1, input);
    const dx = g.player.x - START_X,
      dy = g.player.y - START_Y;
    const sx = (dx - dy) / 2,
      sy = (dx + dy) / 4,
      mag = Math.hypot(input.x, input.y);
    assert.ok(Math.abs(sx - (172 * input.x) / mag) < 0.001);
    assert.ok(Math.abs(sy - (172 * input.y) / mag) < 0.001);
  }
});
test("projectiles survive outside the legacy room, hit at range, and expire normally", () => {
  for (const origin of [
    { x: 700, y: 800 },
    { x: START_X, y: START_Y },
    { x: 2600, y: 1800 },
  ]) {
    const g = game();
    Object.assign(g.player, origin);
    g.spawnTimer = 100;
    const enemy = spawnEnemy(g, "bug", { x: origin.x + 350, y: origin.y });
    enemy.speed = 0;
    step(g, 1 / 60);
    assert.equal(g.shots.length, 1);
    advance(g, 1.2);
    assert.equal(g.kills, 1);
    assert.equal(g.player.hp, 100);
    advance(g, 1.2);
    assert.equal(g.shots.length, 0);
  }
});
test("hostile shots travel across the expanded world and damage the player", () => {
  const g = game();
  g.spawnTimer = 100;
  g.shots.push({
    x: START_X + 200,
    y: START_Y,
    vx: -200,
    vy: 0,
    life: 3,
    hostile: true,
    damage: 8,
  });
  advance(g, 1.1);
  assert.equal(g.player.hp, 92);
  assert.equal(g.shots.length, 0);
});
test("dash cooldown prevents spam, then becomes available again", () => {
  const g = game();
  assert.equal(activateDash(g), true);
  assert.equal(activateDash(g), false);
  assert.ok(g.player.invincible > 0);
  advance(g, 3.1);
  assert.equal(activateDash(g), true);
});
test("pulse only hits threats in range, and clears hostile projectiles", () => {
  const g = game();
  const near = spawnEnemy(g, "bug", { x: START_X + 20, y: START_Y }),
    expanded = spawnEnemy(g, "bug", { x: START_X + 210, y: START_Y }),
    far = spawnEnemy(g, "bug", { x: START_X + 340, y: START_Y });
  g.shots.push({ x: START_X, y: START_Y, hostile: true });
  activatePulse(g);
  assert.ok(near.hp <= 0);
  assert.ok(expanded.hp <= 0);
  assert.equal(g.pulses[0].radius, 240);
  assert.equal(far.hp, 32);
  assert.equal(g.shots.length, 0);
  assert.equal(g.kills, 2);
  assert.equal(activatePulse(g), false);
});
test("repair requires proximity and currency, and can revive an offline server", () => {
  const g = game(),
    s = g.servers[0];
  s.hp = 0;
  assert.equal(repair(g), false);
  g.player.x = s.x;
  g.player.y = s.y + 45;
  assert.equal(repair(g), true);
  assert.equal(s.hp, 24);
  assert.equal(g.patches, 8);
  g.patches = 0;
  assert.equal(repair(g), false);
  assert.equal(s.hp, 24);
});
test("auto-fire destroys an in-range enemy and yields collectible patches", () => {
  const g = game();
  g.spawnTimer = 100;
  const enemy = spawnEnemy(g, "bug", { x: START_X + 350, y: START_Y });
  enemy.speed = 0;
  advance(g, 1.5);
  assert.equal(g.kills, 1);
  assert.ok(g.patches > 12 || g.drops.length > 0);
  assert.ok(g.score >= 60);
});
test("upgrades only apply at intermission and cannot be selected twice", () => {
  const g = game();
  assert.equal(pickUpgrade(g, "damage"), false);
  g.waveTime = WAVES[0].duration;
  step(g, 0.016);
  assert.equal(g.mode, "upgrade");
  const old = g.player.damage;
  assert.equal(pickUpgrade(g, "damage"), true);
  assert.equal(g.player.damage, old * 2);
  assert.equal(g.wave, 1);
  assert.equal(g.mode, "playing");
  g.mode = "upgrade";
  assert.equal(pickUpgrade(g, "damage"), false);
  assert.ok(upgradeChoices(g).every((u) => u.id !== "damage"));
});
test("all servers down or zero player health ends the shift", () => {
  for (const loss of ["servers", "player"]) {
    const g = game();
    if (loss === "servers") g.servers.forEach((s) => (s.hp = 0));
    else g.player.hp = 0;
    step(g, 0.016);
    assert.equal(g.mode, "lost");
    assert.ok(g.events.some((e) => e.type === "end" && !e.won));
  }
});
test("full incident progression spawns a boss and killing it wins", () => {
  const g = game();
  for (const id of ["damage", "multishot"]) {
    g.waveTime = WAVES[g.wave].duration;
    step(g, 0.016);
    assert.equal(g.mode, "upgrade");
    pickUpgrade(g, id);
  }
  g.waveTime = WAVES[2].duration;
  step(g, 0.016);
  const boss = g.enemies.find((e) => e.type === "boss");
  assert.ok(boss);
  damageEnemy(g, boss, 10000);
  step(g, 0.016);
  assert.equal(g.mode, "won");
  assert.ok(g.score >= 4000);
  assert.ok(g.events.some((e) => e.type === "end" && e.won));
});
test("health pickups and self-healing stay within their caps", () => {
  const g = game();
  g.drops.push({
    x: g.player.x,
    y: g.player.y,
    type: "health",
    value: 50,
    life: 5,
  });
  step(g, 0.016);
  assert.equal(g.player.hp, 100);
  g.upgrades.push("repair");
  advance(g, 1);
  assert.ok(g.servers.every((s) => s.hp <= 100));
});
test("world blocks are deterministic and cover the expanded datacenter", () => {
  assert.equal(WORLD_COLS, Math.ceil(WORLD_WIDTH / 110));
  assert.equal(WORLD_ROWS, Math.ceil(WORLD_HEIGHT / 110));
  assert.equal(blockAt(0, 0), "edge");
  assert.equal(blockAt(-1, 4), "void");
  assert.equal(blockAt(14, 6), "walkway");
  assert.equal(blockAt(7, 6), blockAt(7, 6));
});
test("rack rows are solid and leave adjacent service aisles walkable", () => {
  assert.equal(blockAt(3, 3), "compute-rack");
  assert.equal(isSolidAt(3.5 * TILE, 3.5 * TILE), true);
  assert.equal(isSolidAt(5.5 * TILE, 3.5 * TILE), false);
});
