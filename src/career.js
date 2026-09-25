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
    next: "sysadmin",
  },
  sysadmin: {
    id: "sysadmin", name: "SYSADMIN", width: 3300, height: 2420,
    start: { x: 550, y: 550 },
    rooms: [
      { id: "server_a", name: "SERVER ROOM A", x: 110, y: 110, width: 990, height: 990 },
      { id: "server_b", name: "SERVER ROOM B", x: 1210, y: 110, width: 990, height: 990 },
      { id: "office_a", name: "OFFICE A", x: 2310, y: 110, width: 880, height: 990 },
      { id: "office_b", name: "OFFICE B", x: 110, y: 1210, width: 990, height: 1100 },
      { id: "office_c", name: "OFFICE C", x: 1210, y: 1210, width: 990, height: 1100 },
      { id: "conference", name: "CONFERENCE ROOM", x: 2310, y: 1210, width: 880, height: 1100 },
    ],
    doors: [{ x: 1100, y: 550 }, { x: 2200, y: 550 }, { x: 1100, y: 1700 }, { x: 2200, y: 1700 }, { x: 550, y: 1100 }, { x: 1650, y: 1100 }, { x: 2750, y: 1100 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 1800, y: 330 }, { x: 2970, y: 550 }, { x: 550, y: 1980 }],
    equipment: [
      { id: "okta", name: "OKTA PROVISIONING", kind: "network", x: 550, y: 550 },
      { id: "ad", name: "ACTIVE DIRECTORY", kind: "compute", x: 1650, y: 550 },
      { id: "bitlocker", name: "BITLOCKER TOKEN", kind: "storage", x: 2750, y: 550 },
      { id: "intune", name: "INTUNE RELAY", kind: "network", x: 550, y: 1650 },
      { id: "mail", name: "MICROSOFT 365 / EXCHANGE", kind: "compute", x: 1650, y: 1650 },
      { id: "dns", name: "DNS RESOLVER", kind: "network", x: 2750, y: 1650 },
    ],
    waves: [
      { name: "IDENTITY CHAIN", tagline: "Restart Okta, reconnect Active Directory, then unlock BitLocker.", duration: 32, interval: 2.2, steps: ["okta", "ad", "bitlocker"] },
      { name: "DEPLOYMENT BACKLOG", tagline: "Restore Intune, then clear the Exchange mail queue.", duration: 30, interval: 1.9, steps: ["intune", "mail"] },
      { name: "CASCADE FAILURE", tagline: "Repair DNS to stop the linked outage, then defeat the cascade.", duration: 34, interval: 1.6, steps: ["dns"] },
    ],
    next: "tech_lead",
  },
  tech_lead: {
    id: "tech_lead", name: "TECH LEAD", width: 6400, height: 3900,
    start: { x: 1075, y: 2400 }, support: true,
    rooms: [
      { id: "americas_office", name: "AMERICAS OFFICE", x: 300, y: 1600, width: 1550, height: 1650 },
      { id: "americas_datacenter", name: "AMERICAS DATACENTER", x: 300, y: 300, width: 1550, height: 1150 },
      { id: "emea_office", name: "EMEA OFFICE", x: 2450, y: 1600, width: 1550, height: 1650 },
      { id: "emea_datacenter", name: "EMEA DATACENTER", x: 2450, y: 300, width: 1550, height: 1150 },
      { id: "apac_office", name: "APAC OFFICE", x: 4600, y: 1600, width: 1550, height: 1650 },
      { id: "apac_datacenter", name: "APAC DATACENTER", x: 4600, y: 300, width: 1550, height: 1150 },
    ],
    doors: [
      { x: 1075, y: 1525 }, { x: 3225, y: 1525 }, { x: 5375, y: 1525 },
      { x: 1075, y: 3250 }, { x: 3225, y: 3250 }, { x: 5375, y: 3250 },
      { x: 1850, y: 850 }, { x: 2450, y: 850 },
      { x: 4000, y: 850 }, { x: 4600, y: 850 },
    ],
    spawnPoints: [{ x: 550, y: 2200 }, { x: 2800, y: 2200 }, { x: 5000, y: 2200 }, { x: 3225, y: 3500 }],
    equipment: [
      { id: "vpn", name: "VPN TUNNEL", kind: "network", x: 1075, y: 2400 },
      { id: "edr", name: "CROWDSTRIKE / EDR", kind: "compute", x: 3225, y: 2400 },
      { id: "vmware", name: "VMWARE HOST", kind: "compute", x: 5375, y: 800 },
      { id: "hyperv", name: "HYPER-V DATASTORE", kind: "storage", x: 1075, y: 800 },
      { id: "veeam", name: "VEEAM BACKUP", kind: "storage", x: 3225, y: 800 },
      { id: "rollout", name: "GLOBAL ROLLOUT", kind: "network", x: 5375, y: 2400 },
    ],
    waves: [
      { name: "REMOTE ACCESS", tagline: "Reconnect VPN and bring the EDR sensor online.", duration: 30, interval: 2.1, steps: ["vpn", "edr"] },
      { name: "VIRTUALIZATION", tagline: "Restore VMware and its Hyper-V datastore.", duration: 32, interval: 1.85, steps: ["vmware", "hyperv"] },
      { name: "GLOBAL ROLLOUT", tagline: "Verify Veeam, then stabilize the worldwide rollout.", duration: 36, interval: 1.6, steps: ["veeam", "rollout"] },
    ],
    next: "datacenter",
  },
  datacenter: {
    id: "datacenter", name: "AWS DATACENTER", width: 12800, height: 5100,
    start: { x: 1000, y: 900 }, travel: true, shuttleStopY: 3950, shuttleRoadY: 4500,
    rooms: [
      { id: "az_a", name: "AVAILABILITY ZONE A", x: 300, y: 400, width: 1400, height: 3300 },
      { id: "az_b", name: "AVAILABILITY ZONE B", x: 5700, y: 400, width: 1400, height: 3300 },
      { id: "az_c", name: "AVAILABILITY ZONE C", x: 11100, y: 400, width: 1400, height: 3300 },
    ],
    doors: [
      { x: 1000, y: 400 }, { x: 6400, y: 400 }, { x: 11800, y: 400 },
      { x: 1000, y: 3700 }, { x: 6400, y: 3700 }, { x: 11800, y: 3700 },
    ],
    spawnPoints: [{ x: 600, y: 800 }, { x: 6000, y: 800 }, { x: 11400, y: 800 }, { x: 1000, y: 3000 }],
    equipment: [
      { id: "parts", name: "SPARE PARTS", kind: "storage", x: 1000, y: 900 },
      { id: "rack_a", name: "ZONE A RACK", kind: "compute", x: 1000, y: 3000 },
      { id: "rack_b", name: "ZONE B RACK", kind: "compute", x: 6400, y: 900 },
      { id: "uplink", name: "ZONE B UPLINK", kind: "network", x: 6400, y: 3000 },
      { id: "rack_c", name: "ZONE C RACK", kind: "compute", x: 11800, y: 900 },
      { id: "backbone", name: "CROSS-ZONE BACKBONE", kind: "network", x: 11800, y: 3000 },
    ],
    waves: [
      { name: "PARTS RUN", tagline: "Collect spare parts and repair the first rack.", duration: 28, interval: 2.2, steps: ["parts", "rack_a"] },
      { name: "ZONE B FAILURE", tagline: "Drive to zone B; defend its rack and reconnect the uplink.", duration: 32, interval: 1.9, steps: ["rack_b", "uplink"] },
      { name: "MULTI-BUILDING OUTAGE", tagline: "Restore zone C and its backbone, then contain the outage.", duration: 36, interval: 1.6, steps: ["rack_c", "backbone"] },
    ],
    next: "manager",
  },
  manager: {
    id: "manager", name: "MANAGER", width: 16500, height: 5700,
    start: { x: 1850, y: 1450 }, support: true,
    rooms: [
      { id: "meetings", name: "MEETING ROOMS", x: 300, y: 250, width: 3100, height: 2400 },
      { id: "soc", name: "SOC ROOM", x: 3700, y: 250, width: 3100, height: 2400 },
      { id: "operations", name: "TEAM OPERATIONS", x: 7100, y: 250, width: 3100, height: 2400 },
      { id: "playroom", name: "PLAYROOM", x: 11450, y: 900, width: 1200, height: 1100 },
      { id: "private_office", name: "MY OFFICE", x: 300, y: 2950, width: 3100, height: 2400 },
      { id: "people", name: "HR OFFICE", x: 3700, y: 2950, width: 3100, height: 2400 },
      { id: "release", name: "RELEASE WAR ROOM", x: 7100, y: 2950, width: 3100, height: 2400 },
      { id: "lounge", name: "TEAM LOUNGE", x: 10500, y: 2950, width: 1450, height: 1050 },
      { id: "hardware_storage", name: "HARDWARE STORAGE", x: 12150, y: 2950, width: 1450, height: 1050 },
      { id: "kitchen", name: "KITCHEN", x: 10500, y: 4300, width: 1450, height: 1050 },
      { id: "bathroom", name: "BATHROOM", x: 12150, y: 4300, width: 1450, height: 1050 },
      { id: "conference", name: "CONFERENCE ROOM", x: 14100, y: 350, width: 2050, height: 2250 },
      { id: "crypto_mining", name: "CRYPTO MINING", x: 14100, y: 2950, width: 2050, height: 2400 },
    ],
    doors: [
      ...[3550, 6950, 10350].flatMap((x) => [{ x, y: 1450 }, { x, y: 4150 }]),
      ...[1850, 5250, 8650].map((x) => ({ x, y: 2800 })),
      { x: 12050, y: 2000 },
      ...[11225, 12875].flatMap((x) => [{ x, y: 2800 }, { x, y: 4150 }]),
      { x: 14100, y: 1500 }, { x: 14100, y: 4150 },
    ],
    spawnPoints: [{ x: 650, y: 650 }, { x: 5250, y: 700 }, { x: 8650, y: 800 }, { x: 12050, y: 4700 }],
    interactions: [
      { id: "computer", name: "EMAIL INBOX", x: 1850, y: 3700 },
      { id: "hr", name: "HIRE PEOPLE & AGENTS", x: 5250, y: 4500 },
      { id: "arcade", name: "PAC-MAN CABINET", x: 12050, y: 1450 },
      { id: "storage", name: "HARDWARE INVENTORY", x: 12875, y: 3500 },
      { id: "mining", name: "BITCOIN MINING", x: 15125, y: 3650 },
    ],
    equipment: [
      { id: "decision", name: "MEETING DECISION", kind: "compute", x: 1850, y: 950 },
      { id: "assignment", name: "TEAM ASSIGNMENT", kind: "network", x: 8650, y: 950 },
      { id: "unblocker", name: "SPRINT UNBLOCKER", kind: "storage", x: 5250, y: 3700 },
      { id: "deadline", name: "RELEASE DEADLINE", kind: "compute", x: 8650, y: 3700 },
    ],
    waves: [
      { name: "PLANNING MEETING", tagline: "Make a quick decision and assign the team under pressure.", duration: 340, interval: 1.45, steps: ["decision", "assignment"] },
      { name: "SPRINT BLOCKERS", tagline: "Collect the unblocker and protect the team's deadline.", duration: 380, interval: 1.2, steps: ["unblocker", "deadline"] },
      { name: "RELEASE WEEK", tagline: "Defend the deadline against a relentless interruption wave.", duration: 440, interval: 0.95, steps: ["deadline"] },
    ],
  },
};

// Each promotion opens up a larger workplace. Scale the complete layout so
// objectives, rooms, doors and spawn points keep the same relative placement.
const mapSizes = {
  office: [2200, 1540],
  call_center: [3100, 1900],
  sysadmin: [3900, 2900],
  tech_lead: [6400, 3900],
  datacenter: [12800, 5100],
  manager: [16500, 5700],
};
for (const location of Object.values(LOCATIONS)) {
  const [width, height] = mapSizes[location.id];
  const sx = width / location.width, sy = height / location.height;
  const point = (p) => { p.x *= sx; p.y *= sy; };
  location.rooms.forEach((room) => {
    room.x *= sx; room.y *= sy; room.width *= sx; room.height *= sy;
  });
  location.doors.forEach(point);
  location.spawnPoints.forEach(point);
  location.equipment.forEach(point);
  location.interactions?.forEach(point);
  point(location.start);
  location.width = width;
  location.height = height;
}

export const locationFor = (id) => LOCATIONS[id] || null;
