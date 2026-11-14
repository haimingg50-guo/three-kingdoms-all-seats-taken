import { POLEARMS } from "./gear";

export type SpectacleId = "blade-rain" | "grain-check" | "hammer";
export type SpectacleMode = "on" | "off" | "low";

export interface SpectacleCue {
  key?: string;
  turn: number;
  params?: Record<string, string>;
}

const DUEL_KEYS = new Set(["war.duel.live", "war.duel.death", "war.duel.draw"]);

function hasPolearm(params: Record<string, string> | undefined): boolean {
  const raw = `${params?.gearAtk ?? ""},${params?.gearDef ?? ""}`;
  return raw.split(",").some((id) => POLEARMS.has(id));
}

/** 只决定要不要演。不改任何数值。珍贵名器的第一件不走试锤。 */
export function pickSpectacle(entries: SpectacleCue[], weather: string | null): SpectacleId | null {
  if (entries.some((entry) => entry.key === "gear.forge.plain")) return "hammer";
  const duel = entries.find((entry) => entry.key && DUEL_KEYS.has(entry.key));
  if (duel && weather === "雨" && hasPolearm(duel.params)) return "blade-rain";
  const grain = entries.find((entry) => entry.key === "domestic.granary");
  if (grain && grain.turn % 4 === 0) return "grain-check";
  return null;
}

/** 外置视频只在「开」并且地址是 https 时加载。空地址、省流、关闭都回像素分镜。 */
export function videoUrlAllowed(mode: SpectacleMode, url: string | undefined | null): string | null {
  if (mode !== "on") return null;
  if (!url || !url.startsWith("https://")) return null;
  return url;
}

export function spectacleOutcome(id: SpectacleId, entries: SpectacleCue[]): string {
  if (id === "blade-rain") {
    const duel = entries.find((entry) => entry.key && DUEL_KEYS.has(entry.key));
    if (!duel || duel.key === "war.duel.draw") return "draw";
    if (duel.params?.winner && duel.params.winner === duel.params.atk) return "win";
    if (duel.params?.winner) return "lose";
    return "draw";
  }
  if (id === "hammer") return "plain";
  return "grain";
}
