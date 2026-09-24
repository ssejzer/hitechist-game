import test from "node:test";
import assert from "node:assert/strict";
import { LocalSession } from "../src/session.js";
import { FIXED_DT, PROTOCOL_VERSION } from "../src/config.js";
import { expressionFor, gaitFor } from "../src/animation.js";
import { WorldChunks, MAX_CACHED_CHUNKS, blockAt } from "../src/world.js";
import { CHARACTERS } from "../src/characters.js";

test("character choice and character-specific companions survive snapshots", () => {
  const reference = new LocalSession({ seed: 42 });
  reference.setInput({ x: 1 });
  for (let i = 0; i < 120; i++) reference.advance(FIXED_DT);
  for (const character of CHARACTERS) {
    const session = new LocalSession({ seed: 42, characterId: character.id });
    session.setInput({ x: 1 });
    for (let i = 0; i < 120; i++) session.advance(FIXED_DT);
    const restored = LocalSession.fromSnapshot(JSON.parse(JSON.stringify(session.snapshot())));
    assert.equal(restored.state.player.characterId, character.id);
    assert.equal(restored.state.drone !== null, character.id === "yaroslav");
    restored.state.player.characterId = "sebastian";
    restored.state.drone = null;
    assert.deepEqual(restored.snapshot(), reference.snapshot());
  }
  assert.equal(new LocalSession({ characterId: "missing" }).state.player.characterId, "sebastian");
});

test("fixed ticks produce identical simulation at 30, 60, and 144 display FPS", () => {
  const states = [30, 60, 144].map((fps) => {
    const s = new LocalSession({ seed: 12345 });
    s.setInput({ x: 0.3, y: 0 });
    for (let i = 0; i < fps * 6; i++) s.advance(1 / fps);
    assert.equal(s.state.tick, 360);
    return s.snapshot().state;
  });
  assert.deepEqual(states[0], states[1]);
  assert.deepEqual(states[1], states[2]);
});
test("JSON snapshot roundtrip resumes RNG, pending commands, and gameplay exactly", () => {
  const a = new LocalSession({ seed: 778 });
  for (let i = 0; i < 250; i++) a.advance(FIXED_DT);
  a.action("pulse");
  a.setInput({ x: 0.2, y: -0.1 });
  a.advance(0.005);
  const b = LocalSession.fromSnapshot(JSON.parse(JSON.stringify(a.snapshot())));
  for (let i = 0; i < 240; i++) {
    a.advance(FIXED_DT);
    b.advance(FIXED_DT);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test("session rejects duplicate, invalid, and foreign player commands", () => {
  const s = new LocalSession();
  const input = {
    version: PROTOCOL_VERSION,
    playerId: s.state.player.id,
    sequence: 1,
    x: 1,
    y: 0,
  };
  assert.equal(s.submitInput(input), true);
  assert.equal(s.submitInput(input), false);
  assert.equal(
    s.submitInput({ ...input, sequence: 2, playerId: "stranger" }),
    false,
  );
  assert.equal(s.submitInput({ ...input, sequence: 2, x: Infinity }), false);
  assert.equal(s.submitInput({ ...input, sequence: 2, x: 100 }), false);
  assert.equal(s.submitInput({ ...input, sequence: 2, version: 99 }), false);
});
test("an action is consumed once and pausing clears pending movement", () => {
  const s = new LocalSession();
  s.action("dash");
  s.advance(FIXED_DT * 6);
  assert.equal(s.state.events.filter((e) => e.type === "dash").length, 1);
  s.state.mode = "paused";
  s.action("pulse");
  const tick = s.state.tick;
  s.advance(0.1);
  assert.equal(s.state.tick, tick);
  assert.equal(s.pending.pulse, false);
});
test("upgrade offers belong to the session and persist through snapshots", () => {
  const a = new LocalSession({ seed: 4 });
  a.state.objectives[0].completed = true;
  a.state.waveTime = 45;
  a.advance(FIXED_DT);
  const options = a.upgradeChoices();
  assert.equal(options.length, 3);
  const b = LocalSession.fromSnapshot(a.snapshot());
  assert.deepEqual(b.upgradeChoices(), options);
  assert.equal(b.chooseUpgrade("not-offered"), false);
  assert.equal(a.chooseUpgrade(options[0].id), true);
  assert.equal(b.chooseUpgrade(options[0].id), true);
  a.advance(FIXED_DT);
  b.advance(FIXED_DT);
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test("chunk cache stays bounded when traversing the full enlarged world", () => {
  const world = new WorldChunks();
  let maxVisible = 0;
  for (let y = 800; y < 8800; y += 1100)
    for (let x = 800; x < 12800; x += 1100) {
      const tiles = world.visible({ x, y }, 1120, 620);
      maxVisible = Math.max(maxVisible, tiles.length);
      assert.ok(world.cache.size <= MAX_CACHED_CHUNKS);
      for (const tile of tiles)
        assert.equal(tile.type, blockAt(tile.col, tile.row));
    }
  assert.ok(maxVisible < 800, `viewport tile count: ${maxVisible}`);
  const first = world.visible({ x: 1600, y: 1120 }, 1120, 620);
  world.visible({ x: 11000, y: 7000 }, 1120, 620);
  assert.deepEqual(world.visible({ x: 1600, y: 1120 }, 1120, 620), first);
});
test("expressions change per actor without changing gameplay randomness", () => {
  const s = new LocalSession({ seed: 345 }),
    before = s.snapshot().rngState;
  const a = { id: "player-1", hp: 100, maxHp: 100 },
    b = { id: 16, hp: 100, maxHp: 100 };
  const expressions = new Set();
  let differences = 0;
  for (let t = 0; t < 60; t += 0.1) {
    const face = expressionFor(a, t);
    expressions.add(face);
    assert.equal(expressionFor(a, t), face);
    if (face !== expressionFor(b, t)) differences++;
  }
  assert.ok(expressions.size >= 5);
  assert.ok(differences > 100);
  assert.equal(s.snapshot().rngState, before);
  assert.equal(expressionFor({ ...a, hit: 0.1 }, 1), "hurt");
  assert.equal(expressionFor({ ...a, hp: 10 }, 1), "worried");
});
test("walking moves opposing limbs; stationary actors stop stepping", () => {
  const s = new LocalSession();
  s.setInput({ x: 1, y: 0 });
  s.advance(0.2);
  const actor = s.state.player;
  assert.ok(actor.walkPhase > 0);
  assert.equal(actor.moving, true);
  const gait = gaitFor(actor, s.state.time);
  assert.equal(gait.swing, -gait.opposite);
  s.setInput({ x: 0, y: 0 });
  s.advance(FIXED_DT);
  assert.equal(gaitFor(actor, s.state.time).swing, 0);
});
