import "./style.css";
import { createGame, wavesFor, nearestShuttleStop } from "./engine.js";
import { LOCATIONS, locationFor } from "./career.js";
import { Renderer } from "./renderer.js";
import { AudioSystem } from "./audio.js";
import { LocalSession } from "./session.js";
import { CHARACTERS, getCharacter, portraitPath } from "./characters.js";
const $ = (id) => document.getElementById(id);
if (navigator.maxTouchPoints > 0)
  document.querySelector(".arcade").classList.add("touch-device");
const canvas = $("game"),
  renderer = new Renderer(canvas),
  audio = new AudioSystem();
const keys = new Set();
let joystick = { x: 0, y: 0 },
  touchRepair = false,
  session = new LocalSession(),
  game = session.state,
  menu = true,
  lastTime = 0,
  toastUntil = 0,
  pendingToast = null,
  previousMode = null;
let best = 0;
let selectedCharacter = "sebastian";
let selectedLocation = "office";
let career = { unlocked: ["office"], ratings: {} };
try {
  best = Number(localStorage.getItem("hitechist-root-access-best")) || 0;
  selectedCharacter = getCharacter(localStorage.getItem("hitechist-root-access-character")).id;
  const saved = JSON.parse(localStorage.getItem("hitechist-root-access-career") || "null");
  if (saved && Array.isArray(saved.unlocked) && saved.ratings && typeof saved.ratings === "object") {
    career.unlocked = ["office", ...saved.unlocked.filter((id) => id in LOCATIONS)];
    career.ratings = saved.ratings;
  }
  const savedLocation = localStorage.getItem("hitechist-root-access-location");
  selectedLocation = career.unlocked.includes(savedLocation)
    ? savedLocation
    : Object.keys(LOCATIONS).filter((id) => career.unlocked.includes(id)).at(-1) || "office";
} catch {}
function selectLocation(id) {
  if (!career.unlocked.includes(id)) return;
  selectedLocation = id;
  try { localStorage.setItem("hitechist-root-access-location", id); } catch {}
  renderCareer();
  menuScene();
}
function renderCareer() {
  const holder = $("career-select");
  holder.replaceChildren();
  const locations = Object.values(LOCATIONS);
  $("career-progress").textContent = `CAREER PATH · ${locations.filter((location) => Number(career.ratings[location.id]) > 0).length} / ${locations.length} COMPLETED`;
  for (const [index, location] of locations.entries()) {
    const button = document.createElement("button");
    const unlocked = career.unlocked.includes(location.id);
    const rating = Math.max(0, Math.min(3, Number(career.ratings[location.id]) || 0));
    button.type = "button";
    button.disabled = !unlocked;
    button.className = "career-location";
    button.dataset.status = rating ? "completed" : unlocked ? "unlocked" : "locked";
    button.setAttribute("aria-pressed", String(selectedLocation === location.id));
    button.setAttribute("aria-label", `Level ${index + 1}: ${location.name}, ${rating ? `${rating} stars earned` : unlocked ? "unlocked" : "locked"}`);
    const number = document.createElement("span");
    number.className = "career-node";
    number.textContent = rating ? "✓" : String(index + 1);
    const name = document.createElement("span");
    name.className = "career-name";
    name.textContent = location.name;
    const result = document.createElement("small");
    result.textContent = rating ? "★".repeat(rating) : unlocked ? "READY" : "LOCKED";
    button.append(number, name, result);
    button.addEventListener("click", () => selectLocation(location.id));
    holder.append(button);
  }
}
renderCareer();
const characterPortrait = (character) => `${import.meta.env.BASE_URL}${portraitPath(character)}`;
function selectCharacter(id) {
  const character = getCharacter(id);
  selectedCharacter = character.id;
  game.player.characterId = character.id;
  $("selected-character").textContent = character.name;
  $("player-name").textContent = character.name.toUpperCase();
  $("character-tag-name").textContent = character.name.toUpperCase();
  $("operator-name").textContent = character.name === "Sebastian" ? 'Sebastian “The Hitechist”' : character.name;
  $("operator-avatar").src = characterPortrait(character);
  $("operator-avatar").alt = `${character.name}, your on-call engineer`;
  $("terminal-title").textContent = `${character.id}@production:~ / root-access`;
  for (const button of $("character-roster").children)
    button.setAttribute("aria-pressed", String(button.dataset.character === character.id));
  try { localStorage.setItem("hitechist-root-access-character", character.id); } catch {}
}
for (const character of CHARACTERS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "character-card";
  button.dataset.character = character.id;
  button.setAttribute("aria-pressed", "false");
  const portrait = document.createElement("img");
  portrait.src = characterPortrait(character);
  portrait.alt = "";
  const name = document.createElement("span");
  name.textContent = character.name;
  button.append(portrait, name);
  button.addEventListener("click", () => selectCharacter(character.id));
  $("character-roster").append(button);
}
$("character-button").addEventListener("click", () => {
  $("character-dialog").showModal();
  $("character-roster").querySelector('[aria-pressed="true"]').focus();
});
for (const id of ["close-characters", "confirm-character"])
  $(id).addEventListener("click", () => $("character-dialog").close());
const formatTime = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const scoreText = (n) => String(Math.floor(n)).padStart(6, "0");
const show = (id, visible) => $(id).classList.toggle("hidden", !visible);
$("best-label").innerHTML = `LOCAL HIGH SCORE <b>${scoreText(best)}</b>`;
function menuScene() {
  game = createGame(undefined, selectedLocation);
  selectCharacter(selectedCharacter);
  $("scene-tag").firstElementChild.nextSibling.textContent = ` ${locationFor(selectedLocation).name} `;
  game.enemies = [];
  game.drops = [
    { x: game.player.x - 80, y: game.player.y + 100, type: "patch", life: 100 },
    { x: game.player.x + 80, y: game.player.y + 100, type: "patch", life: 100 },
  ];
}
function updateStageInfo() {
  const location = locationFor(game.locationId);
  if (!location) return;
  const level = Object.keys(LOCATIONS).indexOf(location.id) + 1;
  $("stage-label").textContent = `LEVEL ${String(level).padStart(2, "0")} · ${location.name}`;
  const room = location.rooms.find((r) => game.player.x >= r.x && game.player.x <= r.x + r.width &&
    game.player.y >= r.y && game.player.y <= r.y + r.height);
  const active = game.objectives?.[game.wave];
  const targetId = active?.steps?.[active.step];
  const target = game.servers.find((s) => s.id === targetId);
  const targetRoom = target && location.rooms.find((r) => target.x >= r.x && target.x <= r.x + r.width &&
    target.y >= r.y && target.y <= r.y + r.height);
  const route = location.id === "call_center" && targetRoom && room?.id !== targetRoom.id ? " VIA CENTER DOOR" : "";
  $("room-label").textContent = `${room?.name || "HALLWAY"}${targetRoom && room?.id !== targetRoom.id ? ` · NEXT: ${targetRoom.name}${route}` : ""}`;
}
function start() {
  if ($("help-dialog").open || $("character-dialog").open) return;
  if (audio.enabled) audio.enable(true);
  session = new LocalSession({
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    characterId: selectedCharacter,
    locationId: selectedLocation,
  });
  game = session.state;
  pendingToast = null;
  updateStageInfo();
  // A new shift begins at the centre of the full facility, not at the menu's
  // showcase location. Snap the camera there so the opening frame is stable.
  Object.assign(renderer.camera, game.player);
  menu = false;
  keys.clear();
  joystick = { x: 0, y: 0 };
  touchRepair = false;
  document.querySelector(".arcade").classList.add("playing");
  for (const id of [
    "start-screen",
    "scene-tag",
    "character-tag",
    "end-screen",
    "pause-screen",
    "upgrade-screen",
  ])
    show(id, false);
  for (const id of ["hud", "ability-bar", "touch-controls"]) show(id, true);
  show("shuttle-guide", false);
  setupSiteMap();
  for (const id of ["switch-player-button", "end-shift-button"]) show(id, true);
  $("pause-button").disabled = false;
  audio.setPlaying(true);
  audio.play("wave");
  banner();
  canvas.focus({ preventScroll: true });
  $("status-text").textContent =
    "SHIFT STARTED. LET AUTOMATION DO THE SHOOTING.";
  $("terminal-title").textContent = `${selectedCharacter}@${selectedLocation}:~ / sudo survive`;
  $("scene-tag").firstElementChild.nextSibling.textContent = ` ${locationFor(selectedLocation).name} `;
  $("server-status").replaceChildren(...game.servers.map((s) => {
    const item = document.createElement("span");
    const short = ({ wifi: "WI-FI", windows: "WIN", mac: "MAC", ethernet: "ETH", printer: "PRINT", access: "CARD",
      okta: "OKTA", ad: "AD", bitlocker: "KEY", intune: "INTUNE", mail: "MAIL", dns: "DNS",
      vpn: "VPN", edr: "EDR", vmware: "VM", hyperv: "HYPER-V", veeam: "BACKUP", rollout: "ROLLOUT",
      parts: "PARTS", rack_a: "RACK A", rack_b: "RACK B", uplink: "UPLINK", rack_c: "RACK C", backbone: "BACKBONE",
      decision: "DECIDE", assignment: "TEAM", unblocker: "UNBLOCK", deadline: "DEADLINE" })[s.id] || s.name;
    item.innerHTML = `${short} <b>100</b>`;
    return item;
  }));
  toast(
    navigator.maxTouchPoints > 0
      ? "Drag the joystick to move. Hold REPAIR beside the marked station."
      : "Move with WASD / arrows. Hold E beside the marked station.",
    4,
  );
}
function setupSiteMap() {
  const map = $("site-map"), location = locationFor(game.locationId);
  map.replaceChildren();
  show("site-map", !!location.travel);
  if (!location.travel) return;
  const label = document.createElement("span");
  label.textContent = game.locationId === "datacenter" ? "AZ SHUTTLE" : "TRAVEL TO SITE";
  map.append(label);
  location.rooms.forEach((room, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${index + 1} ${room.name}`;
    button.dataset.room = room.id;
    if (game.locationId === "datacenter") button.setAttribute("aria-label", `Select ${room.name} as shuttle destination`);
    button.addEventListener("click", () => visitRoom(room.id));
    map.append(button);
  });
  if (game.locationId === "datacenter") {
    const status = document.createElement("span");
    status.id = "shuttle-status";
    status.setAttribute("role", "status");
    map.append(status);
  }
  const support = document.createElement("button");
  support.type = "button";
  support.id = "support-button";
  support.addEventListener("click", useSupport);
  map.append(support);
}
function visitRoom(id) {
  if (!session.travel(id)) return;
  keys.clear(); joystick = { x: 0, y: 0 }; touchRepair = false;
  $("stick").style.transform = "";
  Object.assign(renderer.camera, game.player);
  canvas.focus({ preventScroll: true });
}
function useSupport() {
  if (session.dispatchSupport()) canvas.focus({ preventScroll: true });
}
function home() {
  menu = true;
  audio.setPlaying(false);
  pendingToast = null;
  menuScene();
  keys.clear();
  joystick = { x: 0, y: 0 };
  touchRepair = false;
  document.querySelector(".arcade").classList.remove("playing");
  for (const id of [
    "hud",
    "ability-bar",
    "touch-controls",
    "site-map",
    "shuttle-guide",
    "end-screen",
    "pause-screen",
    "upgrade-screen",
    "wave-banner",
    "boss-hud",
    "game-toast",
    "switch-player-button",
    "end-shift-button",
  ])
    show(id, false);
  for (const id of ["start-screen", "scene-tag", "character-tag"])
    show(id, true);
  $("pause-button").disabled = true;
  $("pause-button").textContent = "Ⅱ";
  $("pause-button").setAttribute("aria-label", "Pause game");
  $("status-text").textContent = "ALL SYSTEMS SUSPICIOUSLY OPERATIONAL";
  $("terminal-title").textContent = `${selectedCharacter}@production:~ / root-access`;
  $("best-label").innerHTML = `LOCAL HIGH SCORE <b>${scoreText(best)}</b>`;
  renderCareer();
  $("start-button").focus({ preventScroll: true });
}
function banner() {
  const wave = wavesFor(game)[game.wave];
  $("banner-kicker").textContent = game.bossSpawned
    ? "CRITICAL INCIDENT"
    : `INCIDENT 0${game.wave + 1}`;
  $("banner-title").textContent = game.bossSpawned
    ? wave.name
    : wave.name;
  $("banner-copy").textContent = game.bossSpawned
    ? "Defeat the outage to earn your promotion."
    : wave.tagline;
}
function toast(text, seconds = 2.7) {
  if (!menu && game.banner > 0) {
    pendingToast = { text, seconds };
    show("game-toast", false);
    return;
  }
  $("game-toast").textContent = text;
  toastUntil = performance.now() + seconds * 1000;
  show("game-toast", true);
}
function pause(force) {
  if (menu || !["playing", "paused"].includes(game.mode)) return;
  game.mode =
    force === true
      ? "paused"
      : force === false
        ? "playing"
        : game.mode === "playing"
          ? "paused"
          : "playing";
  keys.clear();
  joystick = { x: 0, y: 0 };
  touchRepair = false;
  session.clearInput();
  $("stick").style.transform = "";
  show("pause-screen", game.mode === "paused");
  $("pause-button").textContent = game.mode === "paused" ? "▶" : "Ⅱ";
  $("pause-button").setAttribute(
    "aria-label",
    game.mode === "paused" ? "Resume game" : "Pause game",
  );
  if (game.mode === "paused") $("resume-button").focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
  audio.setPlaying(game.mode === "playing");
}
function showUpgrades() {
  audio.setPlaying(false);
  const options = session.upgradeChoices();
  $("upgrade-options").replaceChildren();
  for (const [index, u] of options.entries()) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.innerHTML = `<span class="upgrade-icon">${u.icon}</span><span>${u.category}</span><h3>${u.name}</h3><p>${u.description}</p><small>${u.effect} →</small>`;
    button.addEventListener("click", () => {
      if (session.chooseUpgrade(u.id)) {
        show("upgrade-screen", false);
        keys.clear();
        joystick = { x: 0, y: 0 };
        touchRepair = false;
        $("stick").style.transform = "";
        audio.setPlaying(true);
        canvas.focus({ preventScroll: true });
        toast(`${u.name} installed. Back to the incident.`, 3);
      }
    });
    button.setAttribute("aria-label", `Choose ${u.name}: ${u.description}`);
    $("upgrade-options").append(button);
    if (index === 0)
      queueMicrotask(() => button.focus({ preventScroll: true }));
  }
  show("upgrade-screen", true);
  show("wave-banner", false);
  $("status-text").textContent =
    `INCIDENT 0${game.wave + 1} CONTAINED. CHOOSE YOUR NEXT ADVANTAGE.`;
}
function end(event) {
  audio.setPlaying(false);
  pendingToast = null;
  const next = event.won ? locationFor(game.locationId)?.next : null;
  if (event.won && game.locationId) {
    if (next && !career.unlocked.includes(next)) career.unlocked.push(next);
    const rating = game.player.hp >= 70 && game.servers.every((s) => s.hp >= 50)
      ? 3 : game.player.hp >= 35 ? 2 : 1;
    career.ratings[game.locationId] = Math.max(career.ratings[game.locationId] || 0, rating);
    try { localStorage.setItem("hitechist-root-access-career", JSON.stringify(career)); } catch {}
    if (next) {
      selectedLocation = next;
      try { localStorage.setItem("hitechist-root-access-location", next); } catch {}
    }
  }
  const record = game.score > best;
  if (record) {
    best = game.score;
    try {
      localStorage.setItem("hitechist-root-access-best", String(best));
    } catch {}
  }
  show("end-screen", true);
  show("wave-banner", false);
  show("boss-hud", false);
  show("game-toast", false);
  const character = getCharacter(game.player.characterId);
  $("end-avatar").src = character.id === "sebastian"
    ? `${import.meta.env.BASE_URL}assets/${event.won ? "victory" : "facepalm"}.png`
    : characterPortrait(character);
  $("end-avatar").alt = character.name;
  $("end-kicker").textContent = event.won
    ? "PROMOTION EARNED"
    : "POST-MORTEM REQUIRED";
  $("end-title").innerHTML = event.won
    ? "Shift complete<span>.</span>"
    : "Well, that escalated<span>.</span>";
  $("end-copy").textContent = event.won
    ? `${character.name} contained the ${locationFor(game.locationId)?.name.toLowerCase()} outage.${locationFor(game.locationId)?.next ? ` ${locationFor(locationFor(game.locationId).next).name} is unlocked.` : " The career campaign is complete."}`
    : event.reason === "servers"
      ? "All stations went down. Collect patches and hold E nearby to repair them."
      : "Your shift ended early. Keep moving, dash through trouble, and use your sudo pulse.";
  $("end-score").textContent = scoreText(game.score);
  $("restart-button").firstChild.textContent = next ? `PLAY ${locationFor(next).name} ` : event.won ? "PLAY AGAIN " : "RETRY SHIFT ";
  $("end-kills").textContent = game.kills;
  $("end-time").textContent = formatTime(game.time);
  $("end-record").textContent = record
    ? "↗ NEW LOCAL HIGH SCORE"
    : `LOCAL HIGH SCORE: ${scoreText(best)}`;
  $("status-text").textContent = event.won
    ? "EXIT CODE 0. SHIFT COMPLETE."
    : "EXIT CODE 1. BLAMELESS POST-MORTEM INCOMING.";
  $("pause-button").disabled = true;
  audio.play(event.won ? "won" : "lost");
  $("restart-button").focus({ preventScroll: true });
}
function updateHud() {
  updateStageInfo();
  const p = game.player;
  $("health-text").textContent = `${Math.ceil(p.hp)} HP`;
  $("health-bar").style.width = `${p.hp}%`;
  $("health-bar").style.background = p.hp < 30 ? "#e99479" : "#b7f58e";
  $("patches").textContent = game.patches;
  $("score").textContent = scoreText(game.score);
  const objective = game.objectives?.[game.wave];
  const currentStep = objective?.steps?.[objective.step];
  const stepName = game.servers.find((s) => s.id === currentStep)?.name;
  $("wave-label").textContent = `0${game.wave + 1} / ${wavesFor(game)[game.wave].name}${objective ? ` · ${objective.completed ? "FIXED" : `${stepName ? `${stepName} ` : ""}${Math.round(objective.progress)}%`}` : ""}`;
  $("timer").textContent = formatTime(game.time);
  $("dash-label").textContent =
    p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "DASH";
  $("pulse-label").textContent =
    p.pulseCooldown > 0 ? `${p.pulseCooldown.toFixed(1)}s` : "SUDO PULSE";
  $("touch-dash").textContent =
    p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "DASH";
  $("touch-pulse").textContent =
    p.pulseCooldown > 0 ? `${p.pulseCooldown.toFixed(1)}s` : "PULSE";
  if (locationFor(game.locationId)?.travel) {
    for (const button of $("site-map").querySelectorAll("[data-room]")) {
      const room = locationFor(game.locationId).rooms.find((r) => r.id === button.dataset.room);
      button.disabled = game.mode !== "playing" || (game.locationId !== "datacenter" && game.travelCooldown > 0);
      button.setAttribute("aria-current", String(game.player.x >= room.x && game.player.x <= room.x + room.width && game.player.y >= room.y && game.player.y <= room.y + room.height));
      if (game.locationId === "datacenter") button.setAttribute("aria-pressed", String(game.shuttleDestination === room.id));
    }
    if (game.locationId === "datacenter") {
      const room = locationFor(game.locationId).rooms.find((r) => r.id === game.shuttleDestination);
      const stop = nearestShuttleStop(game);
      const status = game.vehicle
        ? `${game.vehicle.phase.toUpperCase()} · ${room?.name || "AZ SHUTTLE"}`
        : room ? `DEST: ${room.name}` : "NO DESTINATION";
      if ($("shuttle-status").textContent !== status) $("shuttle-status").textContent = status;
      const closeToStop = stop.distance < 230 && (!game.vehicle || game.vehicle.phase !== "riding");
      show("shuttle-guide", closeToStop);
      const instruction = !room
        ? "PRESS 1–3 OR TAP A DESTINATION BELOW."
        : game.vehicle?.phase === "boarding" ? "BOARDING THE SHUTTLE NOW."
          : game.vehicle?.phase === "exiting" ? `ARRIVING AT ${room.name}.`
            : "STAY BY THE STOP. THE NEXT SHUTTLE BOARDS YOU AUTOMATICALLY.";
      if ($("shuttle-guide-text").textContent !== instruction) $("shuttle-guide-text").textContent = instruction;
    }
    const support = $("support-button");
    support.disabled = game.mode !== "playing" || game.supportCooldown > 0;
    support.textContent = game.supportCooldown > 0 ? `R SUPPORT ${Math.ceil(game.supportCooldown)}s` : "R DISPATCH SUPPORT";
  }
  for (const [i, s] of game.servers.entries()) {
    const el = $("server-status").children[i];
    el.querySelector("b").textContent = s.hp > 0 ? Math.ceil(s.hp) : "OFF";
    el.style.color = s.hp <= 0 ? "#ea967e" : s.hp < 35 ? "#e7ba72" : "#a8c491";
  }
  const boss = game.enemies.find((e) => e.type === "boss");
  show("boss-hud", !!boss && game.mode === "playing");
  if (boss) {
    $("boss-bar").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    $("boss-percent").textContent =
      `${Math.ceil((boss.hp / boss.maxHp) * 100)}%`;
  }
  show("wave-banner", game.banner > 0 && game.mode === "playing" && !game.vehicle);
}
function processEvents() {
  for (const e of game.events.splice(0)) {
    audio.play(e.type);
    if (e.type === "toast") toast(e.text);
    if (e.type === "upgrade") showUpgrades();
    if (e.type === "wave") {
      banner();
      $("status-text").textContent =
        `INCIDENT 0${game.wave + 1} / ${wavesFor(game)[game.wave].name} — FIX THE MARKED STATION.`;
    }
    if (e.type === "boss") {
      banner();
      toast("The outage is live. Keep moving between the projectiles.", 4);
      $("status-text").textContent =
        "CRITICAL: CONTAIN THE OUTAGE.";
    }
    if (e.type === "server-down")
      toast(`${e.name} is offline! Stand nearby and hold E to recover.`, 4);
    if (e.type === "objective") toast(`${e.name} fixed. Survive the incident wave.`, 3);
    if (e.type === "end") end(e);
  }
}
function frame(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
  lastTime = now;
  if (!menu) {
    const x =
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
      (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
      joystick.x;
    const y =
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) +
      joystick.y;
    session.setInput({ x, y, repair: keys.has("e") || touchRepair });
    session.advance(dt);
    processEvents();
    if (pendingToast && game.banner <= 0 && game.mode === "playing") {
      const queued = pendingToast;
      pendingToast = null;
      toast(queued.text, queued.seconds);
    }
    updateHud();
  }
  renderer.draw(game, menu ? now / 1000 : game.time, menu);
  if (now > toastUntil) show("game-toast", false);
  requestAnimationFrame(frame);
}
$("start-button").addEventListener("click", start);
$("restart-button").addEventListener("click", start);
$("home-button").addEventListener("click", home);
$("end-shift-button").addEventListener("click", home);
function switchPlayer() {
  home();
  $("character-dialog").showModal();
  $("character-roster").querySelector('[aria-pressed="true"]').focus();
}
for (const id of ["switch-player-button", "pause-switch-button", "end-switch-button"])
  $(id).addEventListener("click", switchPlayer);
$("pause-button").addEventListener("click", () => pause());
$("resume-button").addEventListener("click", () => pause(false));
$("quit-button").addEventListener("click", home);
$("sound-button").addEventListener("click", () => {
  const enabled = audio.enable(!audio.enabled);
  $("sound-button").textContent = enabled ? "SOUND ON" : "SOUND OFF";
  $("sound-button").setAttribute("aria-pressed", String(enabled));
  $("sound-button").setAttribute(
    "aria-label",
    enabled ? "Disable sound" : "Enable sound",
  );
  if (enabled) audio.play("pickup");
});
$("fullscreen-button").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".arcade").requestFullscreen();
  } catch {
    toast("Fullscreen is unavailable in this browser.");
  }
});
function help() {
  previousMode = !menu ? game.mode : null;
  if (!menu && game.mode === "playing") pause(true);
  $("help-dialog").showModal();
}
function closeHelp() {
  $("help-dialog").close();
}
$("help-button").addEventListener("click", help);
$("close-help").addEventListener("click", closeHelp);
$("manual-play").addEventListener("click", closeHelp);
$("help-dialog").addEventListener("close", () => {
  if (previousMode === "playing" && game.mode === "paused") pause(false);
  previousMode = null;
});
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if ($("help-dialog").open || $("character-dialog").open) return;
  if (k === "enter" && menu) {
    if (
      document.activeElement?.tagName === "BUTTON" &&
      document.activeElement !== $("start-button")
    )
      return;
    e.preventDefault();
    start();
    return;
  }
  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) &&
    !menu &&
    game.mode === "playing"
  )
    e.preventDefault();
  if ((k === "p" || k === "escape") && !e.repeat) {
    pause();
    return;
  }
  if (menu || game.mode !== "playing") return;
  if (locationFor(game.locationId)?.travel && !e.repeat) {
    const index = Number(k) - 1;
    if (index >= 0 && index < locationFor(game.locationId).rooms.length) {
      visitRoom(locationFor(game.locationId).rooms[index].id);
      return;
    }
    if (k === "r") { useSupport(); return; }
  }
  keys.add(k);
  if (e.repeat) return;
  if (k === " ") session.action("dash");
  if (k === "q") session.action("pulse");
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  if (!menu && game.mode === "playing") pause(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !menu && game.mode === "playing") pause(true);
});
const joy = $("joystick");
let joyId = null;
function moveJoy(e) {
  const rect = joy.getBoundingClientRect();
  const dx = e.clientX - rect.left - rect.width / 2,
    dy = e.clientY - rect.top - rect.height / 2;
  const len = Math.hypot(dx, dy),
    max = 34,
    m = Math.min(len, max);
  joystick = {
    x: len ? ((dx / len) * m) / max : 0,
    y: len ? ((dy / len) * m) / max : 0,
  };
  $("stick").style.transform =
    `translate(${joystick.x * max}px,${joystick.y * max}px)`;
}
joy.addEventListener("pointerdown", (e) => {
  joyId = e.pointerId;
  joy.setPointerCapture(e.pointerId);
  moveJoy(e);
});
joy.addEventListener("pointermove", (e) => {
  if (e.pointerId === joyId) moveJoy(e);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  joy.addEventListener(event, () => {
    joyId = null;
    joystick = { x: 0, y: 0 };
    $("stick").style.transform = "";
  });
$("touch-dash").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  session.action("dash");
});
$("touch-pulse").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  session.action("pulse");
});
$("touch-repair").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  $("touch-repair").setPointerCapture(e.pointerId);
  touchRepair = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("touch-repair").addEventListener(event, () => (touchRepair = false));
menuScene();
requestAnimationFrame(frame);
// Explicit opt-in for automated browser verification; absent in normal play.
if (new URLSearchParams(location.search).has("test"))
  window.__game = {
    get state() {
      return game;
    },
    start,
    step: (dt, input) => {
      session.setInput(input ?? {});
      session.advance(dt);
      processEvents();
      updateHud();
    },
    get menu() {
      return menu;
    },
    pause,
    snapshot: () => session.snapshot(),
    get renderStats() {
      return {
        visibleTiles: renderer.tiles.length,
        chunks: renderer.world.cache.size,
        sprites: renderer.sprites.size,
        playerCharacter: renderer.lastRenderedCharacter,
        companion: renderer.pet ? { species: renderer.pet.species, x: renderer.pet.x, y: renderer.pet.y } : null,
      };
    },
    get audioStats() {
      return {
        effectsGain: audio.effectsGain?.gain.value,
        musicGain: audio.musicGain?.gain.value,
        musicPaused: audio.music.paused,
      };
    },
  };

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
}
