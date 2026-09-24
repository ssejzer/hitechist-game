import { WORLD_WIDTH, WORLD_HEIGHT, WORLD_SEED } from "./config.js";
import { isSolidAt } from "./world.js";
import { locationFor } from "./career.js";
import { seededRandom } from "./random.js";
import { createBystanders, advanceBystanders } from "./bystanders.js";
export { WORLD_WIDTH, WORLD_HEIGHT } from "./config.js";
export const WIDTH = 1120,
  HEIGHT = 620;
// Gameplay takes place in a facility much larger than the camera viewport.
// Rendering projects this navigation grid into an isometric world.
export const WAVES = [
  {
    name: "THE LEGACY STACK",
    tagline: "It worked on someone's machine.",
    duration: 45,
    interval: 1.55,
  },
  {
    name: "CLUSTER PANIC",
    tagline: "Desired replicas: 3. Actual replicas: a problem.",
    duration: 50,
    interval: 1.1,
  },
  {
    name: "THE FRIDAY DEPLOY",
    tagline: "Just a small change before the weekend.",
    duration: 40,
    interval: 1.0,
  },
];
export const UPGRADES = [
  {
    id: "multishot",
    icon: "⋔",
    category: "AUTOMATION",
    name: "Parallel processing",
    description:
      "Fire two extra patches in a spread. More cores. Fewer problems.",
    effect: "3× PROJECTILES",
  },
  {
    id: "speed",
    icon: "»",
    category: "PERFORMANCE",
    name: "Overclocked",
    description: "Move 22% faster and fire 30% faster. Coffee is a dependency.",
    effect: "+22% SPEED / +30% FIRE RATE",
  },
  {
    id: "damage",
    icon: "#",
    category: "SECURITY",
    name: "Zero trust",
    description:
      "Double your patch damage. Trust no process. Verify with force.",
    effect: "2× PATCH DAMAGE",
  },
  {
    id: "repair",
    icon: "+",
    category: "RELIABILITY",
    name: "Self-healing infra",
    description: "Servers recover automatically. Repair twice as much with E.",
    effect: "AUTO-REPAIR / 2× REPAIR",
  },
  {
    id: "pulse",
    icon: "◎",
    category: "ROOT PRIVILEGES",
    name: "Sudo !!",
    description:
      "A bigger, stronger pulse, ready twice as often. Say it louder.",
    effect: "2× PULSE / 5s COOLDOWN",
  },
  {
    id: "magnet",
    icon: "⊹",
    category: "OBSERVABILITY",
    name: "Full visibility",
    description:
      "Collect patches from further away. Every patch also heals you.",
    effect: "3× PICKUP RANGE / PATCH HEAL",
  },
];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const wavesFor = (g) => locationFor(g.locationId)?.waves ?? WAVES;
export const boundsFor = (g) => locationFor(g.locationId) ?? { width: WORLD_WIDTH, height: WORLD_HEIGHT };
export const activeObjectiveId = (g) => {
  const objective = g.objectives?.[g.wave];
  return objective?.steps?.[objective.step] ?? (objective?.completed ? null : objective?.id);
};
export function createGame(random = seededRandom(WORLD_SEED), locationId = null, characterId = "sebastian") {
  const location = locationFor(locationId);
  const game = {
    locationId: location?.id ?? null,
    objectives: location ? location.waves.map((wave) => ({
      id: wave.objective ?? wave.steps[0],
      name: location.equipment.find((e) => e.id === (wave.objective ?? wave.steps[0])).name,
      steps: wave.steps ?? [wave.objective], step: 0,
      progress: 0, completed: false, reward: 500,
    })) : [],
    mode: "playing",
    random,
    tick: 0,
    time: 0,
    wave: 0,
    waveTime: 0,
    spawnTimer: 2.5,
    kills: 0,
    score: 0,
    patches: 12,
    shots: [],
    enemies: [],
    drops: [],
    particles: [],
    floaters: [],
    pulses: [],
    bystanders: [],
    events: [],
    shake: 0,
    banner: 3.5,
    repairTimer: 0,
    travelCooldown: 0,
    vehicle: null,
    shuttleDestination: null,
    shuttles: location?.id === "datacenter" ? [
      { id: "az-shuttle-1", from: 0, direction: 1, elapsed: 2.4 },
      { id: "az-shuttle-2", from: 1, direction: -1, elapsed: 3.2 },
      { id: "az-shuttle-3", from: 2, direction: 1, elapsed: 1.2 },
    ] : [],
    supportCooldown: 0,
    grace: 0,
    toastTimer: 0,
    bossSpawned: false,
    bossKilled: false,
    upgrades: [],
    upgradeOptions: [],
    nextId: 1,
    player: {
      id: "player-1",
      characterId,
      walkPhase: 0,
      facing: 1,
      x: location?.start.x ?? WORLD_WIDTH / 2,
      y: location?.start.y ?? WORLD_HEIGHT / 2,
      hp: 100,
      maxHp: 100,
      speed: 172,
      damage: 18,
      fireRate: 0.38,
      fireTimer: 0,
      dashCooldown: 0,
      dashTime: 0,
      pulseCooldown: 0,
      invincible: 0,
      dirX: 2,
      dirY: 2,
      moving: false,
    },
    servers: location ? location.equipment.map((e) => ({
      ...e, hp: 100, sector: location.name, rackKind: e.kind,
    })) : [
      {
        id: "server-web",
        x: 5720,
        y: 4070,
        hp: 100,
        name: "WEB-01",
        sector: "ACME / WEB AISLE",
        rackKind: "compute",
      },
      {
        id: "server-db",
        x: 6930,
        y: 3740,
        hp: 100,
        name: "DB-01",
        sector: "NORTHSTAR / STORAGE AISLE",
        rackKind: "storage",
      },
      {
        id: "server-api",
        x: 7480,
        y: 4950,
        hp: 100,
        name: "API-01",
        sector: "ORBIT / NETWORK AISLE",
        rackKind: "network",
      },
    ],
  };
  game.bystanders = createBystanders(game);
  return game;
}
export function emit(g, type, data = {}) {
  g.events.push({ type, ...data });
}
export function particles(g, x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = g.random() * Math.PI * 2,
      s = 25 + g.random() * 95;
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + g.random() * 0.4,
      maxLife: 0.75,
      color,
      size: 2 + g.random() * 3,
    });
  }
}
export function floating(g, x, y, text, color = "#b7f58e") {
  g.floaters.push({ x, y, text, color, life: 1.2 });
}
export function spawnEnemy(g, type, position) {
  const side = Math.floor(g.random() * 4);
  const location = locationFor(g.locationId);
  let x, y;
  if (position) {
    ({ x, y } = position);
  } else if (location) {
    const point = location.spawnPoints[side];
    if (location.travel) {
      const angle = side * Math.PI / 2 + (g.random() - 0.5) * 0.7;
      x = clamp(g.player.x + Math.cos(angle) * 480, 160, location.width - 160);
      y = clamp(g.player.y + Math.sin(angle) * 480, 160, location.height - 160);
    } else { x = point.x; y = point.y; }
  } else {
    // Incidents spill into the current sector instead of marching in from a
    // distant map edge. The broader world is for exploration, not dead time.
    const radius = 560 + g.random() * 220;
    const angle = side * (Math.PI / 2) + (g.random() - 0.5) * 0.65;
    x = clamp(g.player.x + Math.cos(angle) * radius, 70, WORLD_WIDTH - 70);
    y = clamp(g.player.y + Math.sin(angle) * radius, 70, WORLD_HEIGHT - 70);
  }
  const stats = {
    bug: { hp: 32, speed: 49, r: 12, damage: 9, score: 60 },
    runner: { hp: 24, speed: 89, r: 10, damage: 7, score: 80 },
    tank: { hp: 105, speed: 29, r: 19, damage: 15, score: 140 },
    shooter: { hp: 43, speed: 39, r: 13, damage: 8, score: 110 },
    boss: { hp: 3200, speed: 29, r: 38, damage: 20, score: 3000 },
  }[type];
  const e = {
    ...stats,
    id: g.nextId++,
    type,
    x,
    y,
    maxHp: stats.hp,
    hit: 0,
    attack: 0,
    fireTimer: 1.5,
    phase: 0,
    walkPhase: 0,
    moving: false,
    facing: 1,
    target: g.random() < 0.3 ? "server" : "player",
    vx: 0,
    vy: 0,
  };
  if (location && type === "boss") {
    e.hp = e.maxHp = location.id === "manager" ? 1500 : 900;
  } else if (location?.id === "manager") {
    e.hp = e.maxHp = Math.round(e.hp * 1.3);
    e.damage = Math.round(e.damage * 1.2);
  }
  g.enemies.push(e);
  particles(g, x, y, "#da826a", 10);
  return e;
}
export function damageEnemy(g, e, amount) {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.hit = 0.13;
  if (e.hp <= 0) {
    g.kills++;
    g.score += e.score;
    particles(
      g,
      e.x,
      e.y,
      e.type === "boss" ? "#f6bf72" : "#ce896e",
      e.type === "boss" ? 55 : 9,
    );
    floating(g, e.x, e.y - 14, `+${e.score}`);
    g.drops.push({
      id: g.nextId++,
      x: e.x,
      y: e.y,
      type: "patch",
      value: e.type === "tank" ? 4 : 2,
      life: 23,
    });
    if (g.random() < 0.12)
      g.drops.push({
        id: g.nextId++,
        x: e.x + 10,
        y: e.y,
        type: "health",
        value: 12,
        life: 20,
      });
    emit(g, "kill");
    if (e.type === "boss") {
      g.bossKilled = true;
      g.shake = 10;
    }
  }
}
export function activateDash(g) {
  const p = g.player;
  if (g.mode !== "playing" || p.dashCooldown > 0) return false;
  p.dashTime = 0.19;
  p.dashCooldown = 3;
  p.invincible = 0.38;
  emit(g, "dash");
  return true;
}
export function activatePulse(g) {
  const p = g.player;
  if (g.mode !== "playing" || p.pulseCooldown > 0) return false;
  const boosted = g.upgrades.includes("pulse"),
    radius = boosted ? 340 : 240;
  p.pulseCooldown = boosted ? 5 : 10;
  g.pulses.push({ x: p.x, y: p.y, radius, life: 0.55, maxLife: 0.55 });
  g.shake = 3;
  for (const e of g.enemies) {
    const d = distance(p, e);
    if (d < radius + e.r) {
      damageEnemy(g, e, boosted ? 100 : 55);
      const inv = 1 / Math.max(d, 1);
      e.vx = (e.x - p.x) * inv * 280;
      e.vy = (e.y - p.y) * inv * 280;
    }
  }
  g.shots = g.shots.filter((s) => !s.hostile || distance(p, s) > radius);
  emit(g, "pulse");
  return true;
}
export function repair(g) {
  const objective = g.objectives?.[g.wave];
  if (objective && !objective.completed) {
    const equipment = g.servers.find((s) => s.id === activeObjectiveId(g));
    if (equipment && distance(g.player, equipment) < 115) {
      if (g.patches < 4) {
        emit(g, "toast", { text: "Need 4 patches. Collect the green diamonds." });
        return false;
      }
      objective.progress = Math.min(100, objective.progress + 25);
      if (objective.progress >= 100) {
        g.patches -= 4;
        equipment.hp = 100;
        particles(g, equipment.x, equipment.y, "#b7f58e", 18);
        floating(g, equipment.x, equipment.y - 60, "FIXED");
        objective.step++;
        if (objective.step >= objective.steps.length) {
          objective.completed = true;
          g.score += objective.reward;
          emit(g, "objective", { name: wavesFor(g)[g.wave].name });
        } else {
          objective.progress = 0;
          const next = g.servers.find((s) => s.id === activeObjectiveId(g));
          emit(g, "toast", { text: `${equipment.name} restored. Next: ${next.name}.` });
        }
      }
      return true;
    }
  }
  const node = g.servers
    .filter((s) => distance(g.player, s) < 95 && s.hp < 100)
    .sort((a, b) => a.hp - b.hp)[0];
  if (!node) {
    emit(g, "toast", { text: "Stand beside a damaged server to repair it." });
    return false;
  }
  if (g.patches < 4) {
    emit(g, "toast", { text: "Need 4 patches. Collect the green diamonds." });
    return false;
  }
  g.patches -= 4;
  node.hp = clamp(node.hp + (g.upgrades.includes("repair") ? 48 : 24), 0, 100);
  g.score += 40;
  particles(g, node.x, node.y, "#b7f58e", 12);
  floating(g, node.x, node.y - 58, "REPAIRED");
  emit(g, "repair");
  return true;
}
const SHUTTLE_DWELL = 2.1;
const SHUTTLE_STOP_Y = 1870;
const SHUTTLE_ROAD_Y = 2145;
const shuttleStop = (room) => ({ x: room.x + room.width / 2, y: SHUTTLE_STOP_Y });
export function nearestShuttleStop(g) {
  const rooms = locationFor(g.locationId)?.rooms;
  if (g.locationId !== "datacenter" || !rooms) return null;
  const room = rooms.reduce((nearest, candidate) =>
    Math.abs(candidate.x + candidate.width / 2 - g.player.x) <
    Math.abs(nearest.x + nearest.width / 2 - g.player.x) ? candidate : nearest);
  return { room, ...shuttleStop(room), distance: distance(g.player, shuttleStop(room)) };
}
const shuttleNext = (shuttle, count) => (shuttle.from + shuttle.direction + count) % count;
const shuttleDriveTime = (from, to) => 1.2 + Math.abs(from.x - to.x) / 680;

export function shuttlePosition(g, shuttle) {
  const rooms = locationFor(g.locationId)?.rooms;
  if (!rooms || !shuttle) return null;
  const from = shuttleStop(rooms[shuttle.from]);
  const to = shuttleStop(rooms[shuttleNext(shuttle, rooms.length)]);
  const drive = shuttleDriveTime(from, to);
  if (shuttle.elapsed < SHUTTLE_DWELL) return { ...from, facing: shuttle.direction };
  const t = Math.min(1, (shuttle.elapsed - SHUTTLE_DWELL) / drive);
  if (t < 0.18) return { x: from.x, y: from.y + (SHUTTLE_ROAD_Y - from.y) * t / 0.18, facing: shuttle.direction };
  if (t > 0.82) return { x: to.x, y: SHUTTLE_ROAD_Y + (to.y - SHUTTLE_ROAD_Y) * (t - 0.82) / 0.18, facing: shuttle.direction };
  return { x: from.x + (to.x - from.x) * (t - 0.18) / 0.64, y: SHUTTLE_ROAD_Y, facing: Math.sign(to.x - from.x) || shuttle.direction };
}

function advanceShuttles(g, dt) {
  const rooms = locationFor(g.locationId)?.rooms;
  if (!rooms || !g.shuttles.length) return;
  for (const shuttle of g.shuttles) {
    const from = shuttleStop(rooms[shuttle.from]);
    const next = shuttleNext(shuttle, rooms.length);
    const to = shuttleStop(rooms[next]);
    const leg = SHUTTLE_DWELL + shuttleDriveTime(from, to);
    shuttle.elapsed += dt;
    if (shuttle.elapsed >= leg) {
      shuttle.elapsed -= leg;
      shuttle.from = next;
      if (g.vehicle?.shuttleId === shuttle.id && g.vehicle.destinationId === rooms[next].id) {
        g.vehicle.phase = "exiting";
        g.vehicle.elapsed = 0;
        g.vehicle.exitFrom = to;
        g.vehicle.exitTo = { x: to.x, y: rooms[next].y + rooms[next].height - 180 };
        emit(g, "toast", { text: `${rooms[next].name}: shuttle parked. Exiting now.` });
      }
    }
  }
}

// Worldwide sites still fast travel. At the AWS datacenter, this only requests
// a destination; boarding requires the player to wait at an actual shuttle stop.
export function travel(g, roomId) {
  const location = locationFor(g.locationId);
  const room = location?.travel && location.rooms.find((r) => r.id === roomId);
  if (g.mode !== "playing" || !room || g.vehicle) return false;
  if (g.locationId === "datacenter") {
    const current = location.rooms.find((r) => g.player.x >= r.x && g.player.x <= r.x + r.width &&
      g.player.y >= r.y && g.player.y <= r.y + r.height);
    if (current?.id === roomId) return false;
    g.shuttleDestination = roomId;
    emit(g, "toast", { text: `${room.name} selected as your shuttle destination.` });
    return true;
  }
  if (g.travelCooldown > 0) return false;
  const x = room.x + room.width / 2, y = room.y + room.height / 2;
  if (distance(g.player, { x, y }) < 100) return false;
  g.player.x = x;
  g.player.y = y;
  g.player.invincible = 3;
  g.grace = 5;
  emit(g, "toast", { text: `Arrived at ${room.name}. 5 seconds of site cover.` });
  g.travelCooldown = 2;
  g.shots = g.shots.filter((s) => !s.hostile);
  g.enemies = g.enemies.filter((e) => distance(e, g.player) > 130);
  return true;
}
export function dispatchSupport(g) {
  if (g.mode !== "playing" || !locationFor(g.locationId)?.travel || g.supportCooldown > 0) return false;
  for (const s of g.servers) s.hp = Math.min(100, s.hp + 35);
  g.grace = Math.max(g.grace, 8);
  g.supportCooldown = 24;
  emit(g, "toast", { text: "Technicians dispatched: all sites repaired and covered for 8 seconds." });
  return true;
}
export function pickUpgrade(g, id) {
  if (
    g.mode !== "upgrade" ||
    !UPGRADES.some((u) => u.id === id) ||
    g.upgrades.includes(id)
  )
    return false;
  g.upgrades.push(id);
  g.upgradeOptions = [];
  if (id === "speed") {
    g.player.speed *= 1.22;
    g.player.fireRate /= 1.3;
  }
  if (id === "damage") g.player.damage *= 2;
  g.player.hp = clamp(g.player.hp + 30, 0, 100);
  for (const s of g.servers) s.hp = clamp(s.hp + 25, 0, 100);
  g.wave++;
  g.waveTime = 0;
  g.spawnTimer = 2.5;
  g.enemies = [];
  g.shots = [];
  g.drops = [];
  g.player.invincible = 2;
  g.banner = 3.5;
  g.mode = "playing";
  emit(g, "wave");
  return true;
}
export function upgradeChoices(g) {
  const available = UPGRADES.filter((u) => !g.upgrades.includes(u.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(g.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, 3);
}
function hurtPlayer(g, damage) {
  const p = g.player;
  if (p.invincible > 0) return;
  p.hp = clamp(p.hp - damage, 0, 100);
  p.invincible = 0.85;
  g.shake = 5;
  particles(g, p.x, p.y, "#ec917c", 10);
  emit(g, "hurt");
}
export function step(g, dt, input = {}) {
  if (g.mode !== "playing") return;
  dt = Math.min(dt, 0.04);
  g.tick++;
  g.time += dt;
  g.waveTime += dt;
  g.travelCooldown = Math.max(0, g.travelCooldown - dt);
  g.supportCooldown = Math.max(0, g.supportCooldown - dt);
  g.grace = Math.max(0, g.grace - dt);
  g.banner = Math.max(0, g.banner - dt);
  g.shake = Math.max(0, g.shake - dt * 22);
  advanceShuttles(g, dt);
  advanceBystanders(g, dt);
  const p = g.player;
  const bounds = boundsFor(g);
  const oldX = p.x,
    oldY = p.y;
  const driving = !!g.vehicle;
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.pulseCooldown = Math.max(0, p.pulseCooldown - dt);
  p.invincible = Math.max(0, p.invincible - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  g.repairTimer = Math.max(0, g.repairTimer - dt);
  let mx = driving ? 0 : input.x || 0,
    my = driving ? 0 : input.y || 0;
  const mag = Math.hypot(mx, my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }
  // Inputs describe screen directions. Invert the isometric projection so
  // speed is measured in visible pixels, equally in every direction.
  [mx, my] = [mx + 2 * my, -mx + 2 * my];
  p.moving = mag > 0.05;
  if (p.moving) {
    p.dirX = mx;
    p.dirY = my;
  }
  if (p.dashTime > 0 && !driving) {
    mx = p.dirX * 3.5;
    my = p.dirY * 3.5;
    particles(g, p.x, p.y, "#83bea6", 1);
  }
  if (driving) {
    const ride = g.vehicle;
    const shuttle = g.shuttles.find((s) => s.id === ride.shuttleId);
    const stop = shuttlePosition(g, shuttle);
    if (ride.phase === "boarding") {
      ride.elapsed += dt;
      const t = Math.min(1, ride.elapsed / 0.65);
      p.x = ride.boardFrom.x + (stop.x - ride.boardFrom.x) * t;
      p.y = ride.boardFrom.y + (stop.y - ride.boardFrom.y) * t;
      if (t === 1) ride.phase = "riding";
    } else if (ride.phase === "exiting") {
      ride.elapsed += dt;
      const t = Math.min(1, ride.elapsed / 0.85);
      p.x = ride.exitFrom.x + (ride.exitTo.x - ride.exitFrom.x) * t;
      p.y = ride.exitFrom.y + (ride.exitTo.y - ride.exitFrom.y) * t;
      if (t === 1) {
        g.vehicle = null;
        g.shuttleDestination = null;
        p.invincible = Math.max(p.invincible, 3);
        g.grace = Math.max(g.grace, 5);
        emit(g, "toast", { text: "Arrived. 5 seconds of site cover remain." });
      }
    } else {
      p.x = stop.x;
      p.y = stop.y;
    }
  } else {
    const nextX = clamp(p.x + mx * p.speed * dt, 140, bounds.width - 140);
    const nextY = clamp(p.y + my * p.speed * dt, 140, bounds.height - 140);
    if (!isSolidAt(nextX, p.y, 28, g.locationId)) p.x = nextX;
    if (!isSolidAt(p.x, nextY, 28, g.locationId)) p.y = nextY;
    for (const s of g.servers) {
      const d = distance(p, s);
      if (d < 34) {
        const dx = (p.x - s.x) / (d || 1),
          dy = (p.y - s.y) / (d || 1);
        p.x = s.x + dx * 34;
        p.y = s.y + dy * 34;
        if (d === 0) p.y += 34;
      }
    }
    if (g.locationId === "datacenter" && g.shuttleDestination) {
      const rooms = locationFor(g.locationId).rooms;
      const stopIndex = rooms.findIndex((room) => distance(p, shuttleStop(room)) < 150);
      if (stopIndex >= 0 && rooms[stopIndex].id !== g.shuttleDestination) {
        const shuttle = g.shuttles.find((s) => s.from === stopIndex && s.elapsed < SHUTTLE_DWELL - 0.7);
        if (shuttle) {
          g.vehicle = {
            shuttleId: shuttle.id, destinationId: g.shuttleDestination,
            phase: "boarding", elapsed: 0, boardFrom: { x: p.x, y: p.y },
          };
          g.grace = Math.max(g.grace, 22);
          p.invincible = Math.max(p.invincible, 22);
          g.shots = g.shots.filter((shot) => !shot.hostile);
          emit(g, "toast", { text: `Boarding shuttle to ${rooms.find((room) => room.id === g.shuttleDestination).name}.` });
        }
      }
    }
  }
  if (g.upgrades.includes("repair"))
    for (const s of g.servers) s.hp = Math.min(100, s.hp + dt * 1.2);
  const movedX = p.x - oldX,
    movedY = p.y - oldY;
  const screenDistance = Math.hypot(
    (movedX - movedY) * 0.5,
    (movedX + movedY) * 0.25,
  );
  p.moving = screenDistance > 0.001;
  p.walkPhase += screenDistance / 8;
  if (Math.abs(movedX - movedY) > 0.001) p.facing = Math.sign(movedX - movedY);
  if (!driving && input.repair && g.repairTimer === 0) {
    repair(g);
    g.repairTimer = 0.65;
  }
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.enemies.length < 55 && !g.bossKilled) {
    const roll = g.random();
    let type = "bug";
    if (g.wave >= 1) {
      type =
        roll < 0.32
          ? "runner"
          : roll < 0.5
            ? "tank"
            : roll < 0.7
              ? "shooter"
              : "bug";
    } else if (g.waveTime > 18 && roll < 0.3) type = "runner";
    spawnEnemy(g, type);
    g.spawnTimer = wavesFor(g)[g.wave].interval * (g.bossSpawned ? 1.4 : 1);
  }
  if (g.wave === 2 && g.waveTime >= wavesFor(g)[2].duration && !g.bossSpawned &&
      (!g.objectives.length || g.objectives[2].completed)) {
    g.bossSpawned = true;
    spawnEnemy(g, "boss", {
      x: clamp(p.x + 350, 160, bounds.width - 160),
      y: clamp(p.y - 350, 160, bounds.height - 160),
    });
    g.banner = 3;
    emit(g, "boss");
  }
  p.fireTimer -= dt;
  const targets = g.enemies
    .filter((e) => e.hp > 0 && distance(e, p) < 720)
    .sort((a, b) => distance(a, p) - distance(b, p));
  if (!driving && p.fireTimer <= 0 && targets.length) {
    const target = targets[0],
      a = Math.atan2(target.y - p.y, target.x - p.x);
    for (const offset of g.upgrades.includes("multishot")
      ? [-0.16, 0, 0.16]
      : [0])
      g.shots.push({
        id: g.nextId++,
        ownerId: p.id,
        x: p.x,
        y: p.y - 8,
        vx: Math.cos(a + offset) * 850,
        vy: Math.sin(a + offset) * 850,
        life: 1.1,
        damage: p.damage,
        hostile: false,
      });
    p.fireTimer = p.fireRate;
    emit(g, "shoot");
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const previousX = e.x,
      previousY = e.y;
    e.hit = Math.max(0, e.hit - dt);
    e.attack = Math.max(0, e.attack - dt);
    e.phase += dt;
    const liveServers = g.servers.filter((s) => s.hp > 0);
    let target = p;
    if (e.target === "server" && liveServers.length && e.type !== "boss") {
      const nearby = locationFor(g.locationId)?.travel
        ? liveServers.filter((s) => distance(s, p) < 600) : liveServers;
      if (nearby.length) target = nearby.sort((a, b) => distance(a, e) - distance(b, e))[0];
    }
    const d = distance(e, target),
      dx = (target.x - e.x) / (d || 1),
      dy = (target.y - e.y) / (d || 1);
    let speed = e.speed * (g.wave === 2 ? 1.08 : 1);
    if (e.type === "boss" && e.hp < e.maxHp * 0.45) speed *= 1.7;
    if (
      d > (target === p ? e.r + 10 : 43) &&
      !(e.type === "shooter" && d < 220)
    ) {
      e.x += dx * speed * dt;
      e.y += dy * speed * dt;
    }
    e.x = clamp(e.x + e.vx * dt, 140, bounds.width - 140);
    e.y = clamp(e.y + e.vy * dt, 140, bounds.height - 140);
    const ex = e.x - previousX,
      ey = e.y - previousY;
    const traveled = Math.hypot((ex - ey) * 0.5, (ex + ey) * 0.25);
    e.moving = traveled > 0.001;
    e.walkPhase += traveled / (e.type === "boss" ? 13 : 5);
    if (Math.abs(ex - ey) > 0.001) e.facing = Math.sign(ex - ey);
    e.vx *= Math.max(0, 1 - dt * 8);
    e.vy *= Math.max(0, 1 - dt * 8);
    if (d < (target === p ? e.r + 14 : 50) && e.attack === 0) {
      if (target === p) hurtPlayer(g, e.damage);
      else if (g.grace <= 0) {
        target.hp = Math.max(0, target.hp - e.damage * 0.7);
        particles(g, target.x, target.y - 20, "#f1a56e", 4);
        if (target.hp === 0) {
          emit(g, "server-down", { name: target.name });
          g.shake = 6;
        }
      }
      e.attack = 1.1;
    }
    if (e.type === "shooter" || e.type === "boss") {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const n = e.type === "boss" ? 12 : 1;
        for (let i = 0; i < n; i++) {
          const ang = n === 1 ? a : (Math.PI * 2 * i) / n + e.phase * 0.25;
          g.shots.push({
            id: g.nextId++,
            ownerId: e.id,
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * (n === 1 ? 140 : 110),
            vy: Math.sin(ang) * (n === 1 ? 140 : 110),
            hostile: true,
            life: 6,
            damage: e.type === "boss" ? 13 : 8,
          });
        }
        e.fireTimer =
          e.type === "boss" ? (e.hp < e.maxHp * 0.45 ? 1.55 : 2.3) : 2.8;
      }
    }
    // Push apart overlapping processes to keep individual threats readable.
    for (const other of g.enemies) {
      if (other.id <= e.id || other.hp <= 0) continue;
      const ed = distance(e, other),
        min = e.r + other.r - 3;
      if (ed < min && ed > 0.01) {
        const push = (min - ed) * 0.5;
        e.x -= ((other.x - e.x) / ed) * push;
        e.y -= ((other.y - e.y) / ed) * push;
        other.x += ((other.x - e.x) / ed) * push;
        other.y += ((other.y - e.y) / ed) * push;
      }
    }
  }
  for (const s of g.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.hostile) {
      if (distance(s, p) < 14) {
        hurtPlayer(g, s.damage);
        s.life = 0;
      }
    } else {
      for (const e of g.enemies) {
        if (e.hp > 0 && distance(s, e) < e.r + 5) {
          damageEnemy(g, e, s.damage);
          s.life = 0;
          particles(g, s.x, s.y, "#c7f69a", 3);
          break;
        }
      }
    }
  }
  g.shots = g.shots.filter(
    (s) =>
      s.life > 0 &&
      s.x > 0 &&
      s.x < bounds.width &&
      s.y > 0 &&
      s.y < bounds.height,
  );
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  for (const d of g.drops) {
    d.life -= dt;
    const dist = distance(d, p),
      range = g.upgrades.includes("magnet") ? 175 : 65;
    if (dist < range && dist > 0) {
      d.x += ((p.x - d.x) / dist) * 240 * dt;
      d.y += ((p.y - d.y) / dist) * 240 * dt;
    }
    if (dist < 19) {
      if (d.type === "patch") {
        g.patches += d.value;
        g.score += d.value * 10;
        if (g.upgrades.includes("magnet")) p.hp = Math.min(100, p.hp + 2);
      } else p.hp = Math.min(100, p.hp + d.value);
      d.life = 0;
      particles(g, d.x, d.y, d.type === "patch" ? "#b7f58e" : "#f1aaa4", 4);
      emit(g, "pickup");
    }
  }
  g.drops = g.drops.filter((d) => d.life > 0);
  for (const v of g.particles) {
    v.x += v.vx * dt;
    v.y += v.vy * dt;
    v.life -= dt;
    v.vx *= 0.97;
    v.vy *= 0.97;
  }
  g.particles = g.particles.filter((v) => v.life > 0);
  for (const f of g.floaters) {
    f.y -= dt * 24;
    f.life -= dt;
  }
  g.floaters = g.floaters.filter((f) => f.life > 0);
  for (const v of g.pulses) v.life -= dt;
  g.pulses = g.pulses.filter((v) => v.life > 0);
  if (p.hp <= 0 || g.servers.every((s) => s.hp <= 0)) {
    g.mode = "lost";
    emit(g, "end", { won: false, reason: p.hp <= 0 ? "engineer" : "servers" });
    return;
  }
  if (g.bossKilled) {
    g.mode = "won";
    g.score += Math.round(
      p.hp * 10 + g.servers.reduce((a, s) => a + s.hp, 0) * 5,
    );
    emit(g, "end", { won: true });
    return;
  }
  if (g.wave < 2 && g.waveTime >= wavesFor(g)[g.wave].duration &&
      (!g.objectives.length || g.objectives[g.wave].completed)) {
    g.mode = "upgrade";
    g.score += 500;
    emit(g, "upgrade");
  }
}
