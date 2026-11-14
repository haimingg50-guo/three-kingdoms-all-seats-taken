import { forecast, isFord } from "../engine/climate";
import { chronicleBlob, renderEntry } from "../i18n/render";
import { parseOrder } from "../engine/order";
import { resolveTurn } from "../engine/resolve";
import { createWorld } from "../engine/scenario";
import type { City, DomesticKind, Order, Role, WorldState } from "../engine/types";
import { hashSeed, mulberry32 } from "../engine/names";

export const SIM_NOW = "2026-11-12T00:00:00.000Z";

/** 经典档一回合 24 小时，所以真实的一天只推进 1 回合。加速局用同一套规则多打回合。 */
export const REAL_DAY_TURNS = 1;
export const ACCEL_TURN_CAP = 36;

export const SEATS = [
  { roleId: "cao-cao", name: "曹操", style: "war" },
  { roleId: "zhuge-liang", name: "诸葛亮", style: "farm" },
  { roleId: "xun-yu", name: "荀彧", style: "relief" },
  { roleId: "sun-quan", name: "孙权", style: "diplomacy" },
  { roleId: "zhang-fei", name: "张飞", style: "fuzz" },
  { roleId: "liu-bei", name: "刘备", style: "weather" },
] as const;

export type Style = (typeof SEATS)[number]["style"];

export interface TurnSnap {
  turn: number;
  ms: number;
  weather: string;
  disaster: string | null;
  cities: Record<string, number>;
  troops: Record<string, number>;
  grain: Record<string, number>;
  reputation: Record<string, number>;
  ownersChanged: boolean;
  meaningful: number;
  apSpent: number;
  apCap: number;
  rejects: number;
}

export interface GameReport {
  id: string;
  label: string;
  maxTurns: number;
  turns: number;
  unified: boolean;
  winner: string | null;
  closeReason: string | null;
  status: string;
  deaths: { name: string; turn: number; reason: string }[];
  snaps: TurnSnap[];
  orders: Record<string, number>;
  reliefUses: Record<string, number>;
  reliefSaved: { dike: number; granary: number; clinic: number };
  disasterGrain: number;
  disasterTroops: number;
  weather: Record<string, number>;
  disasters: Record<string, number>;
  parseRejects: number;
  fuzzRejects: number;
  apSpent: number;
  apCap: number;
  meaningful: number;
  staleTurns: number;
  longestStale: number;
  violations: string[];
  msTotal: number;
  msMax: number;
  notes: string[];
}

export function openGame(id: string): WorldState {
  const built = createWorld({
    id,
    name: "六席推演",
    profile: "tianxia_classic",
    kind: "experiment",
    now: SIM_NOW,
  });
  if (!built.ok) throw new Error(built.errors.join("；"));
  for (const seat of SEATS) {
    const role = built.state.roles.find((item) => item.id === seat.roleId);
    if (!role) throw new Error(seat.roleId);
    role.seated = true;
  }
  return built.state;
}

function rngFor(id: string, turn: number, roleId: string) {
  return mulberry32(hashSeed(`${id}:${turn}:${roleId}`));
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function roleOf(state: WorldState, id: string) {
  const role = state.roles.find((item) => item.id === id);
  if (!role) throw new Error(id);
  return role;
}

function cityOf(state: WorldState, role: Role): City | undefined {
  return state.cities.find((city) => city.id === role.cityId);
}

function allied(state: WorldState, a: string, b: string) {
  return state.alliances.some((item) => (item.a === a && item.b === b) || (item.a === b && item.b === a));
}

function truce(state: WorldState, a: string, b: string) {
  return state.truces.some(
    (item) => item.untilTurn >= state.turn && ((item.a === a && item.b === b) || (item.a === b && item.b === a)),
  );
}

function attackable(state: WorldState, factionId: string, city: City) {
  if (city.controllerId === factionId) return false;
  if (city.controllerId && allied(state, factionId, city.controllerId)) return false;
  if (city.controllerId && truce(state, factionId, city.controllerId)) return false;
  return true;
}

function targets(state: WorldState, role: Role, avoidFords: boolean) {
  const here = cityOf(state, role);
  if (!here || !role.factionId || here.controllerId !== role.factionId) return [];
  return state.cities
    .filter((city) => here.links.includes(city.id) && attackable(state, role.factionId!, city))
    .filter((city) => !avoidFords || !isFord(here, city.id))
    .sort((a, b) => {
      const an = a.controllerId ? 1 : 0;
      const bn = b.controllerId ? 1 : 0;
      return an - bn || a.troops - b.troops || a.id.localeCompare(b.id);
    });
}

function pushDomestic(order: Order, kind: DomesticKind, extra?: Partial<Order["domestic"][number]>) {
  if (order.domestic.length >= 3) return;
  order.domestic.push({ kind, ...extra });
}

function bonded(state: WorldState, a: string, b: string) {
  return (state.bonds ?? []).some((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
}

function answer(state: WorldState, role: Role, order: Order, response: "accept" | "reject") {
  if (role.office !== "lord" || order.diplomacy) return;
  const incoming = state.offers.find((offer) => offer.status === "pending" && offer.toFactionId === role.factionId && offer.kind !== "defect" && offer.turn < state.turn);
  if (!incoming) return;
  const joining = incoming.kind === "submit" || incoming.kind === "surrender" || incoming.kind === "seek" || incoming.kind === "serve";
  order.diplomacy = { type: "respond", offerId: incoming.id, response: joining ? "accept" : response };
}

function submitHost(state: WorldState, factionId: string, requireMoreCities: boolean) {
  const mineCount = state.cities.filter((city) => city.controllerId === factionId).length;
  return state.factions
    .filter((item) => item.id !== factionId && !item.eliminated)
    .map((item) => ({
      item,
      cities: state.cities.filter((city) => city.controllerId === item.id).length,
      lord: state.roles.find((person) => person.id === item.lordRoleId),
    }))
    .filter((item) => item.lord?.alive && item.lord.seated && (!requireMoreCities || item.cities > mineCount))
    .sort((a, b) => b.cities - a.cities || a.item.id.localeCompare(b.item.id))[0];
}

function maybeSubmit(state: WorldState, role: Role, order: Order) {
  if (role.office !== "lord" || !role.factionId || order.diplomacy) return false;
  const faction = state.factions.find((item) => item.id === role.factionId);
  if (!faction || faction.liegeId) return false;
  const mine = state.cities.filter((city) => city.controllerId === faction.id);
  const here = cityOf(state, role);
  if (mine.length === 1 && here && here.troops < 700) {
    const host = submitHost(state, faction.id, true);
    if (host) {
      order.diplomacy = { type: "submit", targetFactionId: host.item.id };
      return true;
    }
  }
  if (state.turn < 2 || state.submitOpened?.[role.id] != null) return false;
  const voters = state.roles.filter((person) => person.alive && person.seated && person.factionId === faction.id);
  if (voters.length < 2) return false;
  const host = submitHost(state, faction.id, false);
  if (!host) return false;
  order.diplomacy = { type: "submit", targetFactionId: host.item.id };
  return true;
}

function ballotOrder(state: WorldState, role: Role): Order | null {
  const open = (state.submitBallots ?? []).find((vote) => vote.status === "open" && vote.factionId === role.factionId && vote.turn < state.turn);
  if (!open || !role.seated || role.captiveOf) return null;
  if (open.ballots.some((ballot) => ballot.roleId === role.id)) return null;
  const nay = role.id === "zhang-fei";
  const host = role.factionId ? submitHost(state, role.factionId, false) : undefined;
  return {
    votes: [],
    domestic: [{ kind: "farm" }],
    diplomacy: {
      type: "ballot",
      voteId: open.id,
      choice: nay ? "nay" : "aye",
      contingent: nay ? "retire" : host ? "seek" : undefined,
      targetFactionId: nay ? undefined : host?.item.id,
    },
  };
}

function orderWar(state: WorldState, role: Role): Order {
  const sky = forecast(state, state.turn);
  const list = targets(state, role, sky.weather === "雪");
  const here = cityOf(state, role);
  const order: Order = { votes: [], domestic: [] };
  const prey = list[0];
  if (prey && here && here.troops >= 200) {
    order.war = {
      type: "march",
      targetCityId: prey.id,
      portion: "most",
      personal: here.troops > prey.troops * 1.6,
    };
  } else {
    order.war = { type: "hold" };
  }
  if (here && here.gold >= 80 && here.morale < 55) pushDomestic(order, "reward");
  if (here && here.grain >= 160 && here.controllerId === role.factionId) pushDomestic(order, "recruit");
  pushDomestic(order, "farm");
  if (role.office !== "citizen") pushDomestic(order, "develop");
  if (!maybeSubmit(state, role, order)) answer(state, role, order, "reject");
  return order;
}

function orderFarm(state: WorldState, role: Role): Order {
  const order: Order = { votes: [], domestic: [] };
  if (!bonded(state, role.id, "liu-bei")) pushDomestic(order, "swear", { targetRoleId: "liu-bei" });
  else pushDomestic(order, "scheme", { scheme: "discord", targetRoleId: "sun-quan" });
  if (role.office === "lord" || role.office === "general" || role.office === "advisor") {
    pushDomestic(order, "develop");
  }
  pushDomestic(order, "farm");
  const here = cityOf(state, role);
  const threatened = here?.links.some((id) => {
    const city = state.cities.find((item) => item.id === id);
    return city?.controllerId && city.controllerId !== role.factionId;
  });
  if (threatened) order.war = { type: "duel", personal: false };
  return order;
}

function orderRelief(state: WorldState, role: Role): Order {
  const sky = forecast(state, state.turn);
  const next = forecast(state, state.turn + 1);
  const here = cityOf(state, role);
  const works = here?.works;
  const order: Order = { votes: [], domestic: [] };
  const wet = sky.weather === "雨" || sky.disaster === "涝" || next.weather === "雨" || next.disaster === "涝";
  const dry = sky.weather === "旱" || sky.disaster === "旱" || next.weather === "旱";
  const sick = sky.disaster === "瘟疫" || (works?.plague ?? 0) > 0 || next.disaster === "瘟疫";
  if (wet) pushDomestic(order, "raise_dike");
  if (dry) pushDomestic(order, "dig_canal");
  if (sick) pushDomestic(order, "raise_clinic");
  if (here && here.grain > 80 && (works?.granary ?? 0) < state.config.relief.granary_cap) {
    pushDomestic(order, "store_grain");
  }
  if (here && (sky.disaster || sky.weather === "旱")) {
    const dest = state.cities.find((city) => city.id !== here.id && (!city.controllerId || city.controllerId === role.factionId || allied(state, role.factionId ?? "", city.controllerId)));
    if (dest && order.domestic.length < 3) pushDomestic(order, "relieve", { destCityId: dest.id });
  }
  const ford = here?.links.find((id) => here && isFord(here, id));
  if (ford && wet && order.domestic.length < 3) pushDomestic(order, "mend_road", { destCityId: ford });
  if ((sky.weather === "旱" || (sky.season === "秋" && sky.weather === "晴")) && order.domestic.length < 3) {
    pushDomestic(order, "scheme", { scheme: "fire" });
  }
  if (order.domestic.length < 3) pushDomestic(order, "watch_sky");
  if (order.domestic.length < 3) pushDomestic(order, "farm");
  if (hashSeed(`${state.id}:${state.turn}:duel`) % 3 === 0) order.war = { type: "duel", personal: false };
  return order;
}

function orderDiplomacy(state: WorldState, role: Role): Order {
  const order: Order = { votes: [], domestic: [] };
  const incoming = state.offers.find(
    (offer) => offer.status === "pending" && offer.toFactionId === role.factionId && offer.kind !== "defect",
  );
  if (incoming && role.office === "lord") {
    const joining = incoming.kind === "submit" || incoming.kind === "surrender" || incoming.kind === "seek" || incoming.kind === "serve";
    order.diplomacy = {
      type: "respond",
      offerId: incoming.id,
      response: incoming.kind === "vassal" ? "reject" : joining || incoming.kind === "alliance" || incoming.kind === "truce" ? "accept" : "reject",
    };
  } else if (maybeSubmit(state, role, order)) {
    /* 只剩一座城且兵力见底时，外交君主改走臣服。 */
  } else if (role.office === "lord" && role.factionId) {
    const others = state.factions.filter((faction) => faction.id !== role.factionId && !faction.eliminated);
    const stranger = others.find((faction) => !allied(state, role.factionId!, faction.id));
    if (stranger) {
      order.diplomacy = { type: "alliance", targetFactionId: stranger.id };
    }
  }
  const here = cityOf(state, role);
  const neutral = targets(state, role, false).find((city) => !city.controllerId);
  if (neutral && here && here.troops >= 400) {
    order.war = { type: "march", targetCityId: neutral.id, portion: "half", personal: false };
  } else {
    order.war = { type: "hold" };
  }
  pushDomestic(order, "hold_line");
  pushDomestic(order, "farm");
  const hereGold = cityOf(state, role);
  if (hereGold && hereGold.gold >= 80 && hereGold.morale < 60) pushDomestic(order, "reward");
  else pushDomestic(order, "develop");
  return order;
}

function orderWeather(state: WorldState, role: Role): Order {
  const sky = forecast(state, state.turn);
  const next = forecast(state, state.turn + 1);
  const order: Order = { votes: [], domestic: [] };
  const snow = sky.weather === "雪";
  const wet = sky.weather === "雨" || sky.disaster === "涝";
  const list = snow ? [] : targets(state, role, wet);
  const here = cityOf(state, role);
  const prey = list.find((city) => !city.controllerId) ?? list[0];
  if (prey && here && here.troops >= 500 && here.troops > prey.troops) {
    order.war = { type: "march", targetCityId: prey.id, portion: "half", personal: false };
  } else {
    order.war = { type: "hold" };
  }
  if (next.weather === "旱" || sky.weather === "旱") pushDomestic(order, "dig_canal");
  if (next.weather === "雨" || next.disaster === "涝" || wet) pushDomestic(order, "raise_dike");
  if (!bonded(state, role.id, "zhuge-liang")) pushDomestic(order, "swear", { targetRoleId: "zhuge-liang" });
  else if (!bonded(state, role.id, "zhang-fei")) pushDomestic(order, "swear", { targetRoleId: "zhang-fei" });
  if (here && here.grain >= 160) pushDomestic(order, "recruit");
  pushDomestic(order, "farm");
  if (!maybeSubmit(state, role, order)) answer(state, role, order, snow || wet ? "accept" : "reject");
  return order;
}

function orderFuzz(state: WorldState, role: Role, rejects: { n: number }): Order {
  const rng = rngFor(state.id, state.turn, role.id);
  const here = cityOf(state, role);
  const illegal: unknown[] = [
    { remark: "自由发挥的一句台词" },
    { war: { type: "march", targetCityId: here?.links[0], personal: true } },
    { domestic: [{ kind: "enlist" }, { kind: "open_gates" }, { kind: "recruit" }, { kind: "farm" }] },
    { motion: { type: "execute", targetRoleId: "cao-cao", charge: "手写的罪" } },
  ];
  for (const raw of illegal) {
    const parsed = parseOrder(raw, state, role.id);
    if (!parsed.ok) rejects.n += 1;
  }
  const candidates: Order[] = [];
  const kinds: DomesticKind[] = ["farm", "drill_prowess", "drill_command", "search", "hold_line", "raise_dike", "store_grain", "watch_sky", "dig_canal", "raise_clinic"];
  for (let i = 0; i < 8; i += 1) {
    const order: Order = { votes: [], domestic: [] };
    const count = 1 + Math.floor(rng() * 3);
    for (let n = 0; n < count; n += 1) pushDomestic(order, pick(rng, kinds));
    if (here?.links.length && rng() < 0.4) {
      const destCityId = pick(rng, here.links);
      pushDomestic(order, rng() < 0.5 ? "mend_road" : "transport", { destCityId });
    }
    if (rng() < 0.2 && role.office !== "lord") order.diplomacy = { type: "seek", targetFactionId: "wei" };
    if (rng() < 0.25) pushDomestic(order, "swear", { targetRoleId: "liu-bei" });
    if (rng() < 0.25) pushDomestic(order, "scheme", { scheme: "rumor", destCityId: pick(rng, state.cities).id });
    if (rng() < 0.3) {
      const dest = pick(rng, state.cities.filter((city) => city.id !== here?.id));
      if (dest) pushDomestic(order, "relieve", { destCityId: dest.id });
    }
    const warType = pick(rng, ["hold", "confirm", "leave", "refuse", "duel"] as const);
    order.war = { type: warType };
    candidates.push(order);
  }
  for (const order of candidates) {
    const parsed = parseOrder(order, state, role.id);
    if (parsed.ok) return parsed.order;
    rejects.n += 1;
  }
  return { votes: [], domestic: [{ kind: "farm" }] };
}

export function propose(state: WorldState, role: Role, style: Style, rejects: { n: number }): Order {
  const ballot = ballotOrder(state, role);
  if (ballot) return ballot;
  if (style === "war") return orderWar(state, role);
  if (style === "farm") return orderFarm(state, role);
  if (style === "relief") return orderRelief(state, role);
  if (style === "diplomacy") return orderDiplomacy(state, role);
  if (style === "weather") return orderWeather(state, role);
  return orderFuzz(state, role, rejects);
}

function owners(state: WorldState) {
  return state.cities.map((city) => `${city.id}:${city.controllerId ?? "-"}`).join("|");
}

export function invariants(state: WorldState): string[] {
  const bad: string[] = [];
  const cap = state.config.eco.resource_cap;
  const relief = state.config.relief;
  for (const city of state.cities) {
    if (city.grain < 0 || city.troops < 0 || city.gold < 0) bad.push(`${city.name}资源为负`);
    if (city.grain > cap || city.troops > cap || city.gold > cap) bad.push(`${city.name}资源超过上限`);
    if (city.morale < 0 || city.morale > 100) bad.push(`${city.name}民心越界 ${city.morale}`);
    const works = city.works;
    if (works) {
      if (works.dike < 0 || works.dike > relief.dike_max) bad.push(`${city.name}堤防越界`);
      if (works.clinic < 0 || works.clinic > relief.clinic_max) bad.push(`${city.name}医营越界`);
      if (works.canal < 0 || works.canal > relief.canal_max) bad.push(`${city.name}水渠越界`);
      if (works.granary < 0 || works.granary > relief.granary_cap) bad.push(`${city.name}义仓越界`);
      if (works.plague < 0) bad.push(`${city.name}疫病为负`);
    }
    if (city.controllerId && !state.factions.some((faction) => faction.id === city.controllerId)) {
      bad.push(`${city.name}控制者无效`);
    }
  }
  const seqs = state.chronicle.map((entry) => entry.seq);
  if (new Set(seqs).size !== seqs.length) bad.push("史书序号重复");
  for (let i = 1; i < seqs.length; i += 1) {
    if (seqs[i]! <= seqs[i - 1]!) bad.push("史书序号倒退");
  }
  for (const role of state.roles) {
    if (!role.alive && role.office !== "dead") bad.push(`${role.name}已死但官职仍是${role.office}`);
    if (!role.alive && role.seated) bad.push(`${role.name}已死但仍在席`);
    if (role.reputation < 0 || role.reputation > 100) bad.push(`${role.name}信誉越界`);
    if (state.lockedOrders[role.id] && !role.alive) bad.push(`${role.name}已死但仍有待结算指令`);
  }
  for (const faction of state.factions) {
    const seen = new Set<string>();
    let cursor: string | null = faction.id;
    while (cursor) {
      if (seen.has(cursor)) {
        bad.push(`${faction.name}的臣服成环`);
        break;
      }
      seen.add(cursor);
      cursor = state.factions.find((item) => item.id === cursor)?.liegeId ?? null;
    }
  }
  const openVotes = (state.submitBallots ?? []).filter((vote) => vote.status === "open").map((vote) => vote.factionId);
  if (new Set(openVotes).size !== openVotes.length) bad.push("同一势力有两张未计的臣服表决");
  return bad;
}

export function playGame(id: string, maxTurns: number, label: string): GameReport {
  let state = openGame(id);
  const report: GameReport = {
    id,
    label,
    maxTurns,
    turns: 0,
    unified: false,
    winner: null,
    closeReason: null,
    status: state.status,
    deaths: [],
    snaps: [],
    orders: {},
    reliefUses: {},
    reliefSaved: { dike: 0, granary: 0, clinic: 0 },
    disasterGrain: 0,
    disasterTroops: 0,
    weather: {},
    disasters: {},
    parseRejects: 0,
    fuzzRejects: 0,
    apSpent: 0,
    apCap: 0,
    meaningful: 0,
    staleTurns: 0,
    longestStale: 0,
    violations: [],
    msTotal: 0,
    msMax: 0,
    notes: [],
  };
  let stale = 0;
  const seenDeaths = new Set(state.roles.filter((role) => !role.alive).map((role) => role.id));
  while (state.status === "running" || state.status === "consolidation") {
    if (report.turns >= maxTurns) break;
    const rejects = { n: 0 };
    const orders: Record<string, Order> = {};
    let apSpent = 0;
    let apCap = 0;
    for (const seat of SEATS) {
      const role = roleOf(state, seat.roleId);
      if (!role.alive || !role.seated) continue;
      apCap += state.config.eco.action_points_per_turn;
      const raw = propose(state, role, seat.style, rejects);
      const parsed = parseOrder(raw, state, role.id);
      if (!parsed.ok) {
        report.parseRejects += 1;
        const fallback = parseOrder({ votes: [], domestic: [{ kind: "farm" }], war: { type: "hold" } }, state, role.id);
        const empty = fallback.ok ? fallback : parseOrder({ votes: [], domestic: [] }, state, role.id);
        if (!empty.ok) continue;
        orders[role.id] = empty.order;
      } else {
        orders[role.id] = parsed.order;
      }
      apSpent += orders[role.id]!.domestic.length;
      for (const action of orders[role.id]!.domestic) {
        report.orders[action.kind] = (report.orders[action.kind] ?? 0) + 1;
        if (["raise_dike", "store_grain", "raise_clinic", "dig_canal", "mend_road", "relieve", "watch_sky"].includes(action.kind)) {
          report.reliefUses[action.kind] = (report.reliefUses[action.kind] ?? 0) + 1;
        }
      }
      if (orders[role.id]!.war) report.orders[`war:${orders[role.id]!.war!.type}`] = (report.orders[`war:${orders[role.id]!.war!.type}`] ?? 0) + 1;
      for (const action of orders[role.id]!.domestic) {
        if (action.scheme) report.orders[`scheme:${action.scheme}`] = (report.orders[`scheme:${action.scheme}`] ?? 0) + 1;
      }
      if (orders[role.id]!.diplomacy) {
        const key = `dip:${orders[role.id]!.diplomacy!.type}`;
        report.orders[key] = (report.orders[key] ?? 0) + 1;
      }
    }
    report.fuzzRejects += rejects.n;
    state.lockedOrders = orders;
    const before = owners(state);
    const beforeChronicle = state.chronicle.length;
    const t0 = performance.now();
    state = resolveTurn(state, SIM_NOW);
    const ms = performance.now() - t0;
    report.msTotal += ms;
    report.msMax = Math.max(report.msMax, ms);
    report.turns += 1;
    const fresh = state.chronicle.slice(beforeChronicle);
    for (const entry of fresh) {
      const line = renderEntry(entry, "zh");
      if (entry.kind.startsWith("ballot") || line.includes("不随行") || line.includes("因表决") || line.includes("不经表决")) {
        if (report.notes.length < 80) report.notes.push(`T${report.turns} ${line}`);
      }
    }
    const blob = chronicleBlob(fresh, "zh");
    const skyLine = fresh.find((entry) => entry.kind === "climate");
    const skyText = skyLine ? renderEntry(skyLine, "zh") : "";
    const weather = skyText.match(/天时：([^，]+)，([^。]+)/);
    const weatherName = weather?.[2]?.split("，")[0] ?? "未知";
    const disaster = skyText.match(/天灾「([^」]+)」/)?.[1] ?? null;
    report.weather[weatherName] = (report.weather[weatherName] ?? 0) + 1;
    if (disaster) report.disasters[disaster] = (report.disasters[disaster] ?? 0) + 1;
    const grainLoss = blob.match(/各城粮共减 (\d+)/);
    const troopLoss = blob.match(/各城兵力共减 (\d+)/);
    if (grainLoss) report.disasterGrain += Number(grainLoss[1]);
    if (troopLoss) report.disasterTroops += Number(troopLoss[1]);
    const dike = blob.match(/堤防少损 (\d+)/);
    const granary = blob.match(/义仓抵 (\d+)/);
    const clinic = blob.match(/医营少损 (\d+)/);
    if (dike) report.reliefSaved.dike += Number(dike[1]);
    if (granary) report.reliefSaved.granary += Number(granary[1]);
    if (clinic) report.reliefSaved.clinic += Number(clinic[1]);
    const meaningful = fresh.filter((entry) => !["reject", "climate", "absence"].includes(entry.kind)).length;
    report.meaningful += meaningful;
    report.apSpent += apSpent;
    report.apCap += apCap;
    const changed = owners(state) !== before;
    if (changed) {
      stale = 0;
    } else {
      stale += 1;
      report.staleTurns += 1;
      report.longestStale = Math.max(report.longestStale, stale);
    }
    const cities: Record<string, number> = {};
    const troops: Record<string, number> = {};
    const grain: Record<string, number> = {};
    const reputation: Record<string, number> = {};
    for (const faction of state.factions) {
      const held = state.cities.filter((city) => city.controllerId === faction.id);
      cities[faction.id] = held.length;
      troops[faction.id] = held.reduce((sum, city) => sum + city.troops, 0);
      grain[faction.id] = held.reduce((sum, city) => sum + city.grain, 0);
      const lord = state.roles.find((role) => role.id === faction.lordRoleId);
      reputation[faction.id] = lord?.reputation ?? 0;
    }
    report.snaps.push({
      turn: report.turns,
      ms,
      weather: weatherName,
      disaster,
      cities,
      troops,
      grain,
      reputation,
      ownersChanged: changed,
      meaningful,
      apSpent,
      apCap,
      rejects: fresh.filter((entry) => entry.kind === "reject").length,
    });
    for (const role of state.roles) {
      if (!role.alive && !seenDeaths.has(role.id)) {
        seenDeaths.add(role.id);
        report.deaths.push({ name: role.name, turn: role.diedTurn ?? report.turns, reason: role.deathReason ?? "未知" });
      }
    }
    report.violations.push(...invariants(state).map((item) => `${id} 第${report.turns}回合 ${item}`));
    if (state.status !== "running" && state.status !== "consolidation") break;
  }
  report.unified = state.status === "memorial";
  report.winner = state.factions.find((faction) => faction.id === state.unifiedByFactionId)?.name ?? null;
  report.closeReason = state.closeReason;
  report.status = state.status;
  return report;
}

export function wasteRate(report: GameReport) {
  if (report.apCap === 0) return 0;
  return (report.apCap - report.apSpent) / report.apCap;
}
