import { WORLD_HEIGHT, WORLD_WIDTH, WORLD_SEED } from "./config.js";
import { locationFor } from "./career.js";

export const TILE = 110;
export const WORLD_COLS = Math.ceil(WORLD_WIDTH / TILE);
export const WORLD_ROWS = Math.ceil(WORLD_HEIGHT / TILE);

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + WORLD_SEED) * 43758.5453123;
  return n - Math.floor(n);
};
const inRect = (col, row, x, y, width, height) =>
  col >= x && col < x + width && row >= y && row < y + height;

export const isRack = (type) => type.endsWith("-rack");

export function isSolidAt(x, y, radius = 28, locationId = null) {
  return [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
  ].some(([dx, dy]) =>
    isRack(blockAt(Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE), locationId)) ||
    ["office-desk", "edge"].includes(blockAt(Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE), locationId)) && !!locationFor(locationId),
  );
}

/** A reusable deterministic building block. New floors only need a new layout. */
export function blockAt(col, row, locationId = null) {
  const location = locationFor(locationId);
  if (location) {
    const cols = Math.ceil(location.width / TILE), rows = Math.ceil(location.height / TILE);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return "void";
    if (col === 0 || row === 0 || col === cols - 1 || row === rows - 1) return "edge";
    // Two open rooms are divided by a partition with a wide, marked doorway.
    if (location.rooms.length > 1 && col === 13 &&
        !location.doors.some((door) =>
          Math.abs(door.x - (col + 0.5) * TILE) < TILE &&
          Math.abs(door.y - (row + 0.5) * TILE) <= TILE * 1.5))
      return "edge";
    if ((col + row * 3) % 11 === 0 && row > 2 && row < rows - 2 &&
        !location.equipment.some((e) => Math.hypot(e.x - (col + 0.5) * TILE, e.y - (row + 0.5) * TILE) < 175))
      return "office-desk";
    return (col + row) % 5 === 0 ? "walkway" : "office-floor";
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
