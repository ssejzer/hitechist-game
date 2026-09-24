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
    id: "tech_lead", name: "TECH LEAD", width: 3300, height: 1980,
    start: { x: 550, y: 550 },
    travel: true,
    rooms: [
      { id: "americas", name: "AMERICAS SITE", x: 110, y: 110, width: 990, height: 1760 },
      { id: "emea", name: "EMEA SITE", x: 1210, y: 110, width: 990, height: 1760 },
      { id: "apac", name: "APAC SITE", x: 2310, y: 110, width: 880, height: 1760 },
    ],
    doors: [{ x: 1100, y: 990 }, { x: 2200, y: 990 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 1650, y: 330 }, { x: 2970, y: 330 }, { x: 550, y: 1650 }],
    equipment: [
      { id: "vpn", name: "VPN TUNNEL", kind: "network", x: 550, y: 550 },
      { id: "edr", name: "CROWDSTRIKE / EDR", kind: "compute", x: 1650, y: 550 },
      { id: "vmware", name: "VMWARE HOST", kind: "compute", x: 2750, y: 550 },
      { id: "hyperv", name: "HYPER-V DATASTORE", kind: "storage", x: 550, y: 1430 },
      { id: "veeam", name: "VEEAM BACKUP", kind: "storage", x: 1650, y: 1430 },
      { id: "rollout", name: "GLOBAL ROLLOUT", kind: "network", x: 2750, y: 1430 },
    ],
    waves: [
      { name: "REMOTE ACCESS", tagline: "Reconnect VPN and bring the EDR sensor online.", duration: 30, interval: 2.1, steps: ["vpn", "edr"] },
      { name: "VIRTUALIZATION", tagline: "Restore VMware and its Hyper-V datastore.", duration: 32, interval: 1.85, steps: ["vmware", "hyperv"] },
      { name: "GLOBAL ROLLOUT", tagline: "Verify Veeam, then stabilize the worldwide rollout.", duration: 36, interval: 1.6, steps: ["veeam", "rollout"] },
    ],
    next: "datacenter",
  },
  datacenter: {
    id: "datacenter", name: "AWS DATACENTER", width: 4290, height: 2530,
    start: { x: 550, y: 550 }, travel: true,
    rooms: [
      { id: "az_a", name: "AVAILABILITY ZONE A", x: 110, y: 110, width: 990, height: 1650 },
      { id: "az_b", name: "AVAILABILITY ZONE B", x: 1650, y: 110, width: 990, height: 1650 },
      { id: "az_c", name: "AVAILABILITY ZONE C", x: 3190, y: 110, width: 990, height: 1650 },
    ],
    doors: [{ x: 605, y: 1760 }, { x: 2145, y: 1760 }, { x: 3685, y: 1760 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 1870, y: 330 }, { x: 3410, y: 330 }, { x: 550, y: 1430 }],
    equipment: [
      { id: "parts", name: "SPARE PARTS", kind: "storage", x: 550, y: 550 },
      { id: "rack_a", name: "ZONE A RACK", kind: "compute", x: 550, y: 1430 },
      { id: "rack_b", name: "ZONE B RACK", kind: "compute", x: 2145, y: 550 },
      { id: "uplink", name: "ZONE B UPLINK", kind: "network", x: 2145, y: 1430 },
      { id: "rack_c", name: "ZONE C RACK", kind: "compute", x: 3685, y: 550 },
      { id: "backbone", name: "CROSS-ZONE BACKBONE", kind: "network", x: 3685, y: 1430 },
    ],
    waves: [
      { name: "PARTS RUN", tagline: "Collect spare parts and repair the first rack.", duration: 28, interval: 2.2, steps: ["parts", "rack_a"] },
      { name: "ZONE B FAILURE", tagline: "Drive to zone B; defend its rack and reconnect the uplink.", duration: 32, interval: 1.9, steps: ["rack_b", "uplink"] },
      { name: "MULTI-BUILDING OUTAGE", tagline: "Restore zone C and its backbone, then contain the outage.", duration: 36, interval: 1.6, steps: ["rack_c", "backbone"] },
    ],
    next: "manager",
  },
  manager: {
    id: "manager", name: "MANAGER", width: 2860, height: 1760,
    start: { x: 550, y: 550 },
    rooms: [
      { id: "meetings", name: "MEETING ROOMS", x: 110, y: 110, width: 1320, height: 1540 },
      { id: "operations", name: "TEAM OPERATIONS FLOOR", x: 1540, y: 110, width: 1210, height: 1540 },
    ],
    doors: [{ x: 1485, y: 880 }],
    spawnPoints: [{ x: 330, y: 330 }, { x: 2530, y: 330 }, { x: 330, y: 1430 }, { x: 2530, y: 1430 }],
    equipment: [
      { id: "decision", name: "MEETING DECISION", kind: "compute", x: 550, y: 550 },
      { id: "assignment", name: "TEAM ASSIGNMENT", kind: "network", x: 2150, y: 550 },
      { id: "unblocker", name: "SPRINT UNBLOCKER", kind: "storage", x: 550, y: 1320 },
      { id: "deadline", name: "RELEASE DEADLINE", kind: "compute", x: 2150, y: 1320 },
    ],
    waves: [
      { name: "PLANNING MEETING", tagline: "Make a quick decision and assign the team under pressure.", duration: 34, interval: 1.45, steps: ["decision", "assignment"] },
      { name: "SPRINT BLOCKERS", tagline: "Collect the unblocker and protect the team's deadline.", duration: 38, interval: 1.2, steps: ["unblocker", "deadline"] },
      { name: "RELEASE WEEK", tagline: "Defend the deadline against a relentless interruption wave.", duration: 44, interval: 0.95, steps: ["deadline"] },
    ],
  },
};

export const locationFor = (id) => LOCATIONS[id] || null;
