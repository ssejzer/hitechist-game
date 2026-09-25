import { WORLD_HEIGHT, WORLD_WIDTH, WORLD_SEED } from "./config.js";
import { locationFor } from "./career.js";

export const TILE = 110;
export const WORLD_COLS = Math.ceil(WORLD_WIDTH / TILE);
export const WORLD_ROWS = Math.ceil(WORLD_HEIGHT / TILE);

const MANAGER_FURNISHINGS = {
  lounge: [["lounge-sofa", 775, 405]],
  hardware_storage: [["laptop-shelf", 335, 405], ["display-shelf", 775, 405],
    ["cable-shelf", 1215, 405]],
  kitchen: [["kitchen-counter", 775, 375]],
  bathroom: [["bathroom-sink", 335, 375], ["bathroom-toilet", 1105, 375]],
};

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + WORLD_SEED) * 43758.5453123;
  return n - Math.floor(n);
};
const inRect = (col, row, x, y, width, height) =>
  col >= x && col < x + width && row >= y && row < y + height;

export const isRack = (type) => type.endsWith("-rack");

export function isSolidAt(x, y, radius = 28, locationId = null) {
  if (locationId === "manager" && x + radius > 13020 && x - radius < 13600 &&
      y + radius > 1060 && y - radius < 1860) return true;
  return [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
  ].some(([dx, dy]) => {
    const tile = blockAt(Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE), locationId);
    return isRack(tile) ||
      (!!locationFor(locationId) && ["office-desk", "cooling-unit", "workstation", "edge",
        "laptop-shelf", "display-shelf", "cable-shelf", "lounge-sofa", "kitchen-counter",
        "bathroom-sink", "bathroom-toilet"].includes(tile)) ||
      (locationId === "datacenter" && ["road", "yard", "barrier"].includes(tile)) ||
      (locationId === "office" && tile === "plant");
  });
}

/** A reusable deterministic building block. New floors only need a new layout. */
export function blockAt(col, row, locationId = null) {
  const location = locationFor(locationId);
  if (location) {
    const cols = Math.ceil(location.width / TILE), rows = Math.ceil(location.height / TILE);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return "void";
    if (col === 0 || row === 0 || col === cols - 1 || row === rows - 1) return "edge";
    const x = (col + 0.5) * TILE, y = (row + 0.5) * TILE;
    // Open a full corridor on both sides of every room boundary. The original
    // door coordinates need clearance after a layout is enlarged.
    if (location.doors.some((door) => Math.abs(door.x - x) <= TILE * 2.5 &&
        Math.abs(door.y - y) <= TILE * 2.5)) return "walkway";
    if (location.id === "datacenter") {
      const room = location.rooms.find((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
      if (!room) {
        const northFrontage = location.rooms.find((r) => x >= r.x && x < r.x + r.width &&
          y >= r.y - TILE * 2.5 && y < r.y);
        if (northFrontage) return "sidewalk";
        const frontage = location.rooms.find((r) => x >= r.x && x < r.x + r.width &&
          y >= r.y + r.height && y < location.shuttleStopY + TILE * 1.5);
        if (frontage) return "sidewalk";
        const betweenBuildings = x >= location.rooms[0].x + location.rooms[0].width &&
          x < location.rooms.at(-1).x &&
          !location.rooms.some((r) => x >= r.x && x < r.x + r.width);
        if (betweenBuildings && y >= location.rooms[0].y + location.rooms[0].height &&
            y < location.shuttleStopY + TILE * 1.5) return "barrier";
        return y >= location.shuttleStopY || betweenBuildings ? "road" : "yard";
      }
      const atWall = x - room.x < TILE || room.x + room.width - x <= TILE ||
        y - room.y < TILE || room.y + room.height - y <= TILE;
      if (atWall) {
        const entrance = Math.abs(x - (room.x + room.width / 2)) <= room.width * 0.1 &&
          (y < room.y + room.height * 0.1 || y > room.y + room.height * 0.9);
        return entrance ? "walkway" : "edge";
      }
      if (Math.abs(x - (room.x + room.width / 2)) <= room.width * 0.1 || y > room.y + room.height * 0.8)
        return "datacenter-aisle";
      const depth = (y - room.y) / room.height;
      const side = (x - room.x) / room.width;
      if ((side < 0.24 || side > 0.76) && depth > 0.35 && depth < 0.7 && row % 8 === 0)
        return "cooling-unit";
      if ((side < 0.28 || side > 0.72) && depth > 0.17 && depth < 0.31 && row % 4 === 0)
        return "workstation";
    }
    if (location.id === "tech_lead") {
      const room = location.rooms.find((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
      if (!room) {
        const betweenBuildings = x >= location.rooms[0].x + location.rooms[0].width &&
          x < location.rooms.at(-1).x;
        return y >= 3250 ? "sidewalk" : betweenBuildings ? "campus-path" : "yard";
      }
      if (x - room.x < TILE || room.x + room.width - x <= TILE ||
          y - room.y < TILE || room.y + room.height - y <= TILE) return "edge";
      if (room.id.endsWith("_datacenter")) {
        if (Math.abs(x - (room.x + room.width / 2)) < TILE * 1.6 || y > room.y + room.height * 0.76)
          return "datacenter-aisle";
        if (col % 3 === 0 && !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 190))
          return ["compute-rack", "network-rack", "storage-rack"][row % 3];
        return "datacenter-floor";
      }
      if (row % 4 === 0 && col % 5 !== 0 &&
          !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 190)) return "office-desk";
      return "office-floor";
    }
    if (location.id === "manager") {
      const room = location.rooms.find((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
      if (!room) return "walkway";
      if (x - room.x < TILE || room.x + room.width - x <= TILE ||
          y - room.y < TILE || room.y + room.height - y <= TILE) return "edge";
      if (room.id === "soc") {
        if (col % 5 === 0 && row % 4 === 0 &&
            !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 260)) return "network-rack";
        return "comms-floor";
      }
      if (room.id === "crypto_mining") {
        if ((col + row) % 6 === 0 && x > room.x + 290 && x < room.x + room.width - 250 &&
            y > room.y + 310 && y < room.y + room.height - 350) return "compute-rack";
        return "comms-floor";
      }
      if (room.id === "conference") {
        if (Math.abs(x - (room.x + room.width * 0.52)) < TILE / 2 &&
            Math.abs(y - (room.y + room.height * 0.6)) < TILE / 2) return "office-desk";
        return "manager-floor";
      }
      if (room.id === "private_office") {
        if (Math.abs(x - 1850) < TILE / 2 && Math.abs(y - 3700) < TILE / 2)
          return "office-desk";
        return "office-floor";
      }
      if (room.id === "people") return "manager-floor";
      const furnishing = MANAGER_FURNISHINGS[room.id];
      const prop = furnishing?.find(([, dx, dy]) =>
        Math.abs(x - room.x - dx) < TILE / 2 && Math.abs(y - room.y - dy) < TILE / 2);
      if (prop) return prop[0];
      if (room.id === "hardware_storage") return "storage-floor";
      if (room.id === "kitchen" || room.id === "bathroom") return "tile-floor";
      if (room.id === "playroom" || room.id === "lounge") return "manager-floor";
      if (col % 6 === 0 && row % 5 === 0 &&
          !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 260) &&
          !location.interactions.some((e) => Math.hypot(e.x - x, e.y - y) < 260))
        return "office-desk";
      return room.id === "private_office" ? "office-floor" : "manager-floor";
    }
    if (location.rooms.length > 1 &&
        !location.rooms.some((room) => x >= room.x && x <= room.x + room.width && y >= room.y && y <= room.y + room.height) &&
        !location.doors.some((door) => Math.abs(door.x - x) <= TILE * 2.5 && Math.abs(door.y - y) <= TILE * 2.5))
      return "edge";
    // Keep both approaches to each doorway free of desks and racks.
    if (location.doors.some((door) => Math.abs(door.x - x) <= TILE * 2.5 && Math.abs(door.y - y) <= TILE * 1.6))
      return "walkway";
    if (location.id === "office" &&
        ((col === 2 || col === 17) && (row === 2 || row === 11)))
      return "plant";
    if (location.id === "call_center") {
      const comms = location.rooms.find((room) => room.id === "comms");
      if (x >= comms.x && x < comms.x + comms.width && y >= comms.y && y < comms.y + comms.height) {
        if (col % 3 === 0 && row % 3 !== 1 &&
            Math.abs(y - (comms.y + comms.height / 2)) > TILE * 2 &&
            !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 200))
          return "network-rack";
        return "comms-floor";
      }
    }
    if (location.id === "datacenter" && col % 4 === 0 && row > 2 && row < rows - 2 &&
        !location.rooms.some((r) => Math.abs(x - (r.x + r.width / 2)) < r.width * 0.13 || y > r.y + r.height * 0.79) &&
        !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 210))
      return ["compute-rack", "storage-rack", "network-rack"][Math.abs(row + col) % 3];
    if (location.id === "office" && col % 5 !== 0 && row % 4 === 0 && row > 2 && row < rows - 2 &&
        !location.equipment.some((e) => Math.hypot(e.x - x, e.y - y) < 175)) return "office-desk";
    if ((col + row * 3) % 11 === 0 && row > 2 && row < rows - 2 &&
        !location.equipment.some((e) => Math.hypot(e.x - (col + 0.5) * TILE, e.y - (row + 0.5) * TILE) < 175))
      return location.id === "datacenter" || (location.id === "sysadmin" &&
        location.rooms.some((room) => room.id.startsWith("server") &&
          x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height))
        ? "compute-rack" : "office-desk";
    if ((col + row) % 5 === 0) return "walkway";
    if (location.id === "sysadmin") return location.rooms.some((room) => room.id.startsWith("server") &&
      x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height)
      ? "server-floor" : "office-floor";
    return ({ tech_lead: "site-floor", datacenter: "datacenter-floor", manager: "manager-floor" })[location.id] || "office-floor";
  }
  if (col < 0 || row < 0 || col >= WORLD_COLS || row >= WORLD_ROWS)
    return "void";
  if (
    col === 0 ||
    row === 0 ||
    col === WORLD_COLS - 1 ||
    row === WORLD_ROWS - 1
  )
    return "edge";
  // Reusable districts, each with its own cross-corridors and service aisles.
  col %= 30;
  row %= 20;
  if (Math.abs(col - 14) <= 1 || Math.abs(row - 10) <= 1) return "walkway";
  // Racks form short rows with an aisle on every side. Each section has a
  // different role, rather than looking like one undifferentiated rack block.
  if (inRect(col, row, 3, 3, 6, 2) && ![5, 8].includes(col))
    return "compute-rack";
  if (inRect(col, row, 19, 3, 6, 2) && ![21, 24].includes(col))
    return "storage-rack";
  if (inRect(col, row, 5, 14, 6, 2) && ![7, 10].includes(col))
    return "network-rack";
  if (inRect(col, row, 2, 13, 5, 4) || inRect(col, row, 21, 3, 4, 4))
    return hash(col, row) > 0.65 ? "utility" : "floor";
  // Utility and plant tiles mark the end of each customer or project aisle.
  if (col % 6 === 2 && row % 5 === 3) return "plant";
  if (col % 6 === 4 && row % 5 === 3) return "utility";
  return "floor";
}

export function worldLabel(x, y, locationId = null) {
  const location = locationFor(locationId);
  if (location) {
    const room = location.rooms.find((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height);
    return `${location.name} / ${room?.name || "HALLWAY"}`;
  }
  const col = Math.floor(x / (30 * TILE)),
    row = Math.floor(y / (20 * TILE));
  return `DISTRICT ${String(row * 4 + col + 1).padStart(2, "0")} / ${["PRODUCTION", "COLD STORAGE", "EDGE NETWORK", "COMPUTE HALL"][(col + row) % 4]}`;
}

export const CHUNK_SIZE = 8;
export const MAX_CACHED_CHUNKS = 32;

/** Demand-loaded, bounded LRU cache. Work scales with viewport, not world size. */
export class WorldChunks {
  constructor(locationId = null) {
    this.locationId = locationId;
    this.cache = new Map();
    this.generated = 0;
  }
  chunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    const tiles = [];
    for (let row = cy * CHUNK_SIZE; row < (cy + 1) * CHUNK_SIZE; row++)
      for (let col = cx * CHUNK_SIZE; col < (cx + 1) * CHUNK_SIZE; col++) {
        const type = blockAt(col, row, this.locationId);
        if (type === "void") continue;
        tiles.push({
          col,
          row,
          x: (col + 0.5) * TILE,
          y: (row + 0.5) * TILE,
          type,
        });
      }
    this.cache.set(key, tiles);
    this.generated++;
    if (this.cache.size > MAX_CACHED_CHUNKS)
      this.cache.delete(this.cache.keys().next().value);
    return tiles;
  }
  visible(camera, width, height) {
    const location = locationFor(this.locationId);
    const cols = location ? Math.ceil(location.width / TILE) : WORLD_COLS;
    const rows = location ? Math.ceil(location.height / TILE) : WORLD_ROWS;
    // Inverse projection of a padded screen rectangle into world coordinates.
    const halfX = width / 2 + 80,
      halfY = height / 2 + 120,
      reach = halfX + halfY * 2;
    const minX = Math.max(
      0,
      Math.floor((camera.x - reach) / TILE / CHUNK_SIZE),
    );
    const maxX = Math.min(
      Math.ceil(cols / CHUNK_SIZE) - 1,
      Math.floor((camera.x + reach) / TILE / CHUNK_SIZE),
    );
    const minY = Math.max(
      0,
      Math.floor((camera.y - reach) / TILE / CHUNK_SIZE),
    );
    const maxY = Math.min(
      Math.ceil(rows / CHUNK_SIZE) - 1,
      Math.floor((camera.y + reach) / TILE / CHUNK_SIZE),
    );
    const tiles = [];
    for (let cy = minY; cy <= maxY; cy++)
      for (let cx = minX; cx <= maxX; cx++)
        for (const t of this.chunk(cx, cy)) {
          const dx = t.x - camera.x,
            dy = t.y - camera.y;
          if (
            Math.abs((dx - dy) * 0.5) <= halfX &&
            Math.abs((dx + dy) * 0.25) <= halfY
          )
            tiles.push(t);
        }
    return tiles.sort((a, b) => a.x + a.y - b.x - b.y);
  }
}
