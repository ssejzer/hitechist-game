import { WIDTH, HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, clamp, activeObjectiveId, shuttlePosition, nearestShuttleStop } from "./engine.js";
import { TILE, WorldChunks, blockAt, isRack, worldLabel } from "./world.js";
import { locationFor } from "./career.js";
import { expressionFor, gaitFor } from "./animation.js";
import { CHARACTERS, getCharacter } from "./characters.js";

import { drawEngineerFace, drawEngineerPortrait } from "./character-face.js";

const ENVIRONMENT_ANCHORS = {
  "office-desk": 145, "meeting-table": 143,
  "office-equipment": 126, "network-station": 126, "storage-station": 128,
  "rack-compute": 128, "rack-storage": 128, "rack-network": 128,
  "utility-console": 125, "coffee-machine": 124, "office-plant": 121,
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.output = canvas.getContext("2d", { alpha: false });
    this.scene = document.createElement("canvas");
    this.scene.width = WIDTH;
    this.scene.height = HEIGHT;
    this.ctx = this.scene.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera = { x: 1600, y: 1120 };
    this.sprites = new Map();
    // Load each Blender-rendered prop when its workplace first needs it.
    this.environmentSprites = new Map();
    this.faces = new Map();
    this.companions = new Map();
    for (const character of CHARACTERS) {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/faces/${character.id}.png`;
      this.faces.set(character.id, image);
    }
    for (const kind of ["dog", "cat"]) {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/companions/${kind === "dog" ? "elad-dog" : "nenad-cat"}.png`;
      this.companions.set(kind, image);
    }
    this.talScene = new Image();
    this.talScene.src = `${import.meta.env.BASE_URL}assets/characters/tal-assistant-scene.png`;
    this.pet = null;
    this.world = new WorldChunks();
    this.tiles = [];
  }
  rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  text(ctx, text, x, y, color = "#90ac91", size = 10, align = "left") {
    ctx.fillStyle = color;
    ctx.font = `${size}px "IBM Plex Mono", monospace`;
    ctx.textAlign = align;
    ctx.fillText(text, Math.round(x), Math.round(y));
  }
  worldTag(ctx, label, x, y, color = "#e7f5dc") {
    ctx.font = '10px "IBM Plex Mono", monospace';
    const width = Math.ceil(ctx.measureText(label).width) + 14;
    this.rect(ctx, x - width / 2, y - 13, width, 18, "#0b2022f0");
    ctx.strokeStyle = "#789b82";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - width / 2) + 0.5, Math.round(y - 13) + 0.5, width - 1, 17);
    this.text(ctx, label, x, y, color, 10, "center");
  }
  glow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  project(x, y) {
    return { x: (x - y) * 0.5, y: (x + y) * 0.25 };
  }
  screen(x, y) {
    const point = this.project(x, y),
      cam = this.project(this.camera.x, this.camera.y);
    return { x: WIDTH / 2 + point.x - cam.x, y: HEIGHT / 2 + point.y - cam.y };
  }
  drawEnvironmentSprite(ctx, name, x, y) {
    let sprite = this.environmentSprites.get(name);
    if (!sprite) {
      sprite = new Image();
      sprite.src = `${import.meta.env.BASE_URL}assets/isometric/${name}.png`;
      this.environmentSprites.set(name, sprite);
    }
    if (!sprite?.complete || !sprite.naturalWidth) return false;
    const anchorY = ENVIRONMENT_ANCHORS[name];
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sprite, Math.round(x - 80), Math.round(y - anchorY), 160, 176);
    ctx.restore();
    return true;
  }
  propSpriteName(entity, locationId) {
    if (isRack(entity.type)) return `rack-${entity.type.replace("-rack", "")}`;
    if (entity.type === "utility") return "utility-console";
    if (entity.type === "plant") return "office-plant";
    if (entity.type === "office-desk")
      return locationId === "manager" && entity.x < 1540 ? "meeting-table" : "office-desk";
    return null;
  }
  stationSpriteName(entity, locationId) {
    if (locationId === "office") return "office-equipment";
    return {
      compute: "office-equipment",
      network: "network-station",
      storage: "storage-station",
    }[entity.rackKind] ?? "office-equipment";
  }
  diamond(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - TILE * 0.25);
    ctx.lineTo(x + TILE * 0.5, y);
    ctx.lineTo(x, y + TILE * 0.25);
    ctx.lineTo(x - TILE * 0.5, y);
    ctx.closePath();
    ctx.fill();
  }
  line(ctx, points, color, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  drawTile(ctx, col, row, time) {
    const x = col * TILE + TILE / 2,
      y = row * TILE + TILE / 2,
      point = this.screen(x, y),
      type = blockAt(col, row, this.world.locationId);
    if (
      point.x < -70 ||
      point.x > WIDTH + 70 ||
      point.y < -50 ||
      point.y > HEIGHT + 100
    )
      return;
    const variant = (col + row) % 2;
    const sprite = this.cachedSprite(`floor-${type}-${variant}`, (c) =>
      this.floorBlock(c, 80, 112, type, variant),
    );
    ctx.drawImage(sprite, Math.round(point.x - 80), Math.round(point.y - 112));
  }
  officeDesk(ctx, x, y) {
    this.polygon(ctx, [[x - 35, y - 12], [x - 5, y - 27], [x + 38, y - 5], [x + 8, y + 11]], "#a57958");
    this.line(ctx, [[x - 35, y - 12], [x - 35, y + 12], [x + 8, y + 35], [x + 8, y + 11]], "#4b3833", 5);
    this.rect(ctx, x - 4, y - 29, 25, 17, "#1c3439");
    this.rect(ctx, x, y - 26, 17, 10, "#8fd7c5");
  }
  officeEquipment(ctx, x, y, equipment, time) {
    const color = equipment.hp <= 0 ? "#db7764" : "#b7f58e";
    this.polygon(ctx, [[x - 29, y], [x, y - 15], [x + 32, y], [x + 2, y + 16]], "#263b43");
    this.rect(ctx, x - 24, y - 44, 49, 40, "#d1d5c5");
    this.rect(ctx, x - 19, y - 38, 39, 27, equipment.id === "wifi" || equipment.id === "ethernet" ? "#486f78" : "#273d4d");
    if (["windows", "mac", "printer"].includes(equipment.id)) {
      this.rect(ctx, x - 13, y - 32, 27, 15, equipment.id === "windows" ? "#4785b5" : "#85b7ad");
    } else {
      for (let i = 0; i < 3; i++) this.rect(ctx, x - 13 + i * 10, y - 25, 4, 4, color);
    }
    this.rect(ctx, x - 4, y - 8, 8, 3, color);
  }
  cachedSprite(key, paint) {
    if (!this.sprites.has(key)) {
      const sprite = document.createElement("canvas");
      sprite.width = 160;
      sprite.height = 176;
      paint(sprite.getContext("2d"));
      this.sprites.set(key, sprite);
    }
    return this.sprites.get(key);
  }
  floorBlock(ctx, x, y, type, variant) {
    const point = { x, y };
    const base =
      type === "void"
        ? "#081617"
        : type === "edge"
          ? "#102522"
          : type === "office-floor"
            ? variant ? "#586b6a" : "#607574"
          : type === "comms-floor"
            ? variant ? "#344e5d" : "#3b5765"
          : type === "server-floor"
            ? variant ? "#344d56" : "#3c5660"
          : type === "site-floor"
            ? variant ? "#4b5f59" : "#536962"
          : type === "datacenter-floor"
            ? variant ? "#34464f" : "#3a4e57"
          : type === "manager-floor"
            ? variant ? "#68665f" : "#716f66"
          : type === "road"
            ? variant ? "#26363c" : "#2c3d43"
          : type === "yard"
            ? variant ? "#39514a" : "#40584f"
          : type === "walkway"
            ? "#354647"
            : variant
              ? "#26383d"
              : "#293b3f";
    this.diamond(ctx, point.x, point.y, base);
    ctx.strokeStyle = type === "walkway" ? "#435457" : "#314449";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - 27);
    ctx.lineTo(point.x + 54, point.y);
    ctx.lineTo(point.x, point.y + 27);
    ctx.lineTo(point.x - 54, point.y);
    ctx.closePath();
    ctx.stroke();
    if (type === "walkway") {
      this.line(
        ctx,
        [
          [x - 48, y + 1],
          [x - 34, y + 8],
        ],
        "#99ac8544",
        2,
      );
      this.line(
        ctx,
        [
          [x + 48, y + 1],
          [x + 34, y + 8],
        ],
        "#99ac8544",
        2,
      );
      return;
    }
    if (type === "road") {
      if (variant) this.line(ctx, [[x - 19, y - 9], [x + 19, y + 9]], "#d6ba71bb", 3);
      return;
    }
    if (type === "edge")
      this.line(
        ctx,
        [
          [x - 51, y],
          [x, y + 25],
          [x + 51, y],
        ],
        "#719085",
        3,
      );
    if (isRack(type)) {
      this.line(
        ctx,
        [
          [x - 38, y - 7],
          [x + 12, y + 18],
          [x + 41, y + 3],
        ],
        "#15292b",
        3,
      );
      this.line(
        ctx,
        [
          [x - 38, y - 4],
          [x + 12, y + 21],
          [x + 41, y + 6],
        ],
        "#607c7022",
        1,
      );
    }
  }
  polygon(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }
  rackBlock(ctx, x, y, time, flipped, hp = null, rackKind = "compute") {
    const h = hp === null ? (flipped ? 78 : 70) : 88;
    const theme = {
      compute: { top: "#4b646b", lamp: "#8cdaca" },
      storage: { top: "#665d73", lamp: "#c8a6e8" },
      network: { top: "#42677a", lamp: "#78c8ee" },
    }[rackKind] ?? { top: "#4b646b", lamp: "#8cdaca" };
    const lamp =
      hp === null
        ? theme.lamp
        : hp <= 0
          ? "#68565b"
          : hp < 35
            ? "#e8a06e"
            : "#bbed87";
    this.polygon(
      ctx,
      [
        [x - 27, y],
        [x + 1, y - 14],
        [x + 57, y + 16],
        [x + 27, y + 32],
      ],
      "#09181f77",
    );
    this.polygon(
      ctx,
      [
        [x - 28, y - h],
        [x, y + 14 - h],
        [x, y + 14],
        [x - 28, y],
      ],
      "#283943",
    );
    this.polygon(
      ctx,
      [
        [x, y + 14 - h],
        [x + 28, y - h],
        [x + 28, y],
        [x, y + 14],
      ],
      "#11252d",
    );
    this.polygon(
      ctx,
      [
        [x, y - 14 - h],
        [x + 28, y - h],
        [x, y + 14 - h],
        [x - 28, y - h],
      ],
      theme.top,
    );
    this.line(
      ctx,
      [
        [x - 28, y - h],
        [x, y + 14 - h],
        [x + 28, y - h],
      ],
      "#76918a",
      1,
    );
    ctx.save();
    ctx.transform(1, -0.5, 0, 1, x, y + 14);
    this.rect(ctx, 3, -h + 5, 22, h - 9, "#071920");
    for (let i = 0; i < 6; i++) {
      this.rect(ctx, 5, -h + 10 + i * 9, 18, 6, "#263d43");
      this.rect(ctx, 7, -h + 12 + i * 9, 9, 1, "#536a6d");
      this.rect(ctx, 19, -h + 12 + i * 9, 2, 2, i === 3 ? "#dcb979" : lamp);
    }
    ctx.restore();
    ctx.save();
    ctx.transform(1, 0.5, 0, 1, x - 28, y);
    for (let i = 0; i < 11; i++)
      this.rect(ctx, 5, -h + 14 + i * 4, 18, 1, "#172b35");
    this.rect(ctx, 5, -h + 5, 11, 3, "#899996");
    ctx.restore();
    if (hp !== null) {
      this.line(
        ctx,
        [
          [x - 28, y - h],
          [x, y + 14 - h],
          [x + 28, y - h],
        ],
        lamp,
        3,
      );
      ctx.save();
      ctx.transform(1, -0.5, 0, 1, x, y + 14);
      this.rect(ctx, 5, -19, 18, 8, "#284539");
      this.text(ctx, hp <= 0 ? "OFF" : "SYS", 14, -13, lamp, 5, "center");
      ctx.restore();
    }
  }
  utilityBlock(ctx, x, y) {
    this.polygon(
      ctx,
      [
        [x - 22, y - 18],
        [x, y - 30],
        [x + 28, y - 16],
        [x + 5, y - 4],
      ],
      "#657a7b",
    );
    this.polygon(
      ctx,
      [
        [x - 22, y - 18],
        [x + 5, y - 4],
        [x + 5, y + 12],
        [x - 22, y - 2],
      ],
      "#354b50",
    );
    this.polygon(
      ctx,
      [
        [x + 5, y - 4],
        [x + 28, y - 16],
        [x + 28, y],
        [x + 5, y + 12],
      ],
      "#1d343b",
    );
    ctx.save();
    ctx.transform(1, 0.5, 0, 1, x - 16, y - 22);
    this.rect(ctx, 0, -30, 28, 23, "#0c222b");
    this.rect(ctx, 3, -27, 22, 17, "#284b4d");
    for (let i = 0; i < 4; i++)
      this.rect(ctx, 6, -24 + i * 3, 8 + (i % 3) * 4, 1, "#8bd3bb");
    this.rect(ctx, 12, -8, 4, 9, "#182f37");
    this.rect(ctx, 0, 1, 20, 4, "#29424a");
    ctx.restore();
  }
  plantBlock(ctx, x, y) {
    this.polygon(
      ctx,
      [
        [x - 10, y - 5],
        [x, y],
        [x + 10, y - 5],
        [x + 8, y + 8],
        [x, y + 12],
        [x - 8, y + 8],
      ],
      "#846858",
    );
    this.polygon(
      ctx,
      [
        [x - 10, y - 5],
        [x, y - 10],
        [x + 10, y - 5],
        [x, y],
      ],
      "#b09578",
    );
    this.rect(ctx, x - 1, y - 30, 3, 24, "#6b9173");
    for (const [dx, dy, c] of [
      [-14, -28, "#638f77"],
      [13, -33, "#79a47e"],
      [-11, -42, "#8aaa83"],
      [8, -47, "#537d68"],
      [0, -55, "#89ad7c"],
    ])
      this.polygon(
        ctx,
        [
          [x, y - 12],
          [x + dx, y + dy + 9],
          [x + dx + 5, y + dy],
          [x + dx + 8, y + dy + 10],
        ],
        c,
      );
  }
  drawWorld(ctx, time) {
    ctx.fillStyle = "#0a191a";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const tile of this.tiles) this.drawTile(ctx, tile.col, tile.row, time);
    if (this.world.locationId === "datacenter") {
      for (const room of locationFor("datacenter").rooms) {
        const entrance = this.screen(room.x + room.width / 2, room.y + room.height + 20);
        if (entrance.x > 80 && entrance.x < WIDTH - 80 && entrance.y > 70 && entrance.y < HEIGHT - 45)
          this.worldTag(ctx, room.name, entrance.x, entrance.y, "#f6cf7f");
        const stop = this.screen(room.x + room.width / 2, 1870);
        if (stop.x > 85 && stop.x < WIDTH - 85 && stop.y > 100 && stop.y < HEIGHT - 45) {
          this.rect(ctx, stop.x - 27, stop.y + 4, 54, 5, "#d1bc76");
          this.rect(ctx, stop.x - 2, stop.y - 45, 4, 48, "#afc5c0");
          this.worldTag(ctx, `SHUTTLE STOP · ${room.id.slice(-1).toUpperCase()}`, stop.x, stop.y - 49, "#f6cf7f");
        }
      }
    }
    if (this.world.locationId) return;
    const districtX = Math.floor(this.camera.x / (30 * TILE)) * 30 * TILE;
    const districtY = Math.floor(this.camera.y / (20 * TILE)) * 20 * TILE;
    for (const sign of [
      { x: 1100, y: 1170, text: "ACME  /  COMPUTE AISLE" },
      { x: 1770, y: 810, text: "NORTHSTAR  /  STORAGE AISLE" },
      { x: 2280, y: 1170, text: "ORBIT  /  NETWORK AISLE" },
    ]) {
      const p = this.screen(sign.x + districtX, sign.y + districtY);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.transform(1, 0.5, -1, 0.5, 0, 0);
      this.rect(ctx, -90, -13, 180, 23, "#22363c");
      this.text(ctx, sign.text, 0, 2, "#91aba2", 10, "center");
      ctx.restore();
    }
  }
  rack(ctx, x, y, hp, time, rackKind) {
    const danger = hp < 35,
      dead = hp <= 0;
    this.glow(
      ctx,
      x,
      y - 38,
      70,
      dead ? "#be6a5514" : danger ? "#e4a06b1e" : "#a7e17e18",
    );
    if (!this.drawEnvironmentSprite(ctx, `rack-${rackKind}`, x, y))
      this.rackBlock(ctx, x, y, time, false, hp, rackKind);
    else this.rect(ctx, x + 20, y - 52, 7, 6, dead ? "#c8785d" : danger ? "#e7a475" : "#b7ed8e");
  }
  player(ctx, p, time, bystander = false) {
    ctx.save();
    const gait = gaitFor(p, time),
      expression = expressionFor(p, time);
    ctx.globalAlpha = p.invincible > 0 && Math.sin(time * 40) > 0 ? 0.5 : 1;
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.fillStyle = "#081a1b99";
    ctx.beginPath();
    ctx.ellipse(0, 6, 21, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(p.facing ?? 1, 1);
    const character = getCharacter(p.characterId);
    if (!bystander) this.lastRenderedCharacter = character.id;
    const y = Math.round(-63 + gait.bob);
    const legWidth = character.build === "slim" ? 5 : character.build === "broad" ? 9 : 7;
    const hip = character.build === "broad" ? 9 : 6;
    for (const [side, stride] of [[-1, gait.swing], [1, gait.opposite]]) {
      const x = side * hip;
      const lift = Math.max(0, stride) * 5;
      const knee = [x + stride * 4, -7 - lift * 0.4];
      const foot = [x + stride * 8, 4 - lift];
      this.limb(ctx, [[x, -18 + gait.bob], knee, foot], legWidth, side < 0 ? "#425c70" : "#607e91");
      this.rect(ctx, foot[0] - legWidth / 2 - 1, foot[1] - 1, legWidth + 6, 5, "#102026");
      this.rect(ctx, foot[0] - legWidth / 2, foot[1] + 2, legWidth + 4, 1, "#a7b5b2");
    }
    this.engineer(ctx, character, y, gait, expression);
    if (character.smoking || (bystander && character.id === "erez")) {
      this.rect(ctx, 7, -46 + gait.bob, 19, 5, "#132328");
      this.rect(ctx, 8, -45 + gait.bob, 14, 3, "#f1e6cf");
      this.rect(ctx, 22, -45 + gait.bob, 4, 3, "#ed936b");
      for (let i = 0; i < 4; i++) {
        const rise = (time * 15 + i * 7) % 29;
        ctx.globalAlpha = 0.55 * (1 - rise / 29);
        this.rect(ctx, 26 + Math.sin(time * 2 + i) * 4 + rise * 0.2, -48 - rise, 4, 4, "#dae6dc");
      }
      ctx.globalAlpha = p.invincible > 0 && Math.sin(time * 40) > 0 ? 0.5 : 1;
    }
    ctx.restore();
  }
  bystander(ctx, person, time) {
    if (person.characterId === "tal") {
      if (this.talScene.complete && this.talScene.naturalWidth) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.talScene, Math.round(person.x - 75.6), Math.round(person.y - 114.8), 151.2, 114.8);
        ctx.restore();
        const speaking = Math.floor(time / 2.4) % 2;
        const bubbleX = person.x + (speaking ? 44 : -49);
        const bubbleY = person.y - (speaking ? 96 : 87);
        this.worldTag(ctx, speaking ? "•••" : "...", bubbleX, bubbleY, "#f6cf7f");
      }
      return;
    }
    this.player(ctx, person, time, true);
  }
  coffeeMachine(ctx, machine, time) {
    const { x, y } = machine;
    const ready = machine.cooldown <= 0;
    this.polygon(ctx, [[x - 27, y + 1], [x, y - 12], [x + 29, y + 2], [x + 2, y + 16]], "#081a1b88");
    this.rect(ctx, x - 20, y - 49, 40, 49, "#40535a");
    this.rect(ctx, x - 16, y - 45, 32, 25, "#1c3036");
    this.rect(ctx, x - 12, y - 40, 24, 8, ready ? "#bd815d" : "#70868a");
    this.rect(ctx, x - 7, y - 17, 14, 10, "#e5d6b7");
    this.rect(ctx, x + 7, y - 15, 4, 5, "#e5d6b7");
    this.rect(ctx, x - 15, y - 4, 30, 4, "#25383d");
    this.rect(ctx, x - 13, y - 28, 4, 3, ready ? "#f6cf7f" : "#667a7c");
    if (ready) {
      const rise = (time * 14) % 20;
      this.rect(ctx, x - 2, y - 23 - rise, 3, 5, "#e3d8bd88");
    }
  }
  monitoringDrone(ctx, drone, time, target) {
    const hover = Math.sin(time * 5) * 3;
    const x = drone.x, y = drone.y + hover - 31;
    if (target) {
      ctx.save();
      ctx.strokeStyle = "#8bd3e699";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(target.x, target.y - 28);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#8bd3e6";
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, 36, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      this.worldTag(ctx, `MONITOR ${Math.ceil(target.hp)}%`, target.x, target.y - 65, "#8bd3e6");
    }
    this.glow(ctx, x, y, 23, "#8bd3e633");
    this.polygon(ctx, [[x - 18, y], [x, y - 9], [x + 18, y], [x, y + 10]], "#294650");
    this.polygon(ctx, [[x - 12, y - 2], [x, y - 10], [x + 12, y - 2], [x, y + 4]], "#a1dce4");
    this.rect(ctx, x - 3, y - 2, 6, 5, "#17434b");
    this.rect(ctx, x - 21, y - 2, 5, 4, "#f6cf7f");
    this.rect(ctx, x + 16, y - 2, 5, 4, "#f6cf7f");
  }
  shuttle(ctx, p, time) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.scale(p.facing ?? 1, 1);
    this.polygon(ctx, [[-91, 22], [-21, -12], [92, 18], [16, 55]], "#07191baa");
    this.polygon(ctx, [[-82, -35], [-25, -64], [75, -31], [14, -2]], "#f7fbf7");
    this.polygon(ctx, [[-82, -35], [14, -2], [14, 40], [-82, 9]], "#d7e7ec");
    this.polygon(ctx, [[14, -2], [75, -31], [75, 10], [14, 40]], "#edf5f6");
    this.polygon(ctx, [[-73, -27], [4, -2], [4, 13], [-73, -12]], "#1d303c");
    for (const x of [-51, -29, -7])
      this.line(ctx, [[x, -20 + (x + 73) * 0.32], [x, -5 + (x + 73) * 0.32]], "#95afbc", 3);
    this.polygon(ctx, [[23, -5], [66, -26], [66, -8], [23, 13]], "#263e4c");
    this.line(ctx, [[-82, 2], [14, 32], [75, 2]], "#6c9bb4", 4);
    this.line(ctx, [[-25, -58], [72, -27]], "#dce9ef", 2);
    this.rect(ctx, -61, 14, 15, 13, "#18242b");
    this.rect(ctx, 38, 22, 15, 13, "#18242b");
    this.rect(ctx, -57, 20, 7, 5, "#e1e7e2");
    this.rect(ctx, 42, 28, 7, 5, "#e1e7e2");
    this.rect(ctx, 62, 5, 9, 5, "#f6d794");
    this.text(ctx, "AZ SHUTTLE", -32, 7, "#31536a", 8, "center");
    if (Math.sin(time * 16) > 0) this.rect(ctx, -80, 4, 6, 3, "#e99b78");
    ctx.restore();
  }
  shuttleWaypoint(ctx, g, time) {
    if (g.locationId !== "datacenter" || g.vehicle) return;
    const stop = nearestShuttleStop(g);
    if (stop.distance >= 230) return;
    const target = this.screen(stop.x, stop.y);
    const x = clamp(target.x, 160, WIDTH - 160);
    const y = clamp(target.y, 205, HEIGHT - 175);
    this.glow(ctx, x, y, 48, "#f6cf7f44");
    ctx.save();
    ctx.translate(x, y);
    const angle = Math.atan2(target.y - HEIGHT / 2, target.x - WIDTH / 2);
    ctx.rotate(stop.distance < 150 ? -Math.PI / 2 : angle);
    this.polygon(ctx, [[19, 0], [-10, -11], [-4, 0], [-10, 11]], "#f6cf7f");
    ctx.restore();
    const label = g.shuttleDestination ? "WAIT HERE · BOARDS AUTOMATICALLY" :
      `SHUTTLE STOP ${stop.room.id.slice(-1).toUpperCase()} · CHOOSE AZ`;
    this.worldTag(ctx, label, x, y - 22 + Math.sin(time * 5) * 2, "#f6cf7f");
  }
  limb(ctx, points, width, color) {
    const joints = points.map(([x, y]) => [Math.round(x), Math.round(y)]);
    this.line(ctx, joints, "#15262d", width + 2);
    this.line(ctx, joints, color, width);
    for (const [x, y] of joints.slice(1, -1))
      this.rect(ctx, x - width / 2, y - width / 2, width, width, color);
  }
  engineer(ctx, character, y, gait, expression) {
    const { shirt, skin } = character;
    const half = character.build === "slim" ? 8 : character.build === "broad" ? 18 : 12;
    const lean = Math.round(gait.lean);
    const top = y + 27, hem = y + 47;
    const arm = (side, stride) => {
      const shoulder = [side * (half + 1) + lean, top + 3];
      const elbow = [side * (half + 5) + lean + stride * 3, top + 12];
      const hand = [side * (half + 4) + lean + stride * 7, top + 21 - Math.max(0, stride) * 4];
      this.limb(ctx, [shoulder, elbow], 6, shirt);
      this.limb(ctx, [elbow, hand], 4, skin);
      this.rect(ctx, hand[0] - 2, hand[1] - 2, 5, 5, skin);
    };
    arm(-1, gait.opposite);
    const belly = character.build === "broad" ? 3 : -2;
    this.polygon(ctx, [[-half + lean, top], [half + lean, top],
      [half + belly + lean, hem - 4], [half - 1 + lean, hem + 2],
      [-half + 1 + lean, hem + 2], [-half - belly + lean, hem - 4]], "#15262d");
    this.polygon(ctx, [[-half + 2 + lean, top + 1], [half - 2 + lean, top + 1],
      [half + belly - 2 + lean, hem - 4], [half - 2 + lean, hem],
      [-half + 2 + lean, hem], [-half - belly + 2 + lean, hem - 4]], shirt);
    this.rect(ctx, -half + 3 + lean, top + 5, 3, 11, "#ffffff25");
    this.rect(ctx, half - 5 + lean, top + 7, 3, 10, "#07191f33");
    this.rect(ctx, -half + 2 + lean, hem, half * 2 - 4, 3, "#293b43");
    this.rect(ctx, -1 + lean, hem, 3, 3, "#a2ad9c");
    this.rect(ctx, 3 + lean, top + 8, 5, 1, "#ffffff44");
    this.rect(ctx, -3 + lean, top - 4, 7, 6, skin);
    this.line(ctx, [[-5 + lean, top], [lean, top + 4], [5 + lean, top]], "#15262d", 2);
    arm(1, gait.swing);
    if (!drawEngineerPortrait(ctx, this.faces.get(character.id), -16 + lean, y - 8, expression))
      drawEngineerFace(ctx, character, -16 + lean, y - 8, expression);
  }
  companionFor(g, time) {
    const species = getCharacter(g.player.characterId).companion;
    if (!species || g.vehicle) {
      this.pet = null;
      return null;
    }
    const player = g.player;
    // The offset projects to the engineer's left so the pet stays visible
    // beside the body while still trailing movement with a short delay.
    const target = { x: player.x - 65, y: player.y + 80 };
    if (!this.pet || this.pet.species !== species || time < this.pet.time ||
        Math.hypot(this.pet.x - target.x, this.pet.y - target.y) > 360) {
      this.pet = { ...target, species, time, facing: player.facing, moving: false };
    } else {
      const dt = Math.min(0.07, Math.max(0, time - this.pet.time));
      const gap = Math.hypot(target.x - this.pet.x, target.y - this.pet.y);
      const catchUp = Math.min(1, dt * (gap > 140 ? 7 : 4.5));
      this.pet.x += (target.x - this.pet.x) * catchUp;
      this.pet.y += (target.y - this.pet.y) * catchUp;
      this.pet.time = time;
      this.pet.facing = player.facing;
      this.pet.moving = gap > 8;
    }
    return { ...this.pet, kind: "companion" };
  }
  drawCompanion(ctx, pet, time) {
    const image = this.companions.get(pet.species);
    if (!image?.complete || !image.naturalWidth) return;
    const width = pet.species === "dog" ? 58 : 46;
    const height = pet.species === "dog" ? 76 : 66;
    const frame = pet.moving ? 1 + Math.floor(time * 8) % 2 : Math.floor(time * 0.6) % 7 === 0 ? 3 : 0;
    const sourceWidth = image.naturalWidth / 4;
    ctx.save();
    ctx.translate(Math.round(pet.x), Math.round(pet.y));
    ctx.fillStyle = "#081a1b88";
    ctx.beginPath();
    ctx.ellipse(0, 3, width * 0.33, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(pet.facing > 0 ? -1 : 1, 1);
    ctx.drawImage(image, frame * sourceWidth, 0, sourceWidth, image.naturalHeight,
      -width / 2, -height * 0.82, width, height);
    ctx.restore();
  }
  enemyFace(ctx, e, time) {
    const expression = expressionFor(e, time);
    const spec =
      e.type === "boss"
        ? { x: -17, y: -40, w: 34, h: 21, bg: "#bc7054", eye: "#f6d491" }
        : e.type === "tank"
          ? { x: -12, y: -21, w: 24, h: 14, bg: "#463b2e", eye: "#f5cb7d" }
          : e.type === "shooter"
            ? { x: -8, y: -20, w: 16, h: 14, bg: "#303e48", eye: "#d2b6d7" }
            : {
                x: -7,
                y: -12,
                w: 14,
                h: 12,
                bg: e.type === "runner" ? "#d4a15c" : "#b77360",
                eye: "#f4d8a1",
              };
    const { x, y, w, h, bg, eye } = spec;
    this.rect(ctx, x, y, w, h, bg);
    const ew = Math.max(3, Math.round(w * 0.2)),
      ey = y + 3;
    for (const [ex, index] of [
      [x + 1, 0],
      [x + w - ew - 1, 1],
    ]) {
      const closed =
        expression === "blink" ||
        expression === "hurt" ||
        (expression === "wink" && index === 1);
      this.rect(
        ctx,
        ex,
        ey,
        ew,
        closed ? 1 : expression === "surprised" ? 5 : 3,
        eye,
      );
      if (expression === "grumpy")
        this.line(
          ctx,
          [
            [ex, ey - 3],
            [ex + ew, ey],
          ],
          "#211f27",
          2,
        );
      if (expression === "worried")
        this.line(
          ctx,
          [
            [ex, ey],
            [ex + ew, ey - 3],
          ],
          eye,
          1,
        );
    }
    const mouthX = x + w / 2,
      mouthY = y + h - 3;
    if (expression === "happy" || expression === "wink")
      this.line(
        ctx,
        [
          [mouthX - 3, mouthY - 1],
          [mouthX, mouthY + 1],
          [mouthX + 3, mouthY - 1],
        ],
        eye,
        1,
      );
    else if (expression === "surprised")
      this.rect(ctx, mouthX - 1, mouthY - 2, 3, 4, "#2c2630");
    else if (expression === "hurt")
      this.line(
        ctx,
        [
          [mouthX - 4, mouthY],
          [mouthX - 2, mouthY - 2],
          [mouthX, mouthY],
          [mouthX + 2, mouthY - 2],
          [mouthX + 4, mouthY],
        ],
        eye,
        1,
      );
    else this.rect(ctx, mouthX - 3, mouthY, 6, 1, eye);
  }
  enemy(ctx, e, time) {
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    const r = (...a) => this.rect(ctx, ...a),
      hit = e.hit > 0,
      gait = gaitFor(e, time),
      bounce = gait.bob;
    ctx.translate(0, bounce);
    ctx.fillStyle = "#0b211e80";
    ctx.beginPath();
    ctx.ellipse(0, 8, e.r + 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.type === "boss") {
      if (e.fireTimer < 0.65) {
        ctx.strokeStyle = "#efa07888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 58, 31, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      r(-35, -57, 70, 66, hit ? "#eee3ad" : "#784c40");
      r(-39, -51, 8, 54, "#342c29");
      r(30, -52, 10, 55, "#422f2b");
      r(-29, -62, 58, 8, "#b57e59");
      r(-25, -48, 50, 35, "#172726");
      r(-20, -42, 40, 23, "#bc7054");
      r(-14, -37, 9, 6, "#f6d491");
      r(6, -37, 9, 6, "#f6d491");
      r(-12, -22, 25, 3, "#633e35");
      r(-26, -6, 52, 9, "#3c342d");
      for (let i = 0; i < 5; i++) r(-22 + i * 10, -3, 5, 3, "#c78e65");
      r(-24, 9 + gait.swing * 4, 10, 7, "#282c27");
      r(15, 9 - gait.swing * 4, 10, 7, "#282c27");
      r(-44, -30 + gait.swing * 3, 7, 21, "#aa7553");
      r(37, -30 - gait.swing * 3, 7, 21, "#aa7553");
      this.text(ctx, "DEPLOY", 0, -68, "#e7b786", 8, "center");
    } else if (e.type === "tank") {
      r(-18, -28, 36, 32, hit ? "#f6e4b2" : "#947551");
      r(-21, -24, 5, 24, "#574731");
      r(17, -24, 6, 24, "#574731");
      r(-14, -23, 28, 17, "#463b2e");
      r(-10, -17, 7, 4, "#f5cb7d");
      r(4, -17, 7, 4, "#f5cb7d");
      r(-12, 3 + gait.swing * 3, 8, 6, "#25372b");
      r(5, 3 - gait.swing * 3, 8, 6, "#25372b");
    } else if (e.type === "shooter") {
      r(-12, -23, 24, 25, hit ? "#ecdfca" : "#878ba2");
      r(-16, -17, 32, 12, "#5e697c");
      r(-8, -20, 16, 13, "#303e48");
      r(-3, -18, 6, 8, "#d2b6d7");
      r(-3, 1, 6, 8, "#5b6d70");
      r(-11, 6 + gait.swing * 3, 7, 3, "#8e9ca0");
      r(4, 6 - gait.swing * 3, 7, 3, "#8e9ca0");
    } else {
      const color = hit
        ? "#ffe9bb"
        : e.type === "runner"
          ? "#d4a15c"
          : "#b77360";
      r(-10, -16, 20, 18, color);
      r(-14, -12, 4, 11, "#774e43");
      r(10, -12, 4, 11, "#774e43");
      r(-9, -19, 4, 4, color);
      r(5, -19, 4, 4, color);
      r(-6, -10, 4, 4, "#f4d8a1");
      r(3, -10, 4, 4, "#f4d8a1");
      r(-4, -3, 8, 2, "#603e34");
      for (let leg = 0; leg < 3; leg++) {
        const stride = Math.sin((e.walkPhase ?? 0) + leg) * (e.moving ? 3 : 0);
        r(-15, -8 + leg * 5 + stride, 5, 2, color);
        r(10, -8 + leg * 5 - stride, 5, 2, color);
      }
      if (e.type === "runner") {
        r(-4, -22, 8, 4, "#ebce84");
        r(-3, -2, 6, 6, "#966939");
      }
    }
    this.enemyFace(ctx, e, time);
    if (e.hp < e.maxHp && e.type !== "boss") {
      r(-15, -34, 30, 3, "#152c25");
      r(-15, -34, (30 * e.hp) / e.maxHp, 3, "#dca479");
    }
    ctx.restore();
  }
  draw(g, time, menu = false) {
    if (this.world.locationId !== g.locationId) {
      this.world = new WorldChunks(g.locationId);
      this.sprites.clear();
    }
    const ctx = this.ctx,
      target = menu ? { x: g.player.x - 210, y: g.player.y + 210 } : g.player;
    this.camera.x += (target.x - this.camera.x) * 0.075;
    this.camera.y += (target.y - this.camera.y) * 0.075;
    this.tiles = this.world.visible(this.camera, WIDTH, HEIGHT);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    if (g.shake && !this.reduced)
      ctx.translate(
        Math.sin(time * 57) * g.shake,
        Math.cos(time * 63) * g.shake * 0.65,
      );
    this.drawWorld(ctx, time);
    const projectEntity = (entity) => ({
      ...entity,
      ...this.screen(entity.x, entity.y),
    });
    const companion = this.companionFor(g, time);
    const entities = [
      ...this.tiles
        .filter(
          (t) =>
            (isRack(t.type) || ["utility", "plant", "office-desk"].includes(t.type)) &&
            !g.servers.some((s) => Math.hypot(t.x - s.x, t.y - s.y) < 100),
        )
        .map((t) => ({ ...t, kind: "prop" })),
      ...g.servers.map((s) => ({ ...s, kind: "server" })),
      ...(g.coffeeMachines ?? []).map((m) => ({ ...m, kind: "coffee" })),
      ...g.enemies.map((e) => ({ ...e, kind: "enemy" })),
      ...(g.bystanders ?? []).map((person) => ({ ...person, kind: "bystander" })),
      ...g.shuttles.map((s) => ({ ...shuttlePosition(g, s), id: s.id, kind: "shuttle" })),
      ...(companion ? [companion] : []),
      ...(g.drone && !g.vehicle ? [{ ...g.drone, kind: "drone" }] : []),
      { ...g.player, kind: "player" },
    ].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const s of g.servers) {
      const p = this.screen(s.x, s.y),
        active = activeObjectiveId(g) === s.id && !g.objectives[g.wave].completed,
        color = active ? "#f6cf7f" : s.hp <= 0 ? "#c8785d" : s.hp < 35 ? "#e7a475" : "#b7ed8e";
      ctx.strokeStyle = `${color}55`;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 59, 25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const d of g.drops) {
      const p = this.screen(d.x, d.y),
        bob = Math.sin(time * 5 + d.x) * 2;
      if (d.life < 4 && Math.sin(time * 12) < 0) continue;
      this.glow(
        ctx,
        p.x,
        p.y,
        19,
        d.type === "patch" ? "#b7f58e19" : "#ffb3b319",
      );
      if (d.type === "patch") {
        ctx.fillStyle = "#b7f58e";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6 + bob);
        ctx.lineTo(p.x + 5, p.y + bob);
        ctx.lineTo(p.x, p.y + 6 + bob);
        ctx.lineTo(p.x - 5, p.y + bob);
        ctx.fill();
      } else {
        this.rect(ctx, p.x - 5, p.y - 2 + bob, 10, 4, "#edb2a5");
        this.rect(ctx, p.x - 2, p.y - 5 + bob, 4, 10, "#edb2a5");
      }
    }
    for (const entity of entities) {
      const p = projectEntity(entity);
      if (p.x < -90 || p.x > WIDTH + 90 || p.y < -60 || p.y > HEIGHT + 120)
        continue;
      if (entity.kind === "prop") {
        const behindPlayer =
          p.y > this.screen(g.player.x, g.player.y).y &&
          Math.abs(p.x - this.screen(g.player.x, g.player.y).x) < 45 &&
          p.y - this.screen(g.player.x, g.player.y).y < 100;
        const variant = (entity.col + entity.row) % 2;
        const artName = this.propSpriteName(entity, g.locationId);
        ctx.globalAlpha = behindPlayer ? 0.3 : 1;
        if (!artName || !this.drawEnvironmentSprite(ctx, artName, p.x, p.y)) {
          const sprite = this.cachedSprite(`${entity.type}-${variant}`, (c) => {
            if (isRack(entity.type))
              this.rackBlock(c, 80, 112, 0, variant, null, entity.type.replace("-rack", ""));
            if (entity.type === "utility") this.utilityBlock(c, 80, 112);
            if (entity.type === "plant") this.plantBlock(c, 80, 112);
            if (entity.type === "office-desk") this.officeDesk(c, 80, 112);
          });
          ctx.drawImage(sprite, Math.round(p.x - 80), Math.round(p.y - 112));
        }
        ctx.globalAlpha = 1;
      } else if (entity.kind === "server") {
        if (["sysadmin", "datacenter"].includes(g.locationId)) this.rack(ctx, p.x, p.y, entity.hp, time, entity.rackKind);
        else if (g.locationId) {
          if (!this.drawEnvironmentSprite(ctx, this.stationSpriteName(entity, g.locationId), p.x, p.y))
            this.officeEquipment(ctx, p.x, p.y, entity, time);
          else {
            this.rect(ctx, p.x + 15, p.y - 28, 7, 5, entity.hp <= 0 ? "#db7764" : "#b7f58e");
          }
        }
        else this.rack(ctx, p.x, p.y, entity.hp, time, entity.rackKind);
      }
      else if (entity.kind === "shuttle") this.shuttle(ctx, p, time);
      else if (entity.kind === "companion") this.drawCompanion(ctx, p, time);
      else if (entity.kind === "coffee") {
        if (!this.drawEnvironmentSprite(ctx, "coffee-machine", p.x, p.y))
          this.coffeeMachine(ctx, p, time);
        else if (entity.cooldown <= 0) {
          const rise = (time * 14) % 20;
          this.rect(ctx, p.x + 13, p.y - 58 - rise, 3, 5, "#e3d8bd88");
        }
        if (Math.hypot(entity.x - g.player.x, entity.y - g.player.y) < 105)
          this.worldTag(ctx, entity.cooldown > 0 ? `BREWING ${Math.ceil(entity.cooldown)}s` : "HOLD E · COFFEE", p.x, p.y - 65, "#f6cf7f");
      }
      else if (entity.kind === "drone") {
        const target = g.servers.find((s) => s.id === entity.targetId);
        this.monitoringDrone(ctx, p, time, target ? projectEntity(target) : null);
      }
      else if (entity.kind === "bystander") this.bystander(ctx, p, time);
      else if (entity.kind === "player") {
        if (!g.vehicle) this.player(ctx, p, time);
      }
      else this.enemy(ctx, p, time);
    }
    if (g.vehicle && g.vehicle.phase !== "riding")
      this.player(ctx, projectEntity(g.player), time);
    for (const shot of g.shots) {
      const p = this.screen(shot.x, shot.y),
        q = this.screen(shot.x + shot.vx * 0.05, shot.y + shot.vy * 0.05),
        angle = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      this.rect(
        ctx,
        -5,
        -2,
        shot.hostile ? 6 : 11,
        4,
        shot.hostile ? "#e5a084" : "#c2f9a4",
      );
      ctx.restore();
    }
    for (const pulse of g.pulses) {
      const p = this.screen(pulse.x, pulse.y),
        progress = 1 - pulse.life / pulse.maxLife;
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = "#bcf797";
      ctx.lineWidth = 3 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y,
        pulse.radius * progress * 0.5,
        pulse.radius * progress * 0.25,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const v of g.particles) {
      const p = this.screen(v.x, v.y);
      ctx.globalAlpha = clamp(v.life / v.maxLife, 0, 1);
      this.rect(ctx, p.x, p.y, v.size, v.size, v.color);
    }
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      180,
      WIDTH / 2,
      HEIGHT / 2,
      680,
    );
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, "#06161788");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Draw gameplay text last so characters, desks, effects, and the vignette
    // cannot hide the objective or its interaction instructions.
    if (!menu) for (const s of g.servers) {
      const p = this.screen(s.x, s.y);
      if (p.x < 85 || p.x > WIDTH - 85 || p.y < 110 || p.y > HEIGHT - 70) continue;
      const objective = g.objectives?.[g.wave],
        active = activeObjectiveId(g) === s.id && !objective.completed,
        color = active ? "#f6cf7f" : s.hp <= 0 ? "#f0a18d" : "#b7ed8e";
      this.worldTag(ctx, s.name, p.x, p.y + 31, color);
      this.rect(ctx, p.x - 23, p.y + 39, 46, 4, "#102022");
      this.rect(ctx, p.x - 23, p.y + 39, (46 * s.hp) / 100, 4, color);
      if (active) {
        this.worldTag(ctx, `FIX ${Math.round(objective.progress)}%`, p.x, p.y - 65, "#f6cf7f");
        if (Math.hypot(g.player.x - s.x, g.player.y - s.y) < 115)
          this.worldTag(ctx, "HOLD [E] · 4 PATCHES", p.x, p.y - 98);
      } else if (Math.hypot(g.player.x - s.x, g.player.y - s.y) < 95 && s.hp < 100)
        this.worldTag(ctx, "[E] REPAIR", p.x, p.y - 98);
    }
    if (!menu && g.locationId === "call_center") {
      for (const [x, y, label] of [
        [770, 430, "EMPLOYEE OPEN SPACE"],
        [2145, 430, "COMMUNICATIONS ROOM"],
        [1270, 880, "DOOR TO COMMUNICATIONS →"],
        [1690, 880, "← DOOR TO OPEN SPACE"],
      ]) {
        const p = this.screen(x, y);
        if (p.x > 20 && p.x < WIDTH - 20 && p.y > 70 && p.y < HEIGHT - 30)
          this.worldTag(ctx, label, p.x, p.y, "#f6cf7f");
      }
    }
    for (const f of g.floaters) {
      const p = this.screen(f.x, f.y);
      ctx.globalAlpha = Math.min(1, f.life * 2);
      this.worldTag(ctx, f.text, p.x, p.y, f.color);
    }
    if (g.vehicle) {
      const ride = g.vehicle;
      const shuttle = g.shuttles.find((s) => s.id === ride.shuttleId);
      const position = shuttlePosition(g, shuttle);
      const p = this.screen(position.x, position.y);
      this.worldTag(ctx, `${ride.phase.toUpperCase()} · AZ SHUTTLE`, p.x, p.y - 70, "#f6cf7f");
    }
    if (!menu) this.shuttleWaypoint(ctx, g, time);
    ctx.globalAlpha = 1;
    ctx.restore();
    const bounds = this.canvas.getBoundingClientRect(),
      viewWidth = Math.min(
        WIDTH,
        Math.round((HEIGHT * bounds.width) / bounds.height),
      );
    if (this.canvas.width !== viewWidth) {
      this.canvas.width = viewWidth;
      this.canvas.height = HEIGHT;
      this.output.imageSmoothingEnabled = false;
    }
    this.output.drawImage(
      this.scene,
      (WIDTH - viewWidth) / 2,
      0,
      viewWidth,
      HEIGHT,
      0,
      0,
      viewWidth,
      HEIGHT,
    );
    if (!menu && g.banner <= 0) this.minimap(g, viewWidth);
  }
  minimap(g, viewWidth) {
    const bounds = locationFor(g.locationId) ?? { width: WORLD_WIDTH, height: WORLD_HEIGHT };
    const ctx = this.output,
      mw = 144,
      mh = 82,
      mx = viewWidth - mw - 18,
      my = 112;
    this.rect(ctx, mx, my, mw, mh, "#0e241ee9");
    ctx.strokeStyle = "#78936666";
    ctx.strokeRect(mx, my, mw, mh);
    if (bounds.rooms) {
      if (g.locationId === "datacenter") {
        this.rect(ctx, mx, my + 1870 / bounds.height * mh, mw, 440 / bounds.height * mh, "#34464a");
        for (const [left, right] of [[1100, 1650], [2640, 3190]])
          this.rect(ctx, mx + left / bounds.width * mw, my, (right - left) / bounds.width * mw, mh, "#34464a");
      }
      ctx.strokeStyle = "#78936677";
      for (const room of bounds.rooms)
        ctx.strokeRect(mx + room.x / bounds.width * mw, my + room.y / bounds.height * mh,
          room.width / bounds.width * mw, room.height / bounds.height * mh);
      if (g.locationId === "call_center") {
        this.text(ctx, "OPEN", mx + 33, my + 17, "#d7e6ce", 8, "center");
        this.text(ctx, "COMMS", mx + 105, my + 17, "#d7e6ce", 8, "center");
        this.text(ctx, "DOOR", mx + 72, my + 48, "#f6cf7f", 7, "center");
      }
    }
    // District boundaries make the full facility overview readable at any scale.
    for (let i = 1; i < (g.locationId ? 2 : 4); i++) {
      this.line(
        ctx,
        [
          [mx + (mw * i) / 4, my],
          [mx + (mw * i) / 4, my + mh],
        ],
        "#46685455",
      );
      this.line(
        ctx,
        [
          [mx, my + (mh * i) / 4],
          [mx + mw, my + (mh * i) / 4],
        ],
        "#46685455",
      );
    }
    if (!g.locationId) {
      ctx.strokeStyle = "#a9dba97a";
      ctx.strokeRect(
        mx + (clamp(g.player.x - 1000, 0, WORLD_WIDTH - 2000) / WORLD_WIDTH) * mw,
        my + (clamp(g.player.y - 1000, 0, WORLD_HEIGHT - 2000) / WORLD_HEIGHT) * mh,
        (2000 / WORLD_WIDTH) * mw,
        (2000 / WORLD_HEIGHT) * mh,
      );
    }
    for (const s of g.servers)
      this.rect(
        ctx,
        mx + (s.x / bounds.width) * mw - 3,
        my + (s.y / bounds.height) * mh - 3,
        6,
        6,
        activeObjectiveId(g) === s.id && !g.objectives[g.wave].completed
          ? "#f6cf7f" : s.hp <= 0 ? "#d67760" : s.hp < 35 ? "#e5b06c" : "#97c77c",
      );
    this.rect(
      ctx,
      mx + (g.player.x / bounds.width) * mw - 2,
      my + (g.player.y / bounds.height) * mh - 2,
      4,
      4,
      "#f2f4da",
    );
    this.text(
      ctx,
      worldLabel(g.player.x, g.player.y, g.locationId).split(" / ")[0],
      mx + mw / 2,
      my + mh - 5,
      "#829b76",
      7,
      "center",
    );
  }
}
