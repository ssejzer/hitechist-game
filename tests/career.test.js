import test from "node:test";
import assert from "node:assert/strict";
import { LOCATIONS } from "../src/career.js";
import { createGame, step, repair, pickUpgrade, spawnEnemy, damageEnemy, activeObjectiveId, useCoffee, dispatchSupport } from "../src/engine.js";
import { isSolidAt, blockAt } from "../src/world.js";
import { LocalSession } from "../src/session.js";
import { CHARACTERS } from "../src/characters.js";
import { MANAGER_EMAILS, openManagerInteraction, resolveManagerRequest, answerManagerEmail,
  decommissionMachine, buyEquipment, collectBitcoin, hireManagerHelp } from "../src/manager.js";

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

test("manager staff decisions stop movement until actioned and survive snapshots", () => {
  const session = new LocalSession({ seed: 42, locationId: "manager" });
  const g = session.state;
  const person = g.bystanders.find((p) => p.requestIndex === 0);
  assert.ok(person);
  g.spawnTimer = 1000;
  Object.assign(g.player, { x: person.x + 90, y: person.y });
  session.advance(1 / 60);
  assert.equal(g.mode, "manager_request");
  assert.equal(g.pendingManagerRequest, person.id);
  const frozen = { x: g.player.x, y: g.player.y, time: g.time };
  session.setInput({ x: 1, y: 0 });
  session.advance(1);
  assert.deepEqual({ x: g.player.x, y: g.player.y, time: g.time }, frozen);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.equal(resolveManagerRequest(restored.state, 0), true);
  assert.equal(restored.state.bystanders.find((p) => p.id === person.id).requestResolved, true);
  restored.advance(1 / 60);
  assert.equal(restored.state.mode, "playing");
});

test("private office email and playroom cabinet activate only nearby", () => {
  const g = createGame(() => 0.5, "manager");
  assert.equal(openManagerInteraction(g), null);
  const { interactions } = LOCATIONS.manager;
  Object.assign(g.player, interactions[0]);
  assert.equal(openManagerInteraction(g), "computer");
  assert.equal(answerManagerEmail(g, 1, 0), false);
  for (let i = 0; i < MANAGER_EMAILS.length; i++)
    assert.equal(answerManagerEmail(g, i, 0), true);
  assert.equal(g.managerEmailsAnswered, MANAGER_EMAILS.length);
  g.mode = "playing";
  Object.assign(g.player, interactions.find((item) => item.id === "arcade"));
  assert.equal(openManagerInteraction(g), "arcade");
});

test("private office has one desk and HR hires people and a monitoring agent", () => {
  const session = new LocalSession({ seed: 11, locationId: "manager" });
  const g = session.state;
  const office = LOCATIONS.manager.rooms.find((room) => room.id === "private_office");
  const hr = LOCATIONS.manager.rooms.find((room) => room.id === "people");
  const desks = [];
  for (let y = office.y + 110; y < office.y + office.height - 110; y += 110)
    for (let x = office.x + 110; x < office.x + office.width - 110; x += 110)
      if (blockAt(Math.floor(x / 110), Math.floor(y / 110), "manager") === "office-desk")
        desks.push({ x, y });
  assert.equal(desks.length, 1);
  assert.equal(g.coffeeMachines.some((machine) => machine.roomId === "private_office"), false);
  assert.equal(g.bystanders.some((person) => person.roomId === "private_office"), false);
  assert.equal(dispatchSupport(g), false);
  const station = LOCATIONS.manager.interactions.find((item) => item.id === "hr");
  assert.ok(station.x > hr.x && station.x < hr.x + hr.width && station.y > hr.y);
  Object.assign(g.player, station);
  assert.equal(openManagerInteraction(g), "hr");
  assert.equal(hireManagerHelp(g, "people"), false);
  g.hardwareBudget = 260;
  assert.equal(hireManagerHelp(g, "people"), true);
  assert.equal(hireManagerHelp(g, "people"), false);
  assert.equal(hireManagerHelp(g, "agent"), true);
  assert.ok(g.drone);
  assert.equal(g.hardwareBudget, 10);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.hiredHelp, ["people", "agent"]);
  restored.state.mode = "playing";
  restored.state.servers[0].hp = 20;
  assert.equal(dispatchSupport(restored.state), true);
  assert.ok(restored.state.servers[0].hp > 20);
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

test("coffee machines stay in staffed rooms and coffee overload expires", () => {
  for (const location of Object.values(LOCATIONS)) {
    const g = createGame(() => 0.5, location.id);
    assert.equal(g.coffeeMachines.length, location.id === "datacenter" ? 0 :
      location.id === "manager" ? location.rooms.length - 4 : location.rooms.length);
    for (const machine of g.coffeeMachines) {
      assert.equal(isSolidAt(machine.x, machine.y, 35, location.id), false, machine.id);
      assert.ok(location.rooms.some((room) => room.id === machine.roomId &&
        machine.x > room.x && machine.x < room.x + room.width &&
        machine.y > room.y && machine.y < room.y + room.height));
    }
  }
  const g = createGame(() => 0.5, "office");
  g.spawnTimer = 1000;
  Object.assign(g.player, { x: g.coffeeMachines[0].x, y: g.coffeeMachines[0].y + 60 });
  assert.equal(useCoffee(g), true);
  assert.equal(g.player.coffeeTime, 8);
  assert.equal(g.coffeeMachines[0].cooldown, 20);
  for (let i = 0; i < 8 * 60; i++) step(g, 1 / 60);
  assert.equal(g.player.coffeeTime, 0);
  assert.ok(g.player.coffeeCrash > 0);
});

test("manager playroom is compact and the lounge wing has four furnished rooms", () => {
  const location = LOCATIONS.manager;
  const room = (id) => location.rooms.find((candidate) => candidate.id === id);
  const playroom = room("playroom");
  assert.ok(playroom.width * playroom.height < room("operations").width * room("operations").height / 5);
  assert.deepEqual(location.interactions.filter((item) =>
    item.x >= playroom.x && item.x < playroom.x + playroom.width &&
    item.y >= playroom.y && item.y < playroom.y + playroom.height).map((item) => item.id), ["arcade"]);
  const expected = { lounge: ["lounge-sofa"], hardware_storage: ["laptop-shelf", "display-shelf", "cable-shelf"],
    kitchen: ["kitchen-counter"], bathroom: ["bathroom-sink", "bathroom-toilet"] };
  for (const [id, furnishings] of Object.entries(expected)) {
    const bounds = room(id);
    assert.ok(bounds, id);
    const found = new Set();
    for (let y = bounds.y + 110; y < bounds.y + bounds.height - 110; y += 55)
      for (let x = bounds.x + 110; x < bounds.x + bounds.width - 110; x += 55)
        found.add(blockAt(Math.floor(x / 110), Math.floor(y / 110), "manager"));
    for (const furnishing of furnishings) assert.ok(found.has(furnishing), `${id}: ${furnishing}`);
  }
  const game = createGame(() => 0.5, "manager");
  assert.ok(game.coffeeMachines.every((machine) => !["playroom", "hardware_storage", "bathroom"].includes(machine.roomId)));
  assert.ok(game.bystanders.every((person) => person.roomId !== "playroom"));
});

test("playroom pets walk and play in the hallway and survive snapshots", () => {
  const session = new LocalSession({ seed: 31, locationId: "manager" });
  const game = session.state;
  const room = LOCATIONS.manager.rooms.find((item) => item.id === "playroom");
  assert.deepEqual(game.playroomPets.map((pet) => pet.species), ["dog", "cat"]);
  const start = game.playroomPets.map((pet) => ({ x: pet.x, y: pet.y }));
  game.spawnTimer = 1000;
  for (let i = 0; i < 600; i++) {
    session.advance(1 / 60);
    for (const pet of game.playroomPets) {
      assert.equal(isSolidAt(pet.x, pet.y, 35, "manager"), false);
      assert.equal(pet.x >= room.x && pet.x < room.x + room.width &&
        pet.y >= room.y && pet.y < room.y + room.height, false);
    }
  }
  assert.ok(game.playroomPets.every((pet, i) => Math.hypot(pet.x - start[i].x, pet.y - start[i].y) > 100));
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.playroomPets, game.playroomPets);
  session.advance(1 / 60);
  restored.advance(1 / 60);
  assert.deepEqual(restored.state.playroomPets, game.playroomPets);
});

test("manager rooms, staff, and hardware budget form a playable equipment loop", () => {
  const session = new LocalSession({ seed: 31, locationId: "manager" });
  const g = session.state;
  const rooms = LOCATIONS.manager.rooms;
  for (const [id, staff] of [["kitchen", ["rotem", "tal"]],
    ["crypto_mining", ["nenad", "luis"]], ["conference", ["aldo"]]]) {
    const room = rooms.find((item) => item.id === id);
    assert.ok(room);
    for (const name of staff) assert.equal(g.bystanders.find((person) => person.characterId === name)?.roomId, id);
  }
  const pool = { x: 13300, y: 1450 };
  assert.equal(isSolidAt(pool.x, pool.y, 28, "manager"), true);
  const at = (id) => Object.assign(g.player, LOCATIONS.manager.interactions.find((item) => item.id === id));
  at("storage");
  assert.equal(openManagerInteraction(g), "storage");
  assert.equal(buyEquipment(g, "workstations"), false);
  assert.equal(decommissionMachine(g), true);
  assert.equal(decommissionMachine(g), true);
  assert.equal(g.hardwareBudget, 200);
  assert.equal(buyEquipment(g, "workstations"), true);
  assert.equal(buyEquipment(g, "workstations"), false);
  assert.equal(g.hardwareBudget, 40);
  g.mode = "playing";
  at("mining");
  assert.equal(openManagerInteraction(g), "mining");
  assert.equal(collectBitcoin(g), true);
  assert.equal(collectBitcoin(g), false);
  assert.equal(g.bitcoins, 1);
  assert.equal(g.hardwareBudget, 160);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.newEquipment, ["workstations"]);
  assert.equal(restored.state.oldMachines, 1);
  assert.equal(restored.state.bitcoins, 1);
  assert.equal(restored.state.miningCooldown, g.miningCooldown);
  assert.equal(restored.state.hardwareBudget, 160);
});

test("monitoring drone seeks damaged equipment, collects patches, and restores from snapshots", () => {
  const session = new LocalSession({ seed: 21, locationId: "office", characterId: "yaroslav" });
  const g = session.state;
  g.spawnTimer = 1000;
  g.servers[0].hp = 40;
  Object.assign(g.player, { x: g.servers[0].x + 150, y: g.servers[0].y + 80 });
  session.advance(1 / 60);
  assert.equal(g.drone.targetId, g.servers[0].id);
  g.drops.push({ id: 900, x: g.drone.x, y: g.drone.y, type: "patch", value: 3, life: 10 });
  const patches = g.patches;
  session.advance(1 / 60);
  assert.equal(g.patches, patches + 3);
  assert.equal(g.drops.length, 0);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.drone, g.drone);
  session.advance(1 / 60);
  restored.advance(1 / 60);
  assert.deepEqual(restored.state.drone, g.drone);
});

test("only Yaroslav gets a monitoring drone", () => {
  for (const character of CHARACTERS) {
    const g = createGame(() => 0.5, "office", character.id);
    assert.equal(g.drone !== null, character.id === "yaroslav", character.id);
  }
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
    const targets = [...location.equipment, ...location.rooms.map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))]
      .filter((item) => location.id !== "datacenter" ||
        (item.x >= location.rooms[0].x && item.x < location.rooms[0].x + location.rooms[0].width));
    for (const item of targets) {
      assert.ok(queue.some(([x, y]) => Math.hypot(x * 55 - item.x, y * 55 - item.y) < 110), `${location.id}: ${item.name || "room"} unreachable`);
    }
  }
});

test("each datacenter has a sidewalk exit, but walking cannot cross buildings", () => {
  const location = LOCATIONS.datacenter;
  for (const room of location.rooms) {
    const start = [Math.round((room.x + room.width / 2) / 55), Math.round((room.y + room.height / 2) / 55)];
    const queue = [start], seen = new Set([start.join(",")]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (seen.has(key) || nx * 55 < 140 || ny * 55 < 140 ||
            nx * 55 > location.width - 140 || ny * 55 > location.height - 140 ||
            isSolidAt(nx * 55, ny * 55, 28, location.id)) continue;
        seen.add(key); queue.push([nx, ny]);
      }
    }
    const stop = { x: room.x + room.width / 2, y: location.shuttleStopY };
    assert.ok(queue.some(([x, y]) => Math.hypot(x * 55 - stop.x, y * 55 - stop.y) < 80), `${room.id}: no sidewalk exit`);
    const northEntry = { x: room.x + room.width / 2, y: room.y - 150 };
    assert.ok(queue.some(([x, y]) => Math.hypot(x * 55 - northEntry.x, y * 55 - northEntry.y) < 80), `${room.id}: no north entry`);
    for (const other of location.rooms.filter((r) => r !== room))
      assert.ok(!queue.some(([x, y]) => x * 55 >= other.x + 150 && x * 55 < other.x + other.width - 150 &&
        y * 55 >= other.y + 150 && y * 55 < other.y + other.height - 150), `${room.id}: can walk into ${other.id}`);
  }
});

test("call-center rooms have distinct floors and a walkable connecting doorway", () => {
  const { doors, rooms } = LOCATIONS.call_center;
  const door = doors[0];
  assert.equal(blockAt(6, 7, "call_center"), "office-floor");
  assert.equal(blockAt(20, 7, "call_center"), "comms-floor");
  assert.equal(isSolidAt(door.x, door.y, 28, "call_center"), false);
  assert.equal(isSolidAt(door.x, rooms[0].y + 220, 28, "call_center"), true);
  for (const x of [door.x - 220, door.x - 110, door.x, door.x + 110, door.x + 220])
    for (const y of [door.y - 110, door.y, door.y + 110])
      assert.equal(isSolidAt(x, y, 28, "call_center"), false, `blocked doorway approach at ${x},${y}`);
});

test("career footprints grow and workplace equipment matches each room", () => {
  const locations = Object.values(LOCATIONS);
  for (let i = 1; i < locations.length; i++) {
    assert.ok(locations[i].width > locations[i - 1].width);
    assert.ok(locations[i].height > locations[i - 1].height);
  }
  const comms = LOCATIONS.call_center.rooms[1];
  const dc = LOCATIONS.datacenter.rooms[0];
  const tilesIn = (room, id) => {
    const types = new Set();
    for (let y = room.y + 150; y < room.y + room.height - 150; y += 110)
      for (let x = room.x + 150; x < room.x + room.width - 150; x += 110)
        types.add(blockAt(Math.floor(x / 110), Math.floor(y / 110), id));
    return types;
  };
  assert.ok(tilesIn(comms, "call_center").has("network-rack"));
  assert.ok(tilesIn(dc, "datacenter").has("cooling-unit"));
  assert.ok(tilesIn(dc, "datacenter").has("workstation"));
  assert.ok(tilesIn(LOCATIONS.office.rooms[0], "office").has("office-desk"));
  assert.equal(LOCATIONS.tech_lead.rooms.filter((r) => r.id.endsWith("_office")).length, 3);
  assert.equal(LOCATIONS.tech_lead.rooms.filter((r) => r.id.endsWith("_datacenter")).length, 3);
  assert.ok(tilesIn(LOCATIONS.tech_lead.rooms[0], "tech_lead").has("office-desk"));
  assert.ok(tilesIn(LOCATIONS.tech_lead.rooms[1], "tech_lead").has("compute-rack"));
  const maximumWalkingSpeed = createGame(() => 0.5, "datacenter").player.speed * 1.22 ** 2;
  for (const [a, b] of [[0, 1], [1, 2]])
    assert.ok((LOCATIONS.datacenter.rooms[b].x -
      (LOCATIONS.datacenter.rooms[a].x + LOCATIONS.datacenter.rooms[a].width)) / maximumWalkingSpeed > 15);
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

test("Tech Lead sites require walking and remote support protects equipment", () => {
  const session = new LocalSession({ seed: 17, locationId: "tech_lead" });
  const g = session.state;
  session.setInput({ x: 1, y: 0, repair: true });
  assert.equal(session.travel("apac_office"), false);
  assert.equal(g.player.x, LOCATIONS.tech_lead.start.x);
  assert.equal(session.input.x, 1);
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.equal(restored.state.player.x, g.player.x);
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
  const gapX = (rooms[0].x + rooms[0].width + rooms[1].x) / 2;
  assert.equal(blockAt(Math.floor(gapX / 110), 10, "datacenter"), "road");
  assert.equal(session.travel("az_c"), true);
  const g = session.state;
  assert.equal(g.vehicle, null, "choosing a destination does not board a shuttle");
  assert.equal(g.shuttleDestination, "az_c");
  assert.equal(g.player.x, LOCATIONS.datacenter.start.x);
  g.spawnTimer = 1000;
  const before = g.shuttles.map((shuttle) => shuttle.elapsed);
  for (let i = 0; i < 30; i++) session.advance(1 / 60);
  assert.equal(g.vehicle, null, "the player must reach a stop");
  assert.notDeepEqual(g.shuttles.map((shuttle) => shuttle.elapsed), before);
  g.player.x = rooms[0].x + rooms[0].width / 2;
  g.player.y = LOCATIONS.datacenter.shuttleStopY;
  for (let i = 0; i < 300 && !g.vehicle; i++) session.advance(1 / 60);
  assert.equal(g.vehicle?.phase, "boarding", "the next arriving shuttle boards the waiting player");
  const restored = LocalSession.fromSnapshot(session.snapshot());
  assert.deepEqual(restored.state.vehicle, g.vehicle);
  assert.deepEqual(restored.state.shuttles, g.shuttles);
  let reachedRoad = false;
  for (let i = 0; i < 1000 && restored.state.vehicle; i++) {
    restored.advance(1 / 60);
    if (restored.state.vehicle?.phase === "riding" && restored.state.player.y >= LOCATIONS.datacenter.shuttleRoadY - 45) reachedRoad = true;
  }
  assert.equal(reachedRoad, true, "the occupied shuttle visibly drives on the road");
  assert.equal(restored.state.vehicle, null);
  assert.equal(restored.state.shuttleDestination, null);
  assert.equal(restored.state.player.x, rooms[2].x + rooms[2].width / 2);
  assert.equal(restored.state.player.y, rooms[2].y + rooms[2].height * 0.89);
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

test("entering the manager kitchen or bathroom lowers productivity once per visit", () => {
  const g = createGame(() => 0.5, "manager");
  g.spawnTimer = 100;
  const visit = (id) => {
    const room = LOCATIONS.manager.rooms.find((item) => item.id === id);
    g.player.x = room.x + room.width / 2;
    g.player.y = room.y + room.height / 2;
    step(g, 1 / 60);
  };
  visit("kitchen");
  assert.equal(g.productivity, 90);
  step(g, 1 / 60);
  assert.equal(g.productivity, 90);
  visit("bathroom");
  assert.equal(g.productivity, 80);
  visit("kitchen");
  assert.equal(g.productivity, 70);
  assert.equal(g.events.filter((event) => event.type === "toast" && event.text.includes("productivity")).length, 3);
});
