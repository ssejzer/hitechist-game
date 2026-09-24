// Portrait-inspired faces at native gameplay resolution. These are cosmetic;
// drawing never reads or advances the simulation RNG.
const FACES = {
  sebastian: { width: 12, jaw: 8, hairline: "fedora", beard: "goatee", eyes: "#566b96", lenses: "#7188aa", brow: 2, nose: 4, smile: 1 },
  yaroslav: { width: 13, jaw: 9, hairline: "receding", beard: "trimmed", eyes: "#614734", brow: 1, nose: 3, smile: 1 },
  "juan-ignacio": { width: 12, jaw: 9, hairline: "swept", beard: "stubble", eyes: "#66522f", lenses: "#d1a345", brow: 1, nose: 4, smile: 2 },
  erez: { width: 11, jaw: 8, hairline: "quiff", beard: "shaped", eyes: "#553a2a", brow: 2, nose: 5, smile: 0 },
  luis: { width: 11, jaw: 8, hairline: "crop", beard: "none", eyes: "#453329", brow: 2, nose: 3, smile: 3 },
  nenad: { width: 14, jaw: 11, hairline: "crew", beard: "none", eyes: "#6b8893", brow: 1, nose: 3, smile: 1 },
  elad: { width: 12, jaw: 9, hairline: "spiky", beard: "shaped", eyes: "#634937", brow: 3, nose: 3, smile: 1, earring: true },
  rotem: { width: 12, jaw: 8, hairline: "bun", beard: "full", eyes: "#51402d", brow: 2, nose: 5, smile: 0 },
  tal: { width: 13, jaw: 10, hairline: "sidepart", beard: "chinstrap", eyes: "#76b6cb", brow: 1, nose: 4, smile: 1 },
  jason: { width: 14, jaw: 10, hairline: "cap", beard: "salt-pepper", eyes: "#6f6047", brow: 1, nose: 4, smile: 2 },
  aldo: { width: 12, jaw: 9, hairline: "sidepart", beard: "stubble", eyes: "#786d51", brow: 1, nose: 3, smile: 1 },
};

// Each pre-generated sheet has four columns and two rows of 48px frames.
const FRAME = {
  focused: 0,
  happy: 1,
  blink: 2,
  wink: 3,
  surprised: 4,
  grumpy: 5,
  worried: 6,
  hurt: 7,
};

export function drawEngineerPortrait(ctx, image, x, y, expression) {
  if (!image?.complete || !image.naturalWidth) return false;
  const frame = FRAME[expression] ?? 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, (frame % 4) * 48, Math.floor(frame / 4) * 48, 48, 48,
    Math.round(x - 8), Math.round(y - 11), 48, 48);
  ctx.restore();
  return true;
}

function tint(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${[16, 8, 0].map(shift => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount))).join(",")})`;
}

export function drawEngineerFace(ctx, character, x, y, expression) {
  const face = FACES[character.id] ?? FACES.sebastian;
  const { skin, hair } = character;
  const shadow = tint(skin, -35), light = tint(skin, 23), hairLight = tint(hair, 30);
  const ink = "#182326", w = face.width, jaw = face.jaw;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const rect = (x, y, width, height, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  };
  // A stepped silhouette gives each person different cheeks and jaw proportions.
  const shape = (inset, color) => {
    rect(16 - w + 3 + inset, 6 + inset, (w - 3 - inset) * 2, 3, color);
    rect(16 - w + inset, 9, (w - inset) * 2, 17, color);
    rect(16 - w + 2 + inset, 26, (w - 2 - inset) * 2, 4, color);
    rect(16 - jaw + inset, 30, (jaw - inset) * 2, 4 - inset, color);
  };
  shape(0, ink);
  shape(1, skin);
  rect(16 - w - 1, 18, 3, 7, shadow);
  rect(16 + w - 2, 18, 3, 7, shadow);
  rect(16 - w + 1, 12, 2, 13, shadow);
  rect(16 + w - 4, 19, 3, 9, shadow);
  rect(16 - jaw + 2, 31, jaw * 2 - 4, 2, shadow);
  rect(16 - w + 4, 11, w + 1, 3, light);
  rect(16 - w + 3, 22, 5, 2, light);
  // Hair silhouettes intentionally differ beyond color: forehead height,
  // parting, temple recession and volume come from the supplied portraits.
  if (face.hairline === "receding") {
    rect(6, 7, 20, 2, hair);
    rect(4, 9, 3, 9, hair);
    rect(25, 9, 3, 9, hair);
    rect(10, 7, 12, 3, skin);
    rect(5, 12, 1, 5, hairLight);
    rect(26, 12, 1, 5, hairLight);
  } else if (["crop", "crew", "sidepart"].includes(face.hairline)) {
    rect(16 - w + 2, 6, w * 2 - 4, 5, hair);
    rect(16 - w + 1, 10, 3, 7, hair);
    rect(16 + w - 4, 10, 3, 7, hair);
    rect(8, 7, 10, 1, hairLight);
    if (face.hairline === "sidepart") {
      rect(7, 5, 14, 3, hair);
      rect(9, 6, 10, 1, hairLight);
      rect(23, 7, 1, 4, shadow);
      rect(7, 10, 7, 2, hair);
    }
  } else if (["quiff", "spiky", "swept"].includes(face.hairline)) {
    rect(4, 8, 24, 5, hair);
    rect(6, 5, 20, 5, hair);
    rect(10, 3, 14, 4, hair);
    rect(5, 11, 3, 7, hair);
    rect(25, 10, 2, 8, hair);
    for (let i = 0; i < 4; i++) {
      const rise = face.hairline === "spiky" ? i % 2 * 2 : i;
      rect(7 + i * 5, 4 - rise, 3, 5, hair);
      rect(8 + i * 5, 6 - rise, 2, 2, hairLight);
    }
    if (face.hairline === "swept") rect(9, 9, 12, 2, skin);
  } else if (face.hairline === "bun") {
    rect(16, -2, 9, 3, ink);
    rect(14, 1, 13, 6, hair);
    rect(16, 1, 8, 2, hairLight);
    rect(5, 7, 23, 7, hair);
    rect(7, 12, 15, 3, hair);
    rect(6, 14, 2, 5, hair);
    rect(25, 12, 2, 7, hair);
    rect(8, 8, 14, 1, hairLight);
    rect(11, 10, 12, 1, hairLight);
  } else if (face.hairline === "cap") {
    rect(3, 4, 26, 9, "#454d65");
    rect(6, 2, 20, 5, "#798399");
    rect(8, 8, 16, 4, hair);
    rect(3, 12, 27, 3, "#59647e");
    rect(22, 12, 3, 3, "#d1d5d5");
    rect(5, 15, 2, 4, hair);
  } else if (face.hairline === "fedora") {
    rect(7, -3, 18, 3, ink);
    rect(5, 0, 23, 9, "#d4d5cd");
    rect(8, -1, 15, 7, "#f1ede0");
    rect(5, 7, 23, 4, ink);
    rect(0, 11, 32, 3, ink);
    rect(1, 10, 32, 2, "#edebdc");
    rect(4, 14, 3, 6, hair);
    rect(26, 14, 2, 8, hair);
  }
  const beard = face.beard;
  if (["full", "trimmed", "shaped", "chinstrap", "salt-pepper"].includes(beard)) {
    const beardColor = beard === "chinstrap" ? hairLight : hair;
    rect(16 - w + 2, 23, 3, 6, beardColor);
    rect(16 + w - 5, 23, 3, 6, beardColor);
    rect(16 - jaw, 29, jaw * 2, beard === "full" ? 6 : 4, beardColor);
    rect(16 - jaw + 3, 33, jaw * 2 - 6, beard === "full" ? 4 : 1, beardColor);
    rect(11, 25, 11, 2, hair);
    if (beard === "full") {
      rect(6, 26, 4, 5, hair);
      rect(23, 25, 3, 7, hair);
      rect(11, 32, 2, 3, hairLight);
    }
    if (["trimmed", "salt-pepper"].includes(beard)) {
      for (const [sx, sy] of [[7, 25], [25, 26], [11, 31], [21, 32], [17, 33]])
        rect(sx, sy, 1, 2, beard === "salt-pepper" ? "#c0b7a3" : hairLight);
    }
    if (beard === "chinstrap") rect(15, 29, 3, 3, hair);
  } else if (beard === "goatee") {
    rect(10, 25, 13, 2, hair);
    rect(9, 26, 3, 5, hair);
    rect(22, 26, 2, 5, hair);
    rect(12, 31, 11, 4, hair);
    rect(15, 29, 4, 4, hair);
  } else if (beard === "stubble") {
    for (const [sx, sy] of [[6, 25], [7, 28], [10, 30], [13, 32], [18, 32], [23, 30], [26, 26]])
      rect(sx, sy, 1, 1, hairLight);
    rect(12, 25, 9, 1, hairLight);
  }
  const browY = expression === "surprised" ? 14 : 16;
  for (const [eyeX, side] of [[8, 0], [20, 1]]) {
    rect(eyeX - 1, browY, 7, face.brow, hair);
    if (expression === "grumpy") rect(eyeX + (side ? 0 : 4), browY + 1, 3, 2, hair);
    if (expression === "worried") rect(eyeX + (side ? 0 : 4), browY - 1, 2, 2, hair);
    if (face.lenses) {
      rect(eyeX - 3, 17, 11, 7, ink);
      rect(eyeX - 2, 18, 9, 5, face.lenses);
      rect(eyeX - 1, 18, 3, 1, tint(face.lenses, 45));
    }
    const closed = expression === "blink" || expression === "hurt" || (expression === "wink" && side === 1);
    if (closed) rect(eyeX, 20, 5, 1, ink);
    else {
      rect(eyeX, 19, 5, 3, "#efe4d0");
      rect(eyeX + 2, 19, 3, 3, face.eyes);
      rect(eyeX + 3, 20, 1, 2, ink);
      rect(eyeX + 2, 19, 1, 1, "#fff4db");
    }
  }
  if (face.lenses) rect(15, 18, 3, 2, ink);
  rect(16, 21, 2, face.nose, light);
  rect(17, 21 + face.nose, 3, 1, shadow);
  rect(19, 23, 1, 2, shadow);
  const smile = expression === "happy" || expression === "wink" ? Math.max(2, face.smile) : face.smile;
  if (expression === "surprised" || expression === "worried") {
    rect(15, 27, 5, expression === "surprised" ? 4 : 2, ink);
  } else if (expression === "hurt" || expression === "grumpy") {
    rect(12, 28, 10, 2, ink);
    if (expression === "hurt") rect(13, 28, 8, 1, "#f2e5ce");
  } else {
    rect(11, 27, 12, 1, "#7f4a3c");
    rect(12, 28, 10, smile > 1 ? 2 : 1, "#7f4a3c");
    if (smile > 1) rect(12, 27, 10, smile === 3 ? 2 : 1, "#f6ead4");
    if (smile) rect(14, 30, 6, 1, light);
  }
  if (face.earring) rect(28, 24, 2, 3, "#c4d7df");
  ctx.restore();
}
