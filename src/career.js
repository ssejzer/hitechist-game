// Fictional workplaces. Coordinates are navigation coordinates shared by the
// simulation, renderer, and minimap; room doors remain open navigation tiles.
export const LOCATIONS = {
  office: {
    id: "office", name: "SMALL OFFICE", width: 2200, height: 1540,
    start: { x: 1100, y: 770 },
    rooms: [{ id: "workspace", name: "WORKSPACE", x: 110, y: 110, width: 1980, height: 1320 }],
    doors: [{ x: 1100, y: 110 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 1870, y: 330 }, { x: 330, y: 1210 }, { x: 1870, y: 1210 }],
    equipment: [
      { id: "wifi", name: "WI-FI ROUTER", kind: "network", x: 550, y: 550 },
      { id: "windows", name: "WINDOWS PC", kind: "compute", x: 1540, y: 440 },
      { id: "mac", name: "MAC HEADSET", kind: "storage", x: 1610, y: 1080 },
    ],
    waves: [
      { name: "WI-FI DROPOUT", tagline: "Reach the router and hold E to restore Wi-Fi.", duration: 24, interval: 2.1, objective: "wifi" },
      { name: "BLUE SCREEN", tagline: "Reach the Windows PC and hold E to clear the crash.", duration: 28, interval: 1.8, objective: "windows" },
      { name: "OFFICE OUTAGE", tagline: "Pair the Mac headset, then contain the outage.", duration: 32, interval: 1.55, objective: "mac" },
    ],
    next: "call_center",
  },
  call_center: {
    id: "call_center", name: "CALL-CENTER IT", width: 2860, height: 1760,
    start: { x: 650, y: 880 },
    rooms: [
      { id: "open_space", name: "EMPLOYEE OPEN SPACE", x: 110, y: 110, width: 1320, height: 1540 },
      { id: "comms", name: "COMMUNICATIONS ROOM", x: 1540, y: 110, width: 1210, height: 1540 },
    ],
    doors: [{ x: 1485, y: 880 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 2530, y: 330 }, { x: 330, y: 1430 }, { x: 2530, y: 1430 }],
    equipment: [
      { id: "ethernet", name: "ETHERNET", kind: "network", x: 540, y: 540 },
      { id: "printer", name: "PRINTER", kind: "compute", x: 1050, y: 1260 },
      { id: "access", name: "ACCESS CARD", kind: "storage", x: 2190, y: 790 },
    ],
    waves: [
      { name: "ETHERNET DOWN", tagline: "Reconnect the Ethernet port with E.", duration: 24, interval: 2.1, objective: "ethernet" },
      { name: "PRINTER JAM", tagline: "Clear the jam under wave pressure.", duration: 28, interval: 1.8, objective: "printer" },
      { name: "PEAK CALLS", tagline: "Activate the access card, then survive peak calls.", duration: 32, interval: 1.55, objective: "access" },
    ],
  },
};

export const locationFor = (id) => LOCATIONS[id] || null;
