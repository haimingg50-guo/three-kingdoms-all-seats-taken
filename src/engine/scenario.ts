import { applyFords, climateSeedFor, plannedBounty } from "./climate";
import { buildConfig, turnDurationMs } from "./config";
import { citizenName, hashSeed, mulberry32 } from "./names";
import type { City, Faction, Role, WorldKind, WorldState } from "./types";

interface RosterEntry {
  id: string;
  name: string;
  faction: "wei" | "shu" | "wu" | null;
  office: "lord" | "general" | "advisor" | "wanderer";
  prowess: number;
  intellect: number;
  command: number;
  reserve?: boolean;
}

/** 能力值是为本实验新写的 1–20 刻度，不取自任何商业游戏的数值表。 */
export const ROSTER: RosterEntry[] = [
  { id: "cao-cao", name: "曹操", faction: "wei", office: "lord", prowess: 14, intellect: 18, command: 17 },
  { id: "xiahou-dun", name: "夏侯惇", faction: "wei", office: "general", prowess: 16, intellect: 10, command: 14 },
  { id: "xun-yu", name: "荀彧", faction: "wei", office: "advisor", prowess: 5, intellect: 19, command: 13 },
  { id: "guo-jia", name: "郭嘉", faction: "wei", office: "advisor", prowess: 4, intellect: 19, command: 11 },
  { id: "liu-bei", name: "刘备", faction: "shu", office: "lord", prowess: 13, intellect: 14, command: 13 },
  { id: "guan-yu", name: "关羽", faction: "shu", office: "general", prowess: 19, intellect: 14, command: 16 },
  { id: "zhang-fei", name: "张飞", faction: "shu", office: "general", prowess: 18, intellect: 7, command: 14 },
  { id: "zhuge-liang", name: "诸葛亮", faction: "shu", office: "advisor", prowess: 6, intellect: 20, command: 16 },
  { id: "sun-quan", name: "孙权", faction: "wu", office: "lord", prowess: 12, intellect: 16, command: 14 },
  { id: "zhou-yu", name: "周瑜", faction: "wu", office: "general", prowess: 14, intellect: 18, command: 17 },
  { id: "lu-su", name: "鲁肃", faction: "wu", office: "advisor", prowess: 7, intellect: 16, command: 13 },
  { id: "lu-xun", name: "陆逊", faction: "wu", office: "general", prowess: 13, intellect: 18, command: 16 },
  { id: "lv-bu", name: "吕布", faction: null, office: "wanderer", prowess: 20, intellect: 6, command: 12, reserve: true },
  { id: "yuan-shao", name: "袁绍", faction: null, office: "wanderer", prowess: 10, intellect: 9, command: 12, reserve: true },
  { id: "sima-yi", name: "司马懿", faction: null, office: "wanderer", prowess: 9, intellect: 19, command: 16, reserve: true },
  { id: "pang-tong", name: "庞统", faction: null, office: "wanderer", prowess: 4, intellect: 18, command: 12, reserve: true },
  { id: "zhao-yun", name: "赵云", faction: null, office: "wanderer", prowess: 18, intellect: 14, command: 15, reserve: true },
  { id: "dian-wei", name: "典韦", faction: null, office: "wanderer", prowess: 18, intellect: 6, command: 10, reserve: true },
  { id: "gan-ning", name: "甘宁", faction: null, office: "wanderer", prowess: 17, intellect: 10, command: 13, reserve: true },
  { id: "huang-zhong", name: "黄忠", faction: null, office: "wanderer", prowess: 17, intellect: 11, command: 14, reserve: true },
];

export const COMMANDERIES: { id: string; name: string; region: string }[] = [
  { id: "luoyang", name: "洛阳", region: "司隶" },
  { id: "changan", name: "长安", region: "司隶" },
  { id: "xuchang", name: "许昌", region: "豫州" },
  { id: "ye", name: "邺城", region: "冀州" },
  { id: "xiapi", name: "下邳", region: "徐州" },
  { id: "beiping", name: "北平", region: "幽州" },
  { id: "jinyang", name: "晋阳", region: "并州" },
  { id: "wuwei", name: "武威", region: "凉州" },
  { id: "chengdu", name: "成都", region: "益州" },
  { id: "xiangyang", name: "襄阳", region: "荆州" },
  { id: "jiangling", name: "江陵", region: "荆州" },
  { id: "jianye", name: "建业", region: "扬州" },
  { id: "kuaiji", name: "会稽", region: "扬州" },
  { id: "shouchun", name: "寿春", region: "扬州" },
  { id: "nanzheng", name: "南郑", region: "益州" },
  { id: "hefei", name: "合肥", region: "扬州" },
  { id: "jiangzhou", name: "江州", region: "益州" },
  { id: "changsha", name: "长沙", region: "荆州" },
  { id: "lingling", name: "零陵", region: "荆州" },
  { id: "puyang", name: "濮阳", region: "兖州" },
  { id: "pingyuan", name: "平原", region: "青州" },
  { id: "handan", name: "邯郸", region: "冀州" },
  { id: "qiao", name: "谯县", region: "豫州" },
  { id: "wuhuan", name: "襄平", region: "辽东" },
];

const FACTION_DEFS = [
  { id: "wei", name: "魏", color: "#7a2e2a", key: "wei" as const },
  { id: "shu", name: "蜀", color: "#2c5a45", key: "shu" as const },
  { id: "wu", name: "吴", color: "#2a3f66", key: "wu" as const },
];

function roleFrom(
  entry: RosterEntry,
  cityId: string | null,
  discovered: boolean,
): Role {
  return {
    id: entry.id,
    name: entry.name,
    kind: "historical",
    office: entry.office,
    factionId: entry.faction,
    cityId,
    alive: true,
    discovered,
    historical: true,
    prowess: entry.prowess,
    intellect: entry.intellect,
    command: entry.command,
    reputation: 50,
    merit: 0,
    absentStreak: 0,
    vacantStreak: 0,
    preset: null,
    seated: false,
    purse: 36,
    stock: {},
    known: [],
  };
}

function circle(i: number, n: number): { x: number; y: number } {
  const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: 50 + Math.cos(ang) * 34, y: 50 + Math.sin(ang) * 32 };
}

function pocketMap(): { cities: City[]; homes: Record<string, string> } {
  const cities: City[] = [
    { id: "luoyang", name: "洛阳", region: "司隶", isCapital: true, hasSeal: true, controllerId: null, grain: 700, gold: 600, troops: 1000, morale: 48, links: ["xuchang", "jianye", "chengdu"], fords: [], x: 50, y: 38 },
    { id: "xuchang", name: "许昌", region: "豫州", isCapital: false, hasSeal: false, controllerId: "wei", grain: 900, gold: 500, troops: 1500, morale: 70, links: ["luoyang", "chengdu"], fords: [], x: 24, y: 48 },
    { id: "chengdu", name: "成都", region: "益州", isCapital: false, hasSeal: false, controllerId: "shu", grain: 1100, gold: 400, troops: 1400, morale: 72, links: ["luoyang", "xuchang"], fords: [], x: 42, y: 78 },
    { id: "jianye", name: "建业", region: "扬州", isCapital: false, hasSeal: false, controllerId: "wu", grain: 1000, gold: 480, troops: 1500, morale: 70, links: ["luoyang"], x: 78, y: 46, fords: [] },
  ];
  applyFords(cities, "three_kingdoms_pocket");
  return { cities, homes: { wei: "xuchang", shu: "chengdu", wu: "jianye" } };
}

function generatedMap(count: number, seed: number): { cities: City[]; homes: Record<string, string> } {
  const rng = mulberry32(seed);
  const picked = COMMANDERIES.slice(0, count);
  const cities: City[] = picked.map((c, i) => {
    const pos = circle(i, count);
    const neutral = i === 0 || (i > 3 && i % 2 === 0);
    return {
      id: c.id,
      name: c.name,
      region: c.region,
      isCapital: i === 0,
      hasSeal: i === 0,
      controllerId: null,
      grain: i === 0 ? 800 : 500 + Math.floor(rng() * 200),
      gold: 300 + Math.floor(rng() * 200),
      troops: i === 0 ? 900 : neutral ? 420 : 1200,
      morale: i === 0 ? 50 : 68,
      links: [],
      fords: [],
      x: pos.x,
      y: pos.y,
    };
  });
  for (let i = 0; i < cities.length; i++) {
    const links = new Set<string>();
    links.add(cities[(i + 1) % cities.length]!.id);
    links.add(cities[(i - 1 + cities.length) % cities.length]!.id);
    if (i !== 0 && i % 3 === 0) links.add(cities[0]!.id);
    cities[i]!.links = [...links].filter((id) => id !== cities[i]!.id);
  }
  for (const link of cities[0]!.links) {
    const other = cities.find((c) => c.id === link);
    if (other && !other.links.includes(cities[0]!.id)) other.links.push(cities[0]!.id);
  }
  const pool = cities.filter((c) => !c.isCapital);
  const chosen: string[] = [];
  const step = Math.max(1, Math.floor(pool.length / 3));
  for (let i = 0; i < 3; i++) {
    const id = pool[Math.min(pool.length - 1, i * step)]?.id ?? cities[i % cities.length]!.id;
    if (!chosen.includes(id)) chosen.push(id);
  }
  let cursor = 0;
  while (chosen.length < 3 && cursor < cities.length) {
    const id = cities[cursor++]!.id;
    if (!chosen.includes(id)) chosen.push(id);
  }
  for (const [index, id] of chosen.entries()) {
    const city = cities.find((c) => c.id === id)!;
    city.controllerId = FACTION_DEFS[index]!.id;
    city.troops = 1300;
    city.grain = 900;
    city.morale = 70;
  }
  applyFords(cities, "random_abstract");
  return {
    cities,
    homes: { wei: chosen[0]!, shu: chosen[1]!, wu: chosen[2]! },
  };
}

const CLASSIC_LAYOUT: { id: string; name: string; region: string; x: number; y: number; capital?: boolean }[] = [
  { id: "luoyang", name: "洛阳", region: "司隶", x: 46, y: 42, capital: true },
  { id: "xuchang", name: "许昌", region: "豫州", x: 62, y: 52 },
  { id: "chengdu", name: "成都", region: "益州", x: 22, y: 78 },
  { id: "jianye", name: "建业", region: "扬州", x: 82, y: 70 },
  { id: "changan", name: "长安", region: "司隶", x: 24, y: 40 },
  { id: "ye", name: "邺城", region: "冀州", x: 46, y: 24 },
  { id: "xiapi", name: "下邳", region: "徐州", x: 76, y: 38 },
  { id: "xiangyang", name: "襄阳", region: "荆州", x: 46, y: 64 },
  { id: "jiangling", name: "江陵", region: "荆州", x: 58, y: 78 },
  { id: "beiping", name: "北平", region: "幽州", x: 58, y: 12 },
  { id: "jinyang", name: "晋阳", region: "并州", x: 30, y: 16 },
  { id: "wuwei", name: "武威", region: "凉州", x: 12, y: 24 },
  { id: "kuaiji", name: "会稽", region: "扬州", x: 90, y: 82 },
];

const CLASSIC_LINKS: Record<string, string[]> = {
  luoyang: ["changan", "xuchang", "ye", "xiangyang"],
  changan: ["luoyang", "jinyang", "wuwei", "chengdu"],
  xuchang: ["luoyang", "xiapi", "xiangyang"],
  ye: ["luoyang", "beiping", "jinyang", "xiapi"],
  xiapi: ["ye", "xuchang", "jianye"],
  beiping: ["ye", "jinyang"],
  jinyang: ["beiping", "ye", "changan", "wuwei"],
  wuwei: ["jinyang", "changan"],
  chengdu: ["changan", "xiangyang", "jiangling"],
  xiangyang: ["luoyang", "xuchang", "chengdu", "jiangling"],
  jiangling: ["xiangyang", "chengdu", "jianye"],
  jianye: ["xiapi", "jiangling", "kuaiji"],
  kuaiji: ["jianye"],
};

function classicMap(count: number): { cities: City[]; homes: Record<string, string> } {
  const picked = CLASSIC_LAYOUT.slice(0, Math.max(3, count));
  const ids = new Set(picked.map((city) => city.id));
  const wei = ids.has("xuchang") ? "xuchang" : picked[1]!.id;
  const shu = ids.has("chengdu") ? "chengdu" : picked[2]!.id;
  const wu = ids.has("jianye") ? "jianye" : picked[Math.min(3, picked.length - 1)]!.id;
  const homes = { wei, shu, wu };
  const troops: Record<string, number> = { [wei]: 1500, [shu]: 1400, [wu]: 1500 };
  const cities: City[] = picked.map((city) => ({
    id: city.id,
    name: city.name,
    region: city.region,
    isCapital: Boolean(city.capital),
    hasSeal: Boolean(city.capital),
    controllerId: city.id === wei ? "wei" : city.id === shu ? "shu" : city.id === wu ? "wu" : null,
    grain: city.capital ? 800 : troops[city.id] ? 900 : 620,
    gold: city.capital ? 600 : 420,
    troops: city.capital ? 1000 : troops[city.id] ?? 850,
    morale: city.capital ? 48 : troops[city.id] ? 70 : 60,
    links: (CLASSIC_LINKS[city.id] ?? []).filter((id) => ids.has(id) && id !== city.id),
    fords: [],
    x: city.x,
    y: city.y,
  }));
  applyFords(cities, "historic_13zhou");
  return { cities, homes };
}

function blankFaction(id: string, name: string, color: string, lord: string): Faction {
  return {
    id,
    name,
    color,
    lordRoleId: lord,
    liegeId: null,
    regentRoleId: null,
    major: true,
    eliminated: false,
  };
}

export function addCitizen(
  state: WorldState,
  cityId: string,
  rng: () => number,
): { ok: true; role: Role } | { ok: false; error: string } {
  if (!state.cities.some((c) => c.id === cityId)) {
    return { ok: false, error: "没有这座城" };
  }
  const used = new Set(state.roles.map((r) => r.name));
  let name = citizenName(rng);
  for (let i = 0; i < 12 && used.has(name); i++) name = citizenName(rng);
  const role: Role = {
    id: `c_${hashSeed(name + state.roles.length + state.id).toString(16)}`,
    name,
    kind: "citizen",
    office: "citizen",
    factionId: null,
    cityId,
    alive: true,
    discovered: true,
    historical: false,
    prowess: 4,
    intellect: 6,
    command: 4,
    reputation: 40,
    merit: 0,
    absentStreak: 0,
    vacantStreak: 0,
    preset: null,
    seated: true,
  };
  return { ok: true, role };
}

export function createWorld(opts: {
  id: string;
  name: string;
  profile: string;
  overrides?: unknown;
  kind: WorldKind;
  now: string;
  acknowledgeSeason?: boolean;
}): { ok: true; state: WorldState } | { ok: false; errors: string[] } {
  const built = buildConfig(opts.profile, opts.overrides, {
    acknowledgeSeason: opts.acknowledgeSeason,
  });
  if (!built.ok) return built;
  let config = built.config;
  if (opts.kind === "sandbox") {
    config = structuredClone(config);
    config.turn.laboratory_clock = true;
    config.turn.duration_minutes = config.turn.duration_minutes ?? 5;
    if (config.turn.duration_minutes < 5) config.turn.duration_minutes = 5;
    config.turn.early_resolve = true;
    config.turn.early_resolve_min_seated = 1;
    config.turn.duration_hours = Math.max(1, config.turn.duration_hours);
  }

  const map =
    config.world.map_topology === "three_kingdoms_pocket"
      ? pocketMap()
      : config.world.map_topology === "historic_13zhou"
        ? classicMap(config.world.city_count)
        : generatedMap(config.world.city_count, hashSeed(opts.id));

  const factions = FACTION_DEFS.map((f) =>
    blankFaction(f.id, f.name, f.color, ROSTER.find((r) => r.faction === f.key && r.office === "lord")!.id),
  );

  const actives = ROSTER.filter((r) => !r.reserve);
  const reserves = ROSTER.filter((r) => r.reserve).slice(0, config.world.reserve_roles);
  const roles: Role[] = [];
  for (const entry of actives) {
    const home = entry.faction ? map.homes[entry.faction]! : null;
    roles.push(roleFrom(entry, home, true));
  }
  for (const entry of reserves) {
    roles.push(roleFrom(entry, null, false));
  }

  const named = roles.length;
  const extra = config.world.role_pool_size - named;
  const rng = mulberry32(hashSeed(opts.id + ":pool"));
  const hosts = map.cities.filter((c) => !c.isCapital);
  for (let i = 0; i < extra; i++) {
    const host = hosts[i % hosts.length] ?? map.cities[0]!;
    let name = citizenName(rng);
    const used = new Set(roles.map((r) => r.name));
    while (used.has(name)) name = citizenName(rng);
    roles.push({
      id: `pool_${i}_${hashSeed(opts.id + name).toString(16)}`,
      name,
      kind: "promoted",
      office: "wanderer",
      factionId: null,
      cityId: host.id,
      alive: true,
      discovered: true,
      historical: false,
      prowess: 6 + Math.floor(rng() * 6),
      intellect: 6 + Math.floor(rng() * 8),
      command: 6 + Math.floor(rng() * 6),
      reputation: 40,
      merit: 0,
      absentStreak: 0,
      vacantStreak: 0,
      preset: null,
      seated: false,
    });
  }

  const nowMs = Date.parse(opts.now);
  const climateSeed = climateSeedFor(opts.id, opts.now);
  const state: WorldState = {
    id: opts.id,
    name: opts.name,
    kind: opts.kind,
    profile: opts.profile,
    countsAsExperiment: opts.kind === "experiment",
    config,
    turn: 1,
    status: "running",
    openedAt: opts.now,
    deadline: new Date(nowMs + turnDurationMs(config)).toISOString(),
    closedAt: null,
    closeReason: null,
    unifiedByFactionId: null,
    stableStreak: 0,
    consolidationLeft: null,
    experimental: config.rules.amendment_via_ingame_politics,
    seasonAnnounced: Boolean(opts.acknowledgeSeason && config.endgame.season_deadline_days),
    cities: map.cities,
    factions,
    roles,
    motions: [],
    offers: [],
    submitBallots: [],
    leavePermits: [],
    submitOpened: {},
    contracts: [],
    alliances: [],
    truces: [],
    letters: [],
    chronicle: [
      {
        seq: 1,
        turn: 0,
        phase: "meta",
        kind: "open",
        key: opts.kind === "sandbox" ? "meta.open.sandbox" : "meta.open.experiment",
        params: { name: opts.name, profile: opts.profile, seed: climateSeed },
      },
    ],
    amendments: [],
    lockedOrders: {},
    climateSeed,
    version: 1,
  };

  if (state.seasonAnnounced && config.endgame.season_deadline_days) {
    state.chronicle.push({
      seq: 2,
      turn: 0,
      phase: "meta",
      kind: "season",
      key: "meta.season_deadline",
      params: { days: String(config.endgame.season_deadline_days) },
    });
  }

  state.bounty = plannedBounty(state);
  state.chronicle.push({
    seq: state.chronicle.length + 1,
    turn: state.turn,
    phase: "meta",
    kind: "highlight",
    key: state.bounty.claimed ? "meta.bounty.claimed" : "meta.bounty",
    params: {
      season: state.bounty.season,
      code: state.bounty.code,
      merit: String(state.config.deeds.bounty_merit),
    },
  });

  return { ok: true, state };
}
