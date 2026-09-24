import { WORLD_WIDTH, WORLD_HEIGHT, WORLD_SEED } from "./config.js";
import { isSolidAt } from "./world.js";
import { locationFor } from "./career.js";
import { seededRandom } from "./random.js";
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
export function createGame(random = seededRandom(WORLD_SEED), locationId = null) {
  const location = locationFor(locationId);
  return {
    locationId: location?.id ?? null,
    objectives: location ? location.waves.map((wave) => ({
      id: wave.objective, name: location.equipment.find((e) => e.id === wave.objective).name,
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
    events: [],
    shake: 0,
    banner: 3.5,
    repairTimer: 0,
    toastTimer: 0,
    bossSpawned: false,
    bossKilled: false,
    upgrades: [],
    upgradeOptions: [],
    nextId: 1,
    player: {
      id: "player-1",
      characterId: "sebastian",
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
    x = point.x;
    y = point.y;
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
    e.hp = e.maxHp = 900;
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
    radius = boosted ? 230 : 160;
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
    const equipment = g.servers.find((s) => s.id === objective.id);
    if (equipment && distance(g.player, equipment) < 115) {
      if (g.patches < 4) {
        emit(g, "toast", { text: "Need 4 patches. Collect the green diamonds." });
        return false;
      }
      objective.progress = Math.min(100, objective.progress + 25);
      if (objective.progress >= 100) {
        objective.completed = true;
        g.patches -= 4;
        equipment.hp = 100;
        g.score += objective.reward;
        particles(g, equipment.x, equipment.y, "#b7f58e", 18);
        floating(g, equipment.x, equipment.y - 60, "FIXED");
        emit(g, "objective", { name: objective.name });
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
  g.banner = Math.max(0, g.banner - dt);
  g.shake = Math.max(0, g.shake - dt * 22);
  const p = g.player;
  const bounds = boundsFor(g);
  const oldX = p.x,
    oldY = p.y;
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.pulseCooldown = Math.max(0, p.pulseCooldown - dt);
  p.invincible = Math.max(0, p.invincible - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  g.repairTimer = Math.max(0, g.repairTimer - dt);
  let mx = input.x || 0,
    my = input.y || 0;
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
  if (p.dashTime > 0) {
    mx = p.dirX * 3.5;
    my = p.dirY * 3.5;
    particles(g, p.x, p.y, "#83bea6", 1);
  }
  const nextX = clamp(p.x + mx * p.speed * dt, 140, bounds.width - 140);
  const nextY = clamp(p.y + my * p.speed * dt, 140, bounds.height - 140);
  // Rack tiles are solid; resolve each axis separately so aisle walls slide
  // naturally instead of trapping Sebastian on diagonal movement.
  if (!isSolidAt(nextX, p.y, 28, g.locationId)) p.x = nextX;
  if (!isSolidAt(p.x, nextY, 28, g.locationId)) p.y = nextY;
  // Server cabinets are solid; their interaction ring remains accessible on every side.
  for (const s of g.servers) {
    const d = distance(p, s);
    if (d < 34) {
      const dx = (p.x - s.x) / (d || 1),
        dy = (p.y - s.y) / (d || 1);
      p.x = s.x + dx * 34;
      p.y = s.y + dy * 34;
      if (d === 0) p.y += 34;
    }
    if (g.upgrades.includes("repair")) s.hp = Math.min(100, s.hp + dt * 1.2);
  }
  const movedX = p.x - oldX,
    movedY = p.y - oldY;
  const screenDistance = Math.hypot(
    (movedX - movedY) * 0.5,
    (movedX + movedY) * 0.25,
  );
  p.moving = screenDistance > 0.001;
  p.walkPhase += screenDistance / 8;
  if (Math.abs(movedX - movedY) > 0.001) p.facing = Math.sign(movedX - movedY);
  if (input.repair && g.repairTimer === 0) {
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
    spawnEnemy(g, "boss", g.locationId ? undefined : {
      x: clamp(p.x + 350, 70, WORLD_WIDTH - 70),
      y: clamp(p.y - 450, 70, WORLD_HEIGHT - 70),
    });
    g.banner = 3;
    emit(g, "boss");
  }
  p.fireTimer -= dt;
  const targets = g.enemies
    .filter((e) => e.hp > 0 && distance(e, p) < 720)
    .sort((a, b) => distance(a, p) - distance(b, p));
  if (p.fireTimer <= 0 && targets.length) {
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
    if (e.target === "server" && liveServers.length && e.type !== "boss")
      target = liveServers.sort((a, b) => distance(a, e) - distance(b, e))[0];
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
      else {
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
