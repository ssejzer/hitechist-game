import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { createPerformanceReport, parsePerformanceReport, performanceReportText,
  performanceReportUrl, performanceShareUrl } from "../src/report.js";

test("performance report captures the finished shift and survives a share link", () => {
  const game = createGame(undefined, "office", "sebastian");
  game.score = 4820;
  game.kills = 32;
  game.time = 125.8;
  game.objectives[0].completed = true;
  game.objectives[1].completed = true;
  game.servers[0].hp = 40;
  const report = createPerformanceReport(game, true, 2);
  const link = performanceReportUrl(report, "https://example.com/game/?test=1#foo");
  const url = new URL(link);
  assert.equal(url.searchParams.has("test"), false);
  assert.equal(url.hash, "");
  assert.deepEqual(parsePerformanceReport(url.searchParams.get("report")), report);
  assert.match(performanceReportText(report, link), /Sebastian · SMALL OFFICE/);
  assert.match(performanceReportText(report, link), /Incidents resolved: 2\/3/);
  const share = new URL(performanceShareUrl(report, "https://example.com/root-access/?test=1"));
  assert.equal(share.pathname, "/root-access/share.php");
  assert.deepEqual(parsePerformanceReport(share.searchParams.get("report")), report);
});

test("invalid shared reports are ignored", () => {
  assert.equal(parsePerformanceReport("not-json"), null);
  assert.equal(parsePerformanceReport(JSON.stringify({ employee: "bad", location: "office", won: true })), null);
  assert.equal(parsePerformanceReport(JSON.stringify({ employee: "sebastian", location: "bad", won: true })), null);
});
