import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHARACTERS } from "../src/characters.js";
import { drawEngineerPortrait } from "../src/character-face.js";

test("every character has a transparent eight-frame gameplay face sheet", () => {
  for (const character of CHARACTERS) {
    const png = readFileSync(new URL(`../public/assets/faces/${character.id}.png`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG", character.id);
    assert.equal(png.readUInt32BE(16), 192, character.id);
    assert.equal(png.readUInt32BE(20), 96, character.id);
    assert.equal(png[25], 6, `${character.id} must have transparency`);
  }
});

test("gameplay expressions select their pre-generated face frames", () => {
  const image = { complete: true, naturalWidth: 192 };
  const calls = [];
  const ctx = {
    save() {}, restore() {},
    drawImage(...args) { calls.push(args); },
  };
  for (const expression of ["focused", "happy", "blink", "wink", "surprised", "grumpy", "worried", "hurt"])
    assert.equal(drawEngineerPortrait(ctx, image, -16, -52, expression), true);
  assert.deepEqual(calls.map((args) => args.slice(1, 3)), [
    [0, 0], [48, 0], [96, 0], [144, 0],
    [0, 48], [48, 48], [96, 48], [144, 48],
  ]);
  assert.equal(drawEngineerPortrait(ctx, { complete: false }, -16, -52, "blink"), false);
});
