import fs from "node:fs";
import { ACCEL_TURN_CAP, REAL_DAY_TURNS, playGame, wasteRate, type GameReport } from "../src/sim/play.ts";

const games: { id: string; turns: number; label: string }[] = [
  { id: "sim6-day", turns: REAL_DAY_TURNS, label: "真实一天" },
  { id: "sim6-a", turns: ACCEL_TURN_CAP, label: "加速甲" },
  { id: "sim6-b", turns: ACCEL_TURN_CAP, label: "加速乙" },
  { id: "sim6-c", turns: ACCEL_TURN_CAP, label: "加速丙" },
  { id: "sim6-d", turns: ACCEL_TURN_CAP, label: "加速丁" },
  { id: "sim6-e", turns: ACCEL_TURN_CAP, label: "加速戊" },
];

const reports = games.map((game) => playGame(game.id, game.turns, game.label));
const json = JSON.stringify(reports.map(compact), null, 2);
const out = process.argv[2];
if (out) fs.writeFileSync(out, json);
console.log(json);

function compact(report: GameReport) {
  return {
    id: report.id,
    label: report.label,
    turns: report.turns,
    unified: report.unified,
    winner: report.winner,
    status: report.status,
    closeReason: report.closeReason,
    deaths: report.deaths,
    orders: report.orders,
    reliefUses: report.reliefUses,
    reliefSaved: report.reliefSaved,
    disasterGrain: report.disasterGrain,
    disasterTroops: report.disasterTroops,
    weather: report.weather,
    disasters: report.disasters,
    parseRejects: report.parseRejects,
    fuzzRejects: report.fuzzRejects,
    waste: Number(wasteRate(report).toFixed(3)),
    apSpent: report.apSpent,
    apCap: report.apCap,
    meaningful: report.meaningful,
    meaningfulPerTurn: Number((report.meaningful / Math.max(1, report.turns)).toFixed(2)),
    staleTurns: report.staleTurns,
    longestStale: report.longestStale,
    violations: report.violations.slice(0, 20),
    violationCount: report.violations.length,
    msTotal: Number(report.msTotal.toFixed(1)),
    msMax: Number(report.msMax.toFixed(2)),
    msAvg: Number((report.msTotal / Math.max(1, report.turns)).toFixed(2)),
    endCities: report.snaps.at(-1)?.cities,
    endTroops: report.snaps.at(-1)?.troops,
    endGrain: report.snaps.at(-1)?.grain,
    notes: report.notes,
  };
}
