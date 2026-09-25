import { LOCATIONS } from "./career.js";
import { getCharacter } from "./characters.js";

const whole = (value, maximum = 99999999) => Math.max(0, Math.min(maximum, Math.floor(Number(value) || 0)));

export function createPerformanceReport(game, won, rating = 0) {
  return {
    employee: game.player.characterId,
    location: game.locationId,
    won: Boolean(won),
    rating: won ? whole(rating, 3) : 0,
    score: whole(game.score),
    kills: whole(game.kills),
    seconds: whole(game.time),
    incidents: whole(game.objectives?.filter((objective) => objective.completed).length, 3),
    integrity: game.servers?.length
      ? whole(Math.round(game.servers.reduce((sum, server) => sum + server.hp, 0) / game.servers.length), 100)
      : 0,
  };
}

export function parsePerformanceReport(value) {
  if (!value || value.length > 1000) return null;
  try {
    const data = JSON.parse(value);
    if (!data || typeof data !== "object" || !Object.hasOwn(LOCATIONS, data.location) ||
        getCharacter(data.employee).id !== data.employee || typeof data.won !== "boolean") return null;
    for (const key of ["rating", "score", "kills", "seconds", "incidents", "integrity"])
      if (!Number.isInteger(data[key]) || data[key] < 0) return null;
    return {
      employee: data.employee, location: data.location, won: data.won,
      rating: data.won ? whole(data.rating, 3) : 0,
      score: whole(data.score), kills: whole(data.kills), seconds: whole(data.seconds),
      incidents: whole(data.incidents, 3), integrity: whole(data.integrity, 100),
    };
  } catch { return null; }
}

export function performanceReportUrl(report, pageUrl) {
  const url = new URL(pageUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("report", JSON.stringify(report));
  return url.href;
}

export function performanceReportText(report, url) {
  const employee = getCharacter(report.employee).name;
  const location = LOCATIONS[report.location].name;
  const duration = `${String(Math.floor(report.seconds / 60)).padStart(2, "0")}:${String(report.seconds % 60).padStart(2, "0")}`;
  return `HITECHIST EMPLOYEE PERFORMANCE REPORT\n${employee} · ${location}\n${report.won ? `SHIFT COMPLETE · ${"★".repeat(report.rating)}${"☆".repeat(3 - report.rating)}` : "SHIFT INTERRUPTED · REVIEW REQUIRED"}\nScore: ${report.score} · Incidents resolved: ${report.incidents}/3 · Processes killed: ${report.kills}\nSystems integrity: ${report.integrity}% · Time on call: ${duration}\n${url}`;
}
