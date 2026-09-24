import "./style.css";
import { createGame, WAVES } from "./engine.js";
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
  previousMode = null;
let best = 0;
let selectedCharacter = "sebastian";
try {
  best = Number(localStorage.getItem("hitechist-root-access-best")) || 0;
  selectedCharacter = getCharacter(localStorage.getItem("hitechist-root-access-character")).id;
} catch {}
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
  game = createGame();
  selectCharacter(selectedCharacter);
  game.player.x = 1770;
  game.player.y = 960;
  game.servers[0].x = 1040;
  game.servers[0].y = 760;
  game.servers[1].x = 1650;
  game.servers[1].y = 550;
  game.servers[2].x = 2300;
  game.servers[2].y = 1300;
  game.enemies = [
    { id: 1, type: "bug", x: 2050, y: 1120, hp: 32, maxHp: 32, r: 12, hit: 0 },
    { id: 2, type: "bug", x: 1460, y: 900, hp: 32, maxHp: 32, r: 12, hit: 0 },
    {
      id: 3,
      type: "runner",
      x: 2050,
      y: 640,
      hp: 24,
      maxHp: 24,
      r: 10,
      hit: 0,
    },
  ];
  game.drops = [
    { x: 1710, y: 1090, type: "patch", life: 100 },
    { x: 1775, y: 1120, type: "patch", life: 100 },
    { x: 2070, y: 1050, type: "patch", life: 100 },
  ];
}
function start() {
  if ($("help-dialog").open || $("character-dialog").open) return;
  session = new LocalSession({
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    characterId: selectedCharacter,
  });
  game = session.state;
  // A new shift begins at the centre of the full facility, not at the menu's
  // showcase location. Snap the camera there so the opening frame is stable.
  Object.assign(renderer.camera, game.player);
  menu = false;
  keys.clear();
  joystick = { x: 0, y: 0 };
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
  for (const id of ["switch-player-button", "end-shift-button"]) show(id, true);
  $("pause-button").disabled = false;
  audio.play("wave");
  banner();
  canvas.focus({ preventScroll: true });
  $("status-text").textContent =
    "SHIFT STARTED. LET AUTOMATION DO THE SHOOTING.";
  $("terminal-title").textContent = `${selectedCharacter}@production:~ / sudo survive`;
  toast(
    navigator.maxTouchPoints > 0
      ? "Drag the joystick to move. Auto-fire is on. Protect your servers."
      : "Move with WASD / arrows. Auto-fire is on. Keep your servers alive.",
    4,
  );
}
function home() {
  menu = true;
  menuScene();
  keys.clear();
  joystick = { x: 0, y: 0 };
  document.querySelector(".arcade").classList.remove("playing");
  for (const id of [
    "hud",
    "ability-bar",
    "touch-controls",
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
  $("start-button").focus({ preventScroll: true });
}
function banner() {
  const wave = WAVES[game.wave];
  $("banner-kicker").textContent = game.bossSpawned
    ? "CRITICAL INCIDENT"
    : `INCIDENT 0${game.wave + 1}`;
  $("banner-title").textContent = game.bossSpawned
    ? "“Just one small change.”"
    : wave.name;
  $("banner-copy").textContent = game.bossSpawned
    ? "Defeat the Friday Deploy. Then go home."
    : wave.tagline;
}
function toast(text, seconds = 2.7) {
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
}
function showUpgrades() {
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
        canvas.focus({ preventScroll: true });
        toast(`${u.name} installed. Production says gracias.`, 3);
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
    ? "ALL INCIDENTS RESOLVED"
    : "POST-MORTEM REQUIRED";
  $("end-title").innerHTML = event.won
    ? "Go touch grass<span>.</span>"
    : "Well, that escalated<span>.</span>";
  $("end-copy").textContent = event.won
    ? `Production is alive. Your phone is finally quiet. Go enjoy the sunrise, ${character.name}.`
    : event.reason === "servers"
      ? "All three servers went down. Collect patches and hold E nearby to bring them back."
      : "Your shift ended early. Keep moving, dash through trouble, and use your sudo pulse.";
  $("end-score").textContent = scoreText(game.score);
  $("end-kills").textContent = game.kills;
  $("end-time").textContent = formatTime(game.time);
  $("end-record").textContent = record
    ? "↗ NEW LOCAL HIGH SCORE"
    : `LOCAL HIGH SCORE: ${scoreText(best)}`;
  $("status-text").textContent = event.won
    ? "EXIT CODE 0. HUMAN > INFRASTRUCTURE."
    : "EXIT CODE 1. BLAMELESS POST-MORTEM INCOMING.";
  $("pause-button").disabled = true;
  audio.play(event.won ? "won" : "lost");
  $("restart-button").focus({ preventScroll: true });
}
function updateHud() {
  const p = game.player;
  $("health-text").textContent = `${Math.ceil(p.hp)} HP`;
  $("health-bar").style.width = `${p.hp}%`;
  $("health-bar").style.background = p.hp < 30 ? "#e99479" : "#b7f58e";
  $("patches").textContent = game.patches;
  $("score").textContent = scoreText(game.score);
  $("wave-label").textContent = `0${game.wave + 1} / ${WAVES[game.wave].name}`;
  $("timer").textContent = formatTime(game.time);
  $("dash-label").textContent =
    p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "DASH";
  $("pulse-label").textContent =
    p.pulseCooldown > 0 ? `${p.pulseCooldown.toFixed(1)}s` : "SUDO PULSE";
  $("touch-dash").textContent =
    p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "DASH";
  $("touch-pulse").textContent =
    p.pulseCooldown > 0 ? `${p.pulseCooldown.toFixed(1)}s` : "PULSE";
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
  show("wave-banner", game.banner > 0 && game.mode === "playing");
}
function processEvents() {
  for (const e of game.events.splice(0)) {
    audio.play(e.type);
    if (e.type === "toast") toast(e.text);
    if (e.type === "upgrade") showUpgrades();
    if (e.type === "wave") {
      banner();
      $("status-text").textContent =
        `INCIDENT 0${game.wave + 1} / ${WAVES[game.wave].name} — KEEP THE LIGHTS ON.`;
    }
    if (e.type === "boss") {
      banner();
      toast("Friday Deploy is live. Keep moving between the projectiles.", 4);
      $("status-text").textContent =
        "CRITICAL: UNREVIEWED CHANGES IN PRODUCTION.";
    }
    if (e.type === "server-down")
      toast(`${e.name} is offline! Stand nearby and hold E to recover.`, 4);
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
