/**
 * 山河图。相对方位，不是古代经纬度。
 *
 * 来源与许可
 * - 谭其骧主编《中国历史地图集》第三册（三国·西晋），中国地图出版社。
 *   只用来核对城在河的哪一侧、山的哪一侧。图版有版权，这里不描、不扫描、不量坐标。
 * - 陈寿《三国志》及裴松之注里的通道名：金牛道（南郑—成都）、褒斜 / 陈仓 / 子午（合称秦岭，长安—南郑）、
 *   三峡（江州—江陵）、汉水（南郑—襄阳—江陵）、潼关（长安—洛阳）、井陉（晋阳—邺）、方城（洛阳 / 许昌—襄阳）。
 * - 还在的地形：秦岭、大巴、太行、四川盆地、关中、华北平原。这些不是某一年的海岸线。
 * - 今地只作罗盘，不写成古坐标：成都在南郑西南，南郑在长安之南，长安在洛阳之西，
 *   许昌在洛阳东南，下邳更东，襄阳在南阳盆地，江陵在长江中游，建业在长江下游，
 *   邺在黄河北，晋阳在太行西。黄河下游在汉代的入海口不是今天的河道，图上只画到洛阳、邺之间的示意河段。
 *
 * 抽象（故意做的，不是漏测）
 * - 十二座城，不铺满全国。北平、武威、会稽、合肥、寿春、江夏、宛都不单列。
 * - 一条道路是一回合。秦岭、金牛、三峡、江陵到建业的江路，历史上都要走许多天，规则仍是一格。
 *   回合时长不因此改。没有这条路的两城，不能一回走到。
 * - 距离被压短，好让名字能读。成都到许昌比成都到江州远，也比洛阳到许昌远。
 * - 海岸、河口和河身的弯曲是为了读图排出来的示意，不是测量过的古海岸，也不是复原出来的古河道。
 * - 图是本项目手绘的插画，画在这些位置上。没有商业游戏的地图或贴图，也没有把别的底图贴进来。代码随仓库 AGPL-3.0。
 */

export interface RiverCity {
  id: string;
  name: string;
  region: string;
  x: number;
  y: number;
  capital?: boolean;
}

export type RoadKind = "road" | "pass" | "ford";

export interface RiverRoad {
  a: string;
  b: string;
  kind: RoadKind;
  note: string;
}

/** 北在上，东在右。数字是这张示意图上的位置，不是经纬度。 */
export const RIVER_CITIES: RiverCity[] = [
  { id: "jinyang", name: "晋阳", region: "并州", x: 36, y: 14 },
  { id: "ye", name: "邺城", region: "冀州", x: 56, y: 12 },
  { id: "changan", name: "长安", region: "司隶", x: 28, y: 38 },
  { id: "luoyang", name: "洛阳", region: "司隶", x: 48, y: 36, capital: true },
  { id: "xuchang", name: "许昌", region: "豫州", x: 60, y: 46 },
  { id: "xiapi", name: "下邳", region: "徐州", x: 78, y: 40 },
  { id: "nanzheng", name: "南郑", region: "益州", x: 30, y: 52 },
  { id: "xiangyang", name: "襄阳", region: "荆州", x: 52, y: 58 },
  { id: "chengdu", name: "成都", region: "益州", x: 16, y: 70 },
  { id: "jiangzhou", name: "江州", region: "益州", x: 32, y: 74 },
  { id: "jiangling", name: "江陵", region: "荆州", x: 52, y: 74 },
  { id: "jianye", name: "建业", region: "扬州", x: 80, y: 66 },
];

/**
 * 无向。kind 为 ford 的才进天气里的渡口表。pass 只是山路画法，不另改行军规则。
 * 黄河示意线在 y=27 一带：邺、晋阳在北，长安、洛阳在南。
 */
export const RIVER_ROADS: RiverRoad[] = [
  { a: "jinyang", b: "ye", kind: "pass", note: "井陉" },
  { a: "jinyang", b: "changan", kind: "ford", note: "蒲津" },
  { a: "ye", b: "luoyang", kind: "ford", note: "河阳" },
  { a: "ye", b: "xuchang", kind: "ford", note: "黄河" },
  { a: "changan", b: "luoyang", kind: "pass", note: "潼关" },
  { a: "changan", b: "nanzheng", kind: "pass", note: "秦岭" },
  { a: "luoyang", b: "xuchang", kind: "road", note: "" },
  { a: "luoyang", b: "xiangyang", kind: "pass", note: "方城" },
  { a: "xuchang", b: "xiangyang", kind: "pass", note: "方城" },
  { a: "xuchang", b: "xiapi", kind: "road", note: "" },
  { a: "xiapi", b: "jianye", kind: "ford", note: "淮河" },
  { a: "nanzheng", b: "chengdu", kind: "pass", note: "金牛" },
  { a: "nanzheng", b: "xiangyang", kind: "ford", note: "汉水" },
  { a: "chengdu", b: "jiangzhou", kind: "road", note: "" },
  { a: "jiangzhou", b: "jiangling", kind: "ford", note: "三峡" },
  { a: "xiangyang", b: "jiangling", kind: "ford", note: "汉水" },
  { a: "jiangling", b: "jianye", kind: "ford", note: "长江" },
];

/** 这些直线会翻过没有城的山脉，或把盆地和中原焊在一起。山河图里不许出现。 */
export const FORBIDDEN_ROADS: [string, string][] = [
  ["chengdu", "xuchang"],
  ["chengdu", "luoyang"],
  ["chengdu", "jianye"],
  ["chengdu", "xiangyang"],
  ["chengdu", "changan"],
  ["chengdu", "jiangling"],
  ["nanzheng", "jiangzhou"],
  ["nanzheng", "xuchang"],
  ["nanzheng", "luoyang"],
  ["changan", "xiangyang"],
  ["changan", "jiangling"],
  ["xuchang", "jianye"],
  ["xuchang", "jiangling"],
  ["luoyang", "jianye"],
  ["jinyang", "xuchang"],
];

/** 城数从 12 往下减时，先拿掉边角，留下都城和三条回家的路。 */
const DROP_FIRST = ["jinyang", "xiapi", "jiangzhou", "ye"];

export const SCHEMATIC = {
  yellowY: 27,
  yangtzeY: 74,
};

export function namedRoad(a: string, b: string): RiverRoad | null {
  return RIVER_ROADS.find((road) => (road.a === a && road.b === b) || (road.a === b && road.b === a)) ?? null;
}

export function riverBoard(count: number): { cities: RiverCity[]; links: Record<string, string[]> } {
  const extra = Math.max(0, RIVER_CITIES.length - Math.min(Math.max(count, 1), RIVER_CITIES.length));
  const drop = new Set(DROP_FIRST.slice(0, extra));
  const cities = RIVER_CITIES.filter((city) => !drop.has(city.id));
  const ids = new Set(cities.map((city) => city.id));
  const links: Record<string, string[]> = {};
  for (const city of cities) links[city.id] = [];
  for (const road of RIVER_ROADS) {
    if (!ids.has(road.a) || !ids.has(road.b)) continue;
    links[road.a]!.push(road.b);
    links[road.b]!.push(road.a);
  }
  return { cities, links };
}

export const FORD_PAIRS: [string, string][] = RIVER_ROADS.filter((road) => road.kind === "ford").map((road) => [road.a, road.b]);

export function mapBoard(cities: { id: string; links: string[] }[]): "rivers" | "teaching" | "saved" {
  const by = new Map(cities.map((city) => [city.id, city]));
  const linked = (a: string, b: string) => Boolean(by.get(a)?.links.includes(b) || by.get(b)?.links.includes(a));
  if (linked("chengdu", "xuchang") || linked("chengdu", "luoyang")) return "teaching";
  const ids = new Set(cities.map((city) => city.id));
  if (ids.has("nanzheng") && ids.has("chengdu") && !linked("chengdu", "changan") && !linked("chengdu", "xiangyang")) {
    return "rivers";
  }
  return "saved";
}

export function routeHops(cities: { id: string; links: string[] }[], from: string, to: string): number | null {
  if (from === to) return 0;
  const by = new Map(cities.map((city) => [city.id, city]));
  const seen = new Set<string>([from]);
  let edge = [from];
  for (let hop = 1; edge.length > 0; hop += 1) {
    const next: string[] = [];
    for (const id of edge) {
      for (const link of by.get(id)?.links ?? []) {
        if (seen.has(link)) continue;
        if (link === to) return hop;
        seen.add(link);
        next.push(link);
      }
    }
    edge = next;
  }
  return null;
}

export type RoadRead = "move" | "look" | "plain";

/** 金线只给从驻地出发、这一回能移驻的友方路。选中别的城只是在看。 */
export function readRoad(input: {
  a: string;
  b: string;
  friend: boolean;
  stationId: string | null;
  selectedId: string | null;
}): RoadRead {
  const touchesStation = input.stationId != null && (input.a === input.stationId || input.b === input.stationId);
  if (input.friend && touchesStation) return "move";
  const touchesSelected = input.selectedId != null && (input.a === input.selectedId || input.b === input.selectedId);
  if (touchesSelected) return "look";
  return "plain";
}

export function forbiddenHits(cities: { id: string; links: string[] }[]): [string, string][] {
  const by = new Map(cities.map((city) => [city.id, city]));
  return FORBIDDEN_ROADS.filter(([a, b]) => by.get(a)?.links.includes(b) || by.get(b)?.links.includes(a));
}
