import { locationFor } from "./career.js";

export const MANAGER_REQUESTS = [
  {
    subject: "Compensation raise request",
    message: "My responsibilities grew this quarter. Can we review my compensation?",
    actions: ["Schedule a pay review with HR", "Approve a raise within the team budget"],
  },
  {
    subject: "On-call burnout",
    message: "The rota has been heavy for weeks. I need a break from overnight pages.",
    actions: ["Rebalance the rota and grant recovery time", "Arrange backup coverage this week"],
  },
  {
    subject: "Blocked security alert",
    message: "The SOC found a suspicious login. Should we stop the rollout?",
    actions: ["Pause rollout and investigate", "Isolate the account and alert the SOC"],
  },
  {
    subject: "Release ownership",
    message: "Two teams think the other owns the release checklist. Who takes it?",
    actions: ["Assign one owner and a backup", "Bring both leads together to divide the checklist"],
  },
];

export function nearestManagerInteraction(g) {
  if (g.locationId !== "manager") return null;
  return locationFor("manager").interactions.find((item) =>
    Math.hypot(g.player.x - item.x, g.player.y - item.y) < 125) ?? null;
}

export function openManagerInteraction(g) {
  if (g.mode !== "playing") return null;
  const item = nearestManagerInteraction(g);
  if (!item) return null;
  g.mode = ({ computer: "manager_email", arcade: "manager_arcade",
    hr: "manager_hr", storage: "manager_storage", mining: "manager_mining" })[item.id];
  return item.id;
}

export const HR_HIRES = [
  { id: "people", name: "FIELD TECHNICIANS", cost: 100, description: "Unlock R to dispatch repairs and cover every station." },
  { id: "agent", name: "MONITORING AGENT", cost: 150, description: "Deploy an agent that collects patches and repairs damaged stations." },
];

export function hireManagerHelp(g, id) {
  if (g.locationId !== "manager" || g.mode !== "manager_hr") return false;
  const hire = HR_HIRES.find((item) => item.id === id);
  if (!hire || g.hiredHelp.includes(id) || g.hardwareBudget < hire.cost) return false;
  g.hardwareBudget -= hire.cost;
  g.hiredHelp.push(id);
  if (id === "agent" && !g.drone)
    g.drone = { x: g.player.x - 80, y: g.player.y + 70, targetId: null };
  return true;
}

export const NEW_EQUIPMENT = [
  { id: "workstations", name: "WORKSTATIONS", cost: 160 },
  { id: "servers", name: "SERVER RACK", cost: 220 },
  { id: "network", name: "NETWORK GEAR", cost: 300 },
];

export function decommissionMachine(g) {
  if (g.mode !== "manager_storage" || g.oldMachines <= 0) return false;
  g.oldMachines--;
  g.hardwareBudget += 60;
  return true;
}

export function buyEquipment(g, id) {
  if (g.mode !== "manager_storage") return false;
  const item = NEW_EQUIPMENT.find((entry) => entry.id === id);
  if (!item || g.newEquipment.includes(id) || g.hardwareBudget < item.cost) return false;
  g.hardwareBudget -= item.cost;
  g.newEquipment.push(id);
  return true;
}

export function collectBitcoin(g) {
  if (g.mode !== "manager_mining" || g.miningCooldown > 0 ||
      !g.bystanders.some((person) => ["nenad", "luis"].includes(person.characterId) &&
        person.roomId === "crypto_mining")) return false;
  g.bitcoins++;
  g.hardwareBudget += 120;
  g.miningCooldown = 12;
  return true;
}

export function openManagerRequest(g) {
  if (g.locationId !== "manager" || g.mode !== "playing" || g.pendingManagerRequest != null) return false;
  const person = g.bystanders.find((p) => p.requestIndex != null && !p.requestResolved &&
    Math.hypot(p.x - g.player.x, p.y - g.player.y) < 105);
  if (!person) return false;
  g.pendingManagerRequest = person.id;
  g.mode = "manager_request";
  return true;
}

export function resolveManagerRequest(g, actionIndex) {
  if (g.mode !== "manager_request") return false;
  const person = g.bystanders.find((p) => p.id === g.pendingManagerRequest);
  const request = person && MANAGER_REQUESTS[person.requestIndex];
  if (!request?.actions[actionIndex]) return false;
  person.requestResolved = true;
  person.roaming = true;
  g.pendingManagerRequest = null;
  g.score += 150;
  g.mode = "playing";
  return true;
}

export function answerManagerEmail(g, index, actionIndex) {
  if (g.mode !== "manager_email" || index !== g.managerEmailsAnswered ||
      actionIndex < 0 || actionIndex > 1 || index >= MANAGER_EMAILS.length) return false;
  g.managerEmailsAnswered++;
  g.score += 100;
  return true;
}

export const MANAGER_EMAILS = [
  { from: "HR", subject: "Salary review follow-up", body: "Please confirm how you will handle the compensation request.",
    actions: ["Send review notes and schedule a meeting", "Request a budget check before replying"] },
  { from: "SOC", subject: "Incident handoff", body: "We need an owner for the suspicious login investigation.",
    actions: ["Assign a responder and request an update", "Join the triage call and set a deadline"] },
  { from: "TEAM", subject: "Next sprint priorities", body: "Which work should be protected from the release crunch?",
    actions: ["Protect planned maintenance time", "Move lower priority work out of the sprint"] },
];
