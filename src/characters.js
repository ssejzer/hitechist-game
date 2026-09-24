// Cosmetic choices only: every engineer has the same arcade abilities.
export const CHARACTERS = [
  { id: "sebastian", name: "Sebastian", shirt: "#e0e7d3", skin: "#dca479", hair: "#192b29", beard: true, glasses: true, hat: "fedora" },
  { id: "yaroslav", name: "Yaroslav", shirt: "#15635d", skin: "#e2ad8c", hair: "#49352d", beard: true, short: true },
  { id: "juan-ignacio", name: "Juan Ignacio", shirt: "#253958", skin: "#d5a082", hair: "#39342d", glasses: true },
  { id: "erez", name: "Erez", shirt: "#d9d9d0", skin: "#d6a071", hair: "#5d452c", beard: true },
  { id: "luis", name: "Luis", shirt: "#bfb1b7", skin: "#b98060", hair: "#302d2c", short: true },
  { id: "nenad", name: "Nenad", shirt: "#34363e", skin: "#d8a383", hair: "#49382e", short: true },
  { id: "elad", name: "Elad", shirt: "#37607b", skin: "#ce967c", hair: "#252e38", beard: true },
  { id: "rotem", name: "Rotem", shirt: "#723e47", skin: "#c69570", hair: "#39352c", beard: true, hat: "bun" },
  { id: "tal", name: "Tal", shirt: "#e3e0cf", skin: "#deb296", hair: "#64503b", beard: true, short: true },
  { id: "jason", name: "Jason", shirt: "#30394c", skin: "#d9ac89", hair: "#8d8274", beard: true, hat: "cap" },
  { id: "aldo", name: "Aldo", shirt: "#31394b", skin: "#c89d7e", hair: "#534334", short: true },
];

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
export const portraitPath = (character) => `assets/characters/${character.id}.png`;
