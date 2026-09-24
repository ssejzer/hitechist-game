// Serializable PRNG: restoring its state continues the same simulation.
export function seededRandom(seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  random.getState = () => state;
  random.setState = (value) => {
    state = value >>> 0;
  };
  return random;
}
