import test from "node:test";
import assert from "node:assert/strict";
import { LOCATIONS } from "../src/career.js";
import { createGame, step, repair, pickUpgrade, spawnEnemy, damageEnemy, activeObjectiveId } from "../src/engine.js";
import { isSolidAt, blockAt } from "../src/world.js";
import { LocalSession } from "../src/session.js";
import { CHARACTERS } from "../src/characters.js";

test("career bystanders grow by level and the fifth level includes the whole roster", () => {
  const expected = { office: 0, call_center: 1, sysadmin: 2, tech_lead: 4, datacenter: 10, manager: 10 };
  for (const [locationId, count] of Object.entries(expected)) {
    const g = new LocalSession({ seed: 38, characterId: "erez", locationId }).state;
    assert.equal(g.bystanders.length, count, locationId);
    assert.equal(new Set(g.bystanders.map((p) => p.characterId)).size, count);
    assert.ok(g.bystanders.every((p) => p.characterId !== g.player.characterId));
    assert.ok(g.bystanders.every((p) => !isSolidAt(p.x, p.y, 28, locationId)));
    assert.ok(g.bystanders.filter((p) => p.roaming).length <= 6 || locationId === "manager");
  }
  const levelFive = new LocalSession({ seed: 38, locationId: "datacenter" }).state;
  assert.deepEqual(new Set(levelFive.bystanders.map((p) => p.characterId)),
    new Set(CHARACTERS.filter((c) => c.id !== "sebastian").map((c) => c.id)));
  assert.equal(levelFive.bystanders.filter((p) => p.roaming).length, 6);
  assert.equal(levelFive.bystanders.find((p) => p.characterId === "tal").roaming, false);
});

test("bystanders wander and their state survives a snapshot", () => {
  const session = new LocalSession({ seed: 17, locationId: "datacenter" });
  const initial = session.state.bystanders.map(({ x, y }) => ({ x, y }));
  session.state.spawnTimer = 1000;
  for (let i = 0; i < 120; i++) session.advance(1 / 60);
  assert.ok(session.state.bystanders.some((p, i) => p.roaming &&
    Math.hypot(p.x - initial[i].x, p.y - initial[i].y) > 2));
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.bystanders, session.state.bystanders);
  session.advance(1 / 60);
  restored.advance(1 / 60);
  assert.deepEqual(restored.state.bystanders, session.state.bystanders);
});

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

test("call-center rooms have distinct floors and a walkable connecting doorway", () => {
  assert.equal(blockAt(6, 7, "call_center"), "office-floor");
  assert.equal(blockAt(20, 7, "call_center"), "comms-floor");
  assert.equal(isSolidAt(1485, 880, 28, "call_center"), false);
  assert.equal(isSolidAt(1485, 330, 28, "call_center"), true);
  for (const x of [1265, 1375, 1485, 1595, 1705])
    for (const y of [770, 880, 990])
      assert.equal(isSolidAt(x, y, 28, "call_center"), false, `blocked doorway approach at ${x},${y}`);
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

test("every career stage runs ordered objectives, upgrades, and a promotion boss", () => {
  assert.deepEqual(Object.keys(LOCATIONS), ["office", "call_center", "sysadmin", "tech_lead", "datacenter", "manager"]);
  for (const location of Object.values(LOCATIONS)) {
    const g = createGame(() => 0.5, location.id);
    g.spawnTimer = 1000;
    g.patches = 100;
    for (let wave = 0; wave < 3; wave++) {
      const objective = g.objectives[wave];
      for (const id of objective.steps) {
        assert.equal(activeObjectiveId(g), id, `${location.id}: objective order`);
        const equipment = g.servers.find((s) => s.id === id);
        assert.ok(equipment, `${location.id}: missing ${id}`);
        Object.assign(g.player, { x: equipment.x, y: equipment.y + 55 });
        for (let i = 0; i < 4; i++) assert.equal(repair(g), true);
      }
      assert.equal(objective.completed, true);
      g.waveTime = location.waves[wave].duration;
      step(g, 1 / 60);
      if (wave < 2) {
        assert.equal(g.mode, "upgrade", location.id);
        assert.equal(pickUpgrade(g, ["speed", "damage"][wave]), true);
        g.spawnTimer = 1000;
      }
    }
    const boss = g.enemies.find((e) => e.type === "boss");
    assert.ok(boss, `${location.id}: final challenge`);
    damageEnemy(g, boss, boss.maxHp + 1);
    step(g, 1 / 60);
    assert.equal(g.mode, "won", location.id);
  }
});

test("site travel clears held input and protects unattended equipment", () => {
  const session = new LocalSession({ seed: 17, locationId: "tech_lead" });
  const g = session.state;
  session.setInput({ x: 1, y: 0, repair: true });
  assert.equal(session.travel("apac"), true);
  assert.deepEqual(session.input, { x: 0, y: 0, repair: false });
  assert.ok(g.grace >= 5);
  assert.equal(g.player.x, 2750);
  assert.equal(session.travel("americas"), false);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.equal(restored.state.player.x, 2750);
  assert.equal(restored.state.grace, g.grace);
  assert.equal(restored.dispatchSupport(), true);
  assert.equal(restored.dispatchSupport(), false);
  const remote = restored.state.servers.find((s) => s.id === "vpn");
  remote.hp = 60;
  const enemy = spawnEnemy(restored.state, "bug", { x: remote.x + 45, y: remote.y });
  enemy.target = "server";
  enemy.attack = 0;
  restored.state.spawnTimer = 1000;
  step(restored.state, 1 / 60);
  assert.equal(remote.hp, 60);
});

test("AWS shuttles circulate, stop for waiting players, and survive snapshots", () => {
  const session = new LocalSession({ seed: 21, locationId: "datacenter" });
  const rooms = LOCATIONS.datacenter.rooms;
  assert.ok(rooms[1].x - (rooms[0].x + rooms[0].width) >= 500);
  assert.equal(blockAt(12, 10, "datacenter"), "road");
  assert.equal(session.travel("az_c"), true);
  const g = session.state;
  assert.equal(g.vehicle, null, "choosing a destination does not board a shuttle");
  assert.equal(g.shuttleDestination, "az_c");
  assert.equal(g.player.x, 550);
  g.spawnTimer = 1000;
  const before = g.shuttles.map((shuttle) => shuttle.elapsed);
  for (let i = 0; i < 30; i++) session.advance(1 / 60);
  assert.equal(g.vehicle, null, "the player must reach a stop");
  assert.notDeepEqual(g.shuttles.map((shuttle) => shuttle.elapsed), before);
  g.player.x = 605; g.player.y = 1870;
  for (let i = 0; i < 300 && !g.vehicle; i++) session.advance(1 / 60);
  assert.equal(g.vehicle?.phase, "boarding", "the next arriving shuttle boards the waiting player");
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.vehicle, g.vehicle);
  assert.deepEqual(restored.state.shuttles, g.shuttles);
  let reachedRoad = false;
  for (let i = 0; i < 1000 && restored.state.vehicle; i++) {
    restored.advance(1 / 60);
    if (restored.state.vehicle?.phase === "riding" && restored.state.player.y >= 2100) reachedRoad = true;
  }
  assert.equal(reachedRoad, true, "the occupied shuttle visibly drives on the road");
  assert.equal(restored.state.vehicle, null);
  assert.equal(restored.state.shuttleDestination, null);
  assert.equal(restored.state.player.x, 3685);
  assert.equal(restored.state.player.y, 1580);
  assert.ok(restored.state.grace > 0);
});

test("manager waves and boss are tougher than the preceding datacenter stage", () => {
  for (let i = 0; i < 3; i++) {
    assert.ok(LOCATIONS.manager.waves[i].interval < LOCATIONS.datacenter.waves[i].interval);
    assert.ok(LOCATIONS.manager.waves[i].duration > LOCATIONS.datacenter.waves[i].duration);
  }
  const manager = createGame(() => 0.5, "manager");
  const datacenter = createGame(() => 0.5, "datacenter");
  assert.ok(spawnEnemy(manager, "boss").maxHp > spawnEnemy(datacenter, "boss").maxHp);
});
