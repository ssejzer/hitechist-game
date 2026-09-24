export const EXPRESSIONS = ["focused", "happy", "surprised", "grumpy", "wink"];
function hash(value) {
  let n = 2166136261;
  for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

// Cosmetic randomness never consumes the simulation PRNG. Every client can
// reproduce faces using only a stable actor ID and the shared simulation time.
export function expressionFor(actor, time) {
  if (actor.hit > 0 || actor.invincible > 0.55) return "hurt";
  if (actor.hp < actor.maxHp * 0.25) return "worried";
  const id = hash(actor.id ?? "player-1");
  const interval = 2.4 + (id % 17) / 10;
  const phase = time + (id % 300) / 100;
  if (phase % 3.7 < 0.13) return "blink";
  const epoch = Math.floor(phase / interval);
  return EXPRESSIONS[hash(`${id}:${epoch}`) % EXPRESSIONS.length];
}

export function gaitFor(actor, time) {
  const phase = (actor.walkPhase ?? 0) * 0.65;
  const swing = actor.moving ? Math.sin(phase) : 0;
  return {
    swing,
    opposite: -swing,
    step: actor.moving ? Math.cos(phase) : 0,
    lean: actor.moving ? Math.sin(phase) * 0.7 : 0,
    bob: actor.moving
      ? -Math.abs(swing) * 2
      : Math.sin(time * 2 + (Number(actor.id) || 0)) * 0.35,
  };
}
