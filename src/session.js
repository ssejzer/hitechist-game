import {
  createGame,
  step,
  activateDash,
  activatePulse,
  pickUpgrade,
  upgradeChoices,
  UPGRADES,
} from "./engine.js";
import { seededRandom } from "./random.js";
import { getCharacter } from "./characters.js";
import {
  PROTOCOL_VERSION,
  FIXED_DT,
  WORLD_SEED,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from "./config.js";

// This is the local authority today. A future socket adapter submits the same
// commands to a server running this module, then distributes snapshots.
export class LocalSession {
  constructor({ seed = WORLD_SEED, characterId = "sebastian" } = {}) {
    this.seed = seed >>> 0;
    this.state = createGame(seededRandom(this.seed));
    this.state.player.characterId = getCharacter(characterId).id;
    this.accumulator = 0;
    this.lastSequence = -1;
    this.input = { x: 0, y: 0, repair: false };
    this.pending = { dash: false, pulse: false };
  }
  submitInput(command) {
    if (
      !command ||
      command.version !== PROTOCOL_VERSION ||
      command.playerId !== this.state.player.id ||
      !Number.isSafeInteger(command.sequence) ||
      command.sequence <= this.lastSequence ||
      !Number.isFinite(command.x) ||
      !Number.isFinite(command.y) ||
      Math.abs(command.x) > 2 ||
      Math.abs(command.y) > 2
    )
      return false;
    this.lastSequence = command.sequence;
    this.input = {
      x: command.x,
      y: command.y,
      repair: command.repair === true,
    };
    if (this.state.mode === "playing") {
      this.pending.dash ||= command.dash === true;
      this.pending.pulse ||= command.pulse === true;
    }
    return true;
  }
  setInput(input) {
    return this.submitInput({
      version: PROTOCOL_VERSION,
      playerId: this.state.player.id,
      sequence: this.lastSequence + 1,
      x: 0,
      y: 0,
      ...input,
    });
  }
  action(type) {
    if (!["dash", "pulse"].includes(type) || this.state.mode !== "playing")
      return false;
    return this.setInput({ ...this.input, [type]: true });
  }
  clearInput() {
    this.input = { x: 0, y: 0, repair: false };
    this.pending = { dash: false, pulse: false };
    this.accumulator = 0;
  }
  upgradeChoices() {
    return this.state.upgradeOptions.map((id) =>
      UPGRADES.find((u) => u.id === id),
    );
  }
  chooseUpgrade(id) {
    if (!this.state.upgradeOptions.includes(id)) return false;
    return pickUpgrade(this.state, id);
  }
  advance(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) return;
    if (this.state.mode !== "playing") {
      this.clearInput();
      return;
    }
    this.accumulator += Math.min(elapsed, 0.25);
    while (this.accumulator + 1e-10 >= FIXED_DT) {
      if (this.pending.dash) activateDash(this.state);
      if (this.pending.pulse) activatePulse(this.state);
      this.pending = { dash: false, pulse: false };
      step(this.state, FIXED_DT, this.input);
      if (this.state.mode === "upgrade" && !this.state.upgradeOptions.length)
        this.state.upgradeOptions = upgradeChoices(this.state).map((u) => u.id);
      this.accumulator = Math.max(0, this.accumulator - FIXED_DT);
      if (this.state.mode !== "playing") {
        this.clearInput();
        break;
      }
    }
  }
  snapshot() {
    const { random, ...state } = this.state;
    return structuredClone({
      version: PROTOCOL_VERSION,
      world: { seed: WORLD_SEED, width: WORLD_WIDTH, height: WORLD_HEIGHT },
      seed: this.seed,
      rngState: random.getState(),
      state,
      accumulator: this.accumulator,
      lastSequence: this.lastSequence,
      input: this.input,
      pending: this.pending,
    });
  }
  static fromSnapshot(snapshot) {
    if (
      snapshot?.version !== PROTOCOL_VERSION ||
      snapshot.world?.seed !== WORLD_SEED ||
      snapshot.world.width !== WORLD_WIDTH ||
      snapshot.world.height !== WORLD_HEIGHT ||
      !Number.isSafeInteger(snapshot.state?.tick) ||
      !Number.isSafeInteger(snapshot.rngState)
    )
      throw new Error("Incompatible game snapshot");
    const copy = structuredClone(snapshot),
      session = new LocalSession({ seed: copy.seed });
    Object.assign(session.state, copy.state);
    session.state.random.setState(copy.rngState);
    session.accumulator = copy.accumulator;
    session.lastSequence = copy.lastSequence;
    session.input = copy.input;
    session.pending = copy.pending;
    return session;
  }
}
