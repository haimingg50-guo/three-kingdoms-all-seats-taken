import { FORD_PAIRS } from "./land";
import { hashSeed, mulberry32 } from "./names";
import { CLASSIC } from "./config";
import type {
  City,
  CityWorks,
  ClimateConfig,
  DisasterName,
  ReliefConfig,
  SeasonName,
  TianxiaConfig,
  WeatherName,
  WorldState,
} from "./types";

export const SEASONS: SeasonName[] = ["春", "夏", "秋", "冬"];

/**
 * 每季十档，公开、固定。抽到第几档只取决于局号、回合和种子。
 * 晴可以有很小的屯田加成。雾不计结算。雨只为难渡口。旱减产。雪加重冬日行军。
 */
export const WEATHER_TABLE: Record<SeasonName, WeatherName[]> = {
  春: ["晴", "晴", "晴", "晴", "晴", "雨", "雨", "雨", "雾", "雾"],
  夏: ["晴", "晴", "晴", "晴", "雨", "雨", "雨", "旱", "旱", "雾"],
  秋: ["晴", "晴", "晴", "晴", "晴", "雾", "雾", "雾", "雨", "雨"],
  冬: ["雪", "雪", "雪", "雪", "雪", "晴", "晴", "晴", "雾", "雾"],
};

export const DISASTERS: DisasterName[] = ["旱", "涝", "蝗", "瘟疫"];

/** 合计行军折损不超过这个比例，避免天气压过出征本身的判断。 */
export const MARCH_LOSS_CAP = 0.2;

/** 渡口只认山河图里真正过河的边。山路不算渡口。旧档已写好的 fords 不会在这里被改写。 */
export const RIVER_PAIRS: [string, string][] = FORD_PAIRS;

export interface SkyReport {
  turn: number;
  season: SeasonName;
  weather: WeatherName | "不计";
  disaster: DisasterName | null;
  seed: string;
  slot: number;
  label: string;
  hint: string;
}

export function climateSeedFor(id: string, openedAt: string): string {
  return hashSeed(`${id}:${openedAt}:climate`).toString(16).padStart(8, "0");
}

export function seasonOf(turn: number): SeasonName {
  const index = ((Math.max(1, turn) - 1) % 4 + 4) % 4;
  return SEASONS[index]!;
}

export function isFord(origin: City, targetId: string): boolean {
  return origin.fords?.includes(targetId) ?? false;
}

export function applyFords(cities: City[], topology: TianxiaConfig["world"]["map_topology"]) {
  for (const city of cities) {
    const found = new Set<string>();
    for (const link of city.links) {
      const listed = RIVER_PAIRS.some(
        ([a, b]) => (a === city.id && b === link) || (b === city.id && a === link),
      );
      if (listed) found.add(link);
    }
    if (topology === "random_abstract") {
      const ys = cities.map((item) => item.y).sort((a, b) => a - b);
      const mid = ys[Math.floor(ys.length / 2)] ?? 50;
      for (const link of city.links) {
        const other = cities.find((item) => item.id === link);
        if (!other) continue;
        if ((city.y - mid) * (other.y - mid) < 0) found.add(link);
      }
    }
    city.fords = [...found];
  }
}

export function normalizeClimate(state: WorldState) {
  if (!state.config.climate) {
    state.config.climate = {
      enabled: true,
      snow_march_loss: 0.08,
      winter_march_loss: 0.04,
      rain_ford_loss: 0.05,
      flood_ford_loss: 0.08,
      drought_farm_factor: 0.75,
      winter_farm_factor: 0.9,
      fair_farm_bonus: 0.06,
      disasters_enabled: true,
      disaster_permille: 35,
      disaster_grain_loss: 0.08,
      disaster_troop_loss: 0.04,
    };
  }
  if (!state.climateSeed) state.climateSeed = climateSeedFor(state.id, state.openedAt || state.id);
  if (state.cities.some((city) => !city.fords)) {
    applyFords(state.cities, state.config.world.map_topology);
  }
  if (!state.config.relief) state.config.relief = structuredClone(CLASSIC.relief);
  if (!state.config.deeds) state.config.deeds = structuredClone(CLASSIC.deeds);
  if (!state.trust) state.trust = [];
  if (!state.bonds) state.bonds = [];
  for (const role of state.roles) {
    if (role.captiveOf === undefined) role.captiveOf = null;
  }
  for (const city of state.cities) ensureWorks(city);
}

const BOUNTY_CODES = ["dike", "granary", "clinic", "relief"] as const;

export function bountyWhat(code: (typeof BOUNTY_CODES)[number]): string {
  if (code === "dike") return "任一城堤防达到 2 级";
  if (code === "granary") return "任一城义仓达到 200";
  if (code === "clinic") return "任一城医营达到 2 级";
  return "有人完成一次赈济";
}

/** 本季悬赏只由种子和季节决定。开季条件已经成立则记为了结，避免白拿功。 */
export function plannedBounty(state: WorldState, turn = state.turn): NonNullable<WorldState["bounty"]> {
  const sky = forecast(state, turn);
  const code = BOUNTY_CODES[Math.abs(hashSeed(`${state.climateSeed}:${sky.season}`)) % BOUNTY_CODES.length]!;
  const already = code !== "relief" && state.cities.some((city) => {
    const works = city.works;
    if (code === "dike") return (works?.dike ?? 0) >= 2;
    if (code === "granary") return (works?.granary ?? 0) >= 200;
    return (works?.clinic ?? 0) >= 2;
  });
  return { season: sky.season, code, claimed: already, sinceTurn: turn };
}

export function bountyAnnouncement(state: WorldState, bounty: NonNullable<WorldState["bounty"]>): string {
  const what = bountyWhat(bounty.code);
  return bounty.claimed
    ? `${bounty.season}季悬赏本是「${what}」，开季时已经达成，不重复发功。`
    : `${bounty.season}季悬赏：${what}。本季内先达成者，若君主在席则记功 ${state.config.deeds.bounty_merit}。空席不领功。`;
}

export function ensureWorks(city: City): CityWorks {
  if (!city.works) {
    city.works = { dike: 0, dikeIdle: 0, granary: 0, clinic: 0, plague: 0, canal: 0, canalIdle: 0, roads: [] };
  }
  if (!city.works.roads) city.works.roads = [];
  return city.works;
}

export function grainShock(city: City, relief: ReliefConfig, climate: ClimateConfig, sky: SkyReport) {
  const works = ensureWorks(city);
  const cut = sky.disaster === "涝" ? Math.min(0.8, works.dike * relief.dike_grain_cut) : 0;
  const without = Math.floor(city.grain * climate.disaster_grain_loss);
  const afterDike = Math.floor(city.grain * climate.disaster_grain_loss * (1 - cut));
  const covered = Math.min(works.granary, afterDike);
  return { without, afterDike, covered, net: afterDike - covered, dikeSaved: without - afterDike };
}

export function troopShock(city: City, relief: ReliefConfig, climate: ClimateConfig, ratio = 1) {
  const works = ensureWorks(city);
  const cut = Math.min(0.75, works.clinic * relief.clinic_plague_cut);
  const without = Math.floor(city.troops * climate.disaster_troop_loss * ratio);
  const net = Math.floor(city.troops * climate.disaster_troop_loss * (1 - cut) * ratio);
  return { without, net, clinicSaved: without - net };
}

export function roadOpen(city: City, otherId: string) {
  return ensureWorks(city).roads.some((road) => road.to === otherId);
}

export function forecast(state: Pick<WorldState, "id" | "climateSeed" | "config">, turn: number): SkyReport {
  const season = seasonOf(turn);
  const seed = state.climateSeed || climateSeedFor(state.id, state.id);
  if (!state.config.climate?.enabled) {
    return {
      turn,
      season,
      weather: "不计",
      disaster: null,
      seed,
      slot: -1,
      label: `${season} · 不计`,
      hint: "本局关闭了天时，天气不改结算。",
    };
  }
  const rng = mulberry32(hashSeed(`${state.id}:${turn}:${seed}`));
  const table = WEATHER_TABLE[season];
  const slot = Math.floor(rng() * table.length);
  const weather = table[slot]!;
  let disaster: DisasterName | null = null;
  if (state.config.climate.disasters_enabled) {
    const roll = Math.floor(rng() * 1000);
    if (roll < state.config.climate.disaster_permille) {
      disaster = DISASTERS[Math.floor(rng() * DISASTERS.length)]!;
    }
  }
  return {
    turn,
    season,
    weather,
    disaster,
    seed,
    slot,
    label: disaster ? `${season} · ${weather} · ${disaster}` : `${season} · ${weather}`,
    hint: hintFor(weather, season, disaster),
  };
}

function hintFor(weather: WeatherName, season: SeasonName, disaster: DisasterName | null): string {
  const parts: string[] = [];
  if (season === "冬") parts.push(weather === "雪" ? "雪天行军折损更高，冬田略减产" : "冬日行军略有折损，冬田略减产");
  else if (weather === "晴") parts.push("晴天屯田略增，战力不加");
  else if (weather === "雨") parts.push("雨天渡河、沿河更难");
  else if (weather === "旱") parts.push("旱天屯田减产");
  else parts.push("雾不影响结算");
  if (disaster === "瘟疫") parts.push("瘟疫只减兵力");
  else if (disaster === "涝") parts.push("涝再加重渡口");
  else if (disaster) parts.push(`天灾「${disaster}」只减粮`);
  return parts.join("。") + "。";
}

export function marchLossRate(
  config: ClimateConfig,
  sky: SkyReport,
  ford: boolean,
  protect?: { dike?: number; dikeCut?: number; road?: boolean; roadCut?: number },
): number {
  if (!config.enabled || sky.weather === "不计") return 0;
  let winter = 0;
  if (sky.season === "冬") {
    winter += sky.weather === "雪" ? config.snow_march_loss : config.winter_march_loss;
  }
  let wet = 0;
  if (ford && sky.weather === "雨") wet += config.rain_ford_loss;
  if (ford && sky.disaster === "涝") wet += config.flood_ford_loss;
  const dike = Math.max(0, protect?.dike ?? 0);
  const dikeCut = protect?.dikeCut ?? 0.2;
  if (dike > 0 && wet > 0) {
    wet *= 1 - Math.min(0.75, dike * dikeCut);
  }
  if (protect?.road) {
    const keep = 1 - Math.min(0.6, protect.roadCut ?? 0.4);
    winter *= keep;
    wet *= keep;
  }
  return Math.min(MARCH_LOSS_CAP, Math.max(0, winter + wet));
}

export function farmFactor(
  config: ClimateConfig,
  sky: SkyReport,
  canal = 0,
  canalEase = 0.08,
): { factor: number; note: string } {
  if (!config.enabled || sky.weather === "不计") return { factor: 1, note: "" };
  if (sky.weather === "旱") {
    const ease = Math.max(0, canal) * canalEase;
    const factor = Math.min(1, config.drought_farm_factor + ease);
    if (canal > 0 && factor < 1) return { factor, note: "canal_partial" };
    if (canal > 0) return { factor: 1, note: "canal_full" };
    return { factor, note: "drought" };
  }
  if (sky.season === "冬") return { factor: config.winter_farm_factor, note: "winter" };
  if (sky.weather === "晴") return { factor: 1 + config.fair_farm_bonus, note: "fair" };
  return { factor: 1, note: "" };
}
