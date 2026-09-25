import { locationFor } from "./career.js";

// The loop follows the open hallway around the playroom walls and doorway.
function playroomPath() {
  const room = locationFor("manager").rooms.find((item) => item.id === "playroom");
  const left = room.x - 250, right = room.x + room.width + 250;
  const top = room.y - 220, bottom = room.y + room.height + 350;
  const middleX = room.x + room.width / 2;
  const middleY = room.y + room.height / 2;
  return [
    { x: left, y: top }, { x: middleX, y: top }, { x: right, y: top },
    { x: right, y: middleY }, { x: right, y: bottom },
    { x: middleX, y: bottom }, { x: left, y: bottom }, { x: left, y: middleY },
  ];
}

const PATH = playroomPath();

export function createPlayroomPets(locationId) {
  if (locationId !== "manager") return [];
  return [
    { id: "playroom-dog", species: "dog", ...PATH[0], waypoint: 1, direction: 1,
      facing: -1, moving: false, playing: true, playTime: 1.1 },
    { id: "playroom-cat", species: "cat", ...PATH[4], waypoint: 3, direction: -1,
      facing: 1, moving: false, playing: true, playTime: 1.8 },
  ];
}

export function advancePlayroomPets(g, dt) {
  for (const pet of g.playroomPets ?? []) {
    if (pet.playTime > 0) {
      pet.playTime = Math.max(0, pet.playTime - dt);
      pet.playing = true;
      pet.moving = false;
      continue;
    }
    pet.playing = false;
    const target = PATH[pet.waypoint];
    const dx = target.x - pet.x, dy = target.y - pet.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) {
      pet.x = target.x;
      pet.y = target.y;
      pet.waypoint = (pet.waypoint + pet.direction + PATH.length) % PATH.length;
      pet.playTime = 0.7 + g.random() * 1.4;
      pet.moving = false;
      pet.playing = true;
      continue;
    }
    const travel = Math.min(distance, (pet.species === "dog" ? 130 : 105) * dt);
    pet.x += dx / distance * travel;
    pet.y += dy / distance * travel;
    pet.facing = dx - dy > 0 ? 1 : -1;
    pet.moving = true;
  }
}
