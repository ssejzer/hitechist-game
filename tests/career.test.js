import test from "node:test";
import assert from "node:assert/strict";
import { LOCATIONS } from "../src/career.js";
import { createGame, step, repair, pickUpgrade, spawnEnemy, damageEnemy } from "../src/engine.js";
import { isSolidAt } from "../src/world.js";
import { LocalSession } from "../src/session.js";

test("career stations and both call-center rooms can be reached from their entrance", () => {
  for (const location of Object.values(LOCATIONS)) {
    const start = [Math.round(location.start.x / 55), Math.round(location.start.y / 55)];
    const queue = [start], seen = new Set([start.join(",")]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (seen.has(key) || nx * 55 < 140 || ny * 55 < 140 ||
            nx * 55 > location.width - 140 || ny * 55 > location.height - 140 ||
            isSolidAt(nx * 55, ny * 55, 28, location.id)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    for (const item of [...location.equipment, ...location.rooms.map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))]) {
      assert.ok(queue.some(([x, y]) => Math.hypot(x * 55 - item.x, y * 55 - item.y) < 110), `${location.id}: ${item.name || "room"} unreachable`);
    }
  }
});

test("office objectives need proximity and patches, gate waves, and survive snapshots", () => {
  const session = new LocalSession({ seed: 8 });
  const g = session.state;
  assert.equal(g.locationId, "office");
  g.spawnTimer = 1000;
  g.waveTime = 30;
  step(g, 1 / 60);
  assert.equal(g.mode, "playing");
  assert.equal(repair(g), false);
  Object.assign(g.player, { x: g.servers[0].x, y: g.servers[0].y + 55 });
  for (let i = 0; i < 3; i++) assert.equal(repair(g), true);
  assert.equal(g.objectives[0].progress, 75);
  assert.equal(g.patches, 12);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.equal(repair(restored.state), true);
  assert.equal(restored.state.objectives[0].completed, true);
  assert.equal(restored.state.patches, 8);
  restored.advance(1 / 60);
  assert.equal(restored.state.mode, "upgrade");
  assert.equal(restored.upgradeChoices().length, 3);
  assert.equal(pickUpgrade(restored.state, restored.upgradeChoices()[0].id), true);
  assert.equal(restored.state.wave, 1);
  assert.equal(restored.state.objectives[1].progress, 0);
});

test("final office outage requires the headset fix and boss defeat", () => {
  const g = createGame(() => 0.5, "office");
  g.wave = 2;
  g.waveTime = 35;
  g.spawnTimer = 1000;
  step(g, 1 / 60);
  assert.equal(g.bossSpawned, false);
  Object.assign(g.player, { x: g.servers[2].x, y: g.servers[2].y + 60 });
  for (let i = 0; i < 4; i++) repair(g);
  step(g, 1 / 60);
  assert.equal(g.bossSpawned, true);
  const boss = g.enemies.find((e) => e.type === "boss");
  damageEnemy(g, boss, 1000);
  step(g, 1 / 60);
  assert.equal(g.mode, "won");
  assert.equal(LOCATIONS.office.next, "call_center");
});
