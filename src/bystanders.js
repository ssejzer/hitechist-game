import { CHARACTERS } from "./characters.js";
import { locationFor } from "./career.js";
import { isSolidAt } from "./world.js";

const STAGES = { call_center: 1, sysadmin: 2, tech_lead: 4, datacenter: 10, manager: 10 };

function freeSpot(g, room, others, radius = 28) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = room.x + 180 + g.random() * Math.max(1, room.width - 360);
    const y = room.y + 180 + g.random() * Math.max(1, room.height - 360);
    if (isSolidAt(x, y, radius, g.locationId) ||
        Math.hypot(x - g.player.x, y - g.player.y) < 190 ||
        g.servers.some((s) => Math.hypot(x - s.x, y - s.y) < 200) ||
        others.some((person) => Math.hypot(x - person.x, y - person.y) < 180)) continue;
    return { x, y };
  }
  // The room centre is a useful fallback if a future floor has little open space.
  return { x: room.x + room.width / 2, y: room.y + room.height / 2 };
}

export function createBystanders(g) {
  const location = locationFor(g.locationId);
  const count = STAGES[g.locationId] ?? 0;
  if (!location || !count) return [];
  const roster = CHARACTERS.filter((c) => c.id !== g.player.characterId);
  for (let i = roster.length - 1; i > 0; i--) {
    const j = Math.floor(g.random() * (i + 1));
    [roster[i], roster[j]] = [roster[j], roster[i]];
  }
  const selected = roster.slice(0, count);
  const rooms = g.locationId === "manager"
    ? location.rooms.filter((room) => !["playroom", "hardware_storage", "bathroom", "conference", "crypto_mining", "kitchen"].includes(room.id))
    : location.rooms;
  const managerHomes = { rotem: "kitchen", tal: "kitchen", aldo: "conference",
    nenad: "crypto_mining", luis: "crypto_mining" };
  let requests = 0;
  // Level five has everyone present; six roam while the others linger.
  let roamers = 0;
  const people = [];
  for (const [index, character] of selected.entries()) {
    const room = g.locationId === "manager" && managerHomes[character.id]
      ? location.rooms.find((item) => item.id === managerHomes[character.id])
      : rooms[index % rooms.length];
    const spot = character.id === "aldo" && g.locationId === "manager"
      ? { x: room.x + room.width / 2, y: room.y + 500 }
      : freeSpot(g, room, people);
    const roaming = character.id !== "tal" && (g.locationId !== "datacenter" || roamers++ < 6);
    const person = {
      id: `bystander-${character.id}`, characterId: character.id,
      x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y,
      roomId: room.id, roaming, facing: g.random() < 0.5 ? -1 : 1,
      moving: false, walkPhase: 0, wanderTime: g.random() * 2,
      targetX: spot.x, targetY: spot.y,
    };
    if (g.locationId === "manager" && !managerHomes[character.id] && requests < 4) {
      person.requestIndex = requests++;
      person.requestResolved = false;
      person.roaming = false;
    }
    if (g.locationId === "manager" && character.id === "aldo") person.roaming = false;
    people.push(person);
  }
  return people;
}

export function advanceBystanders(g, dt) {
  const location = locationFor(g.locationId);
  if (!location) return;
  for (const person of g.bystanders ?? []) {
    if (!person.roaming) continue;
    person.wanderTime -= dt;
    const distance = Math.hypot(person.targetX - person.x, person.targetY - person.y);
    if (person.wanderTime <= 0 || distance < 12) {
      const room = location.rooms.find((r) => r.id === person.roomId);
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = Math.max(room.x + 145, Math.min(room.x + room.width - 145, person.homeX + (g.random() - 0.5) * 560));
        const y = Math.max(room.y + 145, Math.min(room.y + room.height - 145, person.homeY + (g.random() - 0.5) * 560));
        if (!isSolidAt(x, y, 28, g.locationId) &&
            !g.servers.some((s) => Math.hypot(x - s.x, y - s.y) < 120)) {
          person.targetX = x; person.targetY = y;
          break;
        }
      }
      person.wanderTime = 3 + g.random() * 4;
    }
    const dx = person.targetX - person.x, dy = person.targetY - person.y;
    const length = Math.hypot(dx, dy);
    person.moving = length > 12;
    if (!person.moving) continue;
    const speed = Math.min(length, 72 * dt);
    const x = person.x + dx / length * speed;
    const y = person.y + dy / length * speed;
    if (!isSolidAt(x, person.y, 28, g.locationId)) person.x = x;
    if (!isSolidAt(person.x, y, 28, g.locationId)) person.y = y;
    person.walkPhase += speed / 8;
    if (Math.abs(dx - dy) > 1) person.facing = Math.sign(dx - dy);
  }
}
