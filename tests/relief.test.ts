import assert from "node:assert/strict";
import { chronicleBlob, renderEntry } from "../src/i18n/render.ts";
import { describe, it } from "node:test";
import { forecast } from "../src/engine/climate.ts";
import { buildConfig } from "../src/engine/config.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-11T08:00:00.000Z";

function world(overrides?: Record<string, unknown>): WorldState {
  const climate = {
    disasters_enabled: false,
    disaster_permille: 0,
    ...(overrides?.climate && typeof overrides.climate === "object" ? overrides.climate : {}),
  };
  const built = createWorld({
    id: "relief-world",
    name: "减灾",
    profile: "tabletop_demo",
    overrides: { ...overrides, climate },
    kind: "experiment",
    now: NOW,
  });
  if (!built.ok) throw new Error(built.errors.join("；"));
  return built.state;
}

function order(partial: Partial<Order>): Order {
  return { votes: [], domestic: [], ...partial };
}

function seat(state: WorldState, ...ids: string[]) {
  for (const id of ids) {
    const role = state.roles.find((item) => item.id === id);
    if (!role) throw new Error(id);
    role.seated = true;
  }
}

function city(state: WorldState, id: string) {
  const found = state.cities.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function textOf(state: WorldState) {
  return chronicleBlob(state.chronicle);
}

function findTurn(state: WorldState, pred: (turn: number) => boolean) {
  for (let turn = 1; turn <= 240; turn += 1) {
    if (pred(turn)) return turn;
  }
  return 0;
}

describe("减灾", () => {
  it("修堤降低涝灾减粮，但叠满仍有损失，并且失修会退", () => {
    const probe = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    const flood = findTurn(probe, (turn) => forecast(probe, turn).disaster === "涝");
    assert.ok(flood > 0);
    const bare = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    bare.turn = flood;
    const open = resolveTurn(bare, NOW);
    const built = world({ eco: { action_points_per_turn: 4 }, climate: { disasters_enabled: true, disaster_permille: 80 } });
    built.turn = flood;
    seat(built, "cao-cao");
    built.lockedOrders = {
      "cao-cao": order({ domestic: [{ kind: "raise_dike" }, { kind: "raise_dike" }, { kind: "raise_dike" }, { kind: "raise_dike" }] }),
    };
    const held = resolveTurn(built, NOW);
    const bareXu = city(open, "xuchang").grain;
    const heldXu = city(held, "xuchang").grain;
    assert.ok(heldXu > bareXu);
    assert.ok(city(held, "xuchang").grain < 900);
    assert.equal(city(held, "xuchang").works?.dike, 3);
    assert.match(textOf(held), /堤防少损/);
    assert.match(textOf(held), /不使人物退场/);
    assert.equal(held.roles.every((role) => role.alive), true);

    const aging = world();
    aging.turn = 1;
    seat(aging, "cao-cao");
    aging.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "raise_dike" }] }) };
    let aged = resolveTurn(aging, NOW);
    assert.equal(city(aged, "xuchang").works?.dike, 1);
    aged.lockedOrders = {};
    aged = resolveTurn(aged, NOW);
    aged.lockedOrders = {};
    aged = resolveTurn(aged, NOW);
    assert.equal(city(aged, "xuchang").works?.dike, 0);
    assert.match(textOf(aged), /许昌堤防降至 0/);
  });

  it("义仓先抵粮损，有上限，空仓不凭空生粮，每回合有损耗", () => {
    const probe = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    const drought = findTurn(probe, (turn) => forecast(probe, turn).disaster === "旱" || forecast(probe, turn).disaster === "蝗");
    assert.ok(drought > 0);
    const stocked = world({ climate: { disasters_enabled: true, disaster_permille: 80 }, relief: { granary_cap: 200 } });
    stocked.turn = drought;
    seat(stocked, "cao-cao");
    city(stocked, "xuchang").works = { dike: 0, dikeIdle: 0, granary: 10, clinic: 0, plague: 0, canal: 0, canalIdle: 0, roads: [] };
    const before = city(stocked, "xuchang").grain;
    stocked.lockedOrders = {};
    const hit = resolveTurn(stocked, NOW);
    const xu = city(hit, "xuchang");
    assert.equal(xu.works?.granary, 0);
    assert.ok(xu.grain > before - Math.floor(before * 0.08));
    assert.ok(xu.grain < before);
    assert.match(textOf(hit), /义仓抵/);

    const capped = world({ relief: { granary_cap: 200 } });
    capped.turn = 2;
    seat(capped, "cao-cao");
    capped.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "store_grain" }, { kind: "store_grain" }] }) };
    const stored = resolveTurn(capped, NOW);
    assert.match(textOf(stored), /义仓 200/);
    assert.ok((city(stored, "xuchang").works?.granary ?? 0) <= 200);
    assert.ok((city(stored, "xuchang").works?.granary ?? 0) < 200);

    const empty = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    empty.turn = drought;
    const lost = resolveTurn(empty, NOW);
    assert.equal(city(lost, "xuchang").works?.granary, 0);
    assert.ok(city(lost, "xuchang").grain < 900);

    const spoil = world({ relief: { granary_spoil: 0.1 } });
    spoil.turn = 3;
    city(spoil, "xuchang").works = { dike: 0, dikeIdle: 0, granary: 100, clinic: 0, plague: 0, canal: 0, canalIdle: 0, roads: [] };
    const spoiled = resolveTurn(spoil, NOW);
    assert.equal(city(spoiled, "xuchang").works?.granary, 90);
  });

  it("医营少减兵但不免兵，两级医营能消掉本回合的疫情计时", () => {
    const probe = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    const plague = findTurn(probe, (turn) => {
      const sky = forecast(probe, turn);
      const next = forecast(probe, turn + 1);
      return sky.disaster === "瘟疫" && !next.disaster;
    });
    assert.ok(plague > 0);
    const bare = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    bare.turn = plague;
    const open = resolveTurn(bare, NOW);
    const tended = world({ eco: { action_points_per_turn: 4 }, climate: { disasters_enabled: true, disaster_permille: 80 } });
    tended.turn = plague;
    seat(tended, "cao-cao");
    tended.lockedOrders = {
      "cao-cao": order({
        domestic: [{ kind: "raise_clinic" }, { kind: "raise_clinic" }, { kind: "raise_clinic" }, { kind: "raise_clinic" }],
      }),
    };
    const saved = resolveTurn(tended, NOW);
    const bareTroops = city(open, "xuchang").troops;
    const savedTroops = city(saved, "xuchang").troops;
    assert.ok(savedTroops > bareTroops);
    assert.ok(savedTroops < 1500);
    assert.equal(city(saved, "xuchang").works?.clinic, 3);
    assert.equal(city(saved, "xuchang").works?.plague, 0);
    assert.match(textOf(saved), /医营少损/);
    assert.equal(saved.roles.every((role) => role.alive), true);

    open.lockedOrders = {};
    const lingered = resolveTurn(open, NOW);
    assert.equal(city(lingered, "xuchang").works?.plague, 1);
    assert.ok(city(lingered, "xuchang").troops < bareTroops);
    assert.match(textOf(lingered), /人物不因此退场/);
    assert.equal(lingered.roles.every((role) => role.alive), true);

    saved.lockedOrders = {};
    const quiet = resolveTurn(saved, NOW);
    assert.equal(city(quiet, "xuchang").troops, savedTroops);
  });

  it("赈济运粮给受灾城，记民心功信誉和信任，不自动缔约", () => {
    const probe = world();
    const dry = findTurn(probe, (turn) => forecast(probe, turn).weather === "旱");
    assert.ok(dry > 0);
    const hostile = world();
    hostile.turn = dry;
    seat(hostile, "cao-cao");
    hostile.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "relieve", destCityId: "jianye" }] }) };
    const refused = resolveTurn(hostile, NOW);
    assert.equal(city(refused, "xuchang").grain, 900);
    assert.match(textOf(refused), /不能赈济敌对/);
    assert.equal(refused.alliances.length, 0);

    const gift = world();
    gift.turn = dry;
    seat(gift, "cao-cao");
    city(gift, "luoyang").morale = 88;
    const cao = gift.roles.find((role) => role.id === "cao-cao")!;
    cao.reputation = 99;
    const meritBefore = cao.merit;
    gift.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "relieve", destCityId: "luoyang" }] }) };
    const sent = resolveTurn(gift, NOW);
    assert.equal(city(sent, "xuchang").grain, 800);
    assert.equal(city(sent, "luoyang").grain, 800);
    assert.equal(city(sent, "luoyang").morale, 90);
    assert.ok((sent.roles.find((role) => role.id === "cao-cao")?.merit ?? 0) >= meritBefore + 1);
    assert.equal(sent.roles.find((role) => role.id === "cao-cao")?.reputation, 100);
    assert.equal(sent.alliances.length, 0);
    assert.equal(sent.trust?.length ?? 0, 0);

    const ally = world();
    ally.turn = dry;
    seat(ally, "cao-cao");
    ally.alliances.push({ a: "wei", b: "wu", sinceTurn: 1 });
    ally.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "relieve", destCityId: "jianye" }] }) };
    const helped = resolveTurn(ally, NOW);
    assert.equal(helped.alliances.length, 1);
    assert.equal(helped.trust?.find((item) => item.toFactionId === "wu")?.score, 1);
    assert.match(textOf(helped), /盟约仍要对方自己答应/);
    assert.equal(city(helped, "jianye").morale, 74);
  });

  it("观天只写下已确定的下一回合，不改抽签", () => {
    const state = world();
    state.turn = 5;
    const next = forecast(state, 6);
    const seed = state.climateSeed;
    seat(state, "cao-cao");
    state.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "watch_sky" }] }) };
    const after = resolveTurn(state, NOW);
    assert.equal(after.climateSeed, seed);
    assert.deepEqual(forecast(after, 6), next);
    assert.match(textOf(after), new RegExp(next.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(textOf(after), /抽签没有被改写/);
  });

  it("修路只降低那一条路的折损，并且会失效", () => {
    const probe = world();
    const rain = findTurn(probe, (turn) => {
      const sky = forecast(probe, turn);
      return sky.weather === "雨" && sky.season !== "冬";
    });
    assert.ok(rain > 0);
    const march = (): Partial<Order> => ({
      war: { type: "march", targetCityId: "luoyang", personal: true, portion: "most" },
    });
    const plain = world();
    plain.turn = rain;
    seat(plain, "cao-cao");
    city(plain, "xuchang").troops = 4000;
    city(plain, "xuchang").fords = ["luoyang"];
    plain.lockedOrders = { "cao-cao": order(march()) };
    const bare = resolveTurn(plain, NOW);
    const paved = world();
    paved.turn = rain;
    seat(paved, "cao-cao");
    city(paved, "xuchang").troops = 4000;
    city(paved, "xuchang").fords = ["luoyang"];
    paved.lockedOrders = { "cao-cao": order({ ...march(), domestic: [{ kind: "mend_road", destCityId: "luoyang" }] }) };
    const eased = resolveTurn(paved, NOW);
    const other = world();
    other.turn = rain;
    seat(other, "cao-cao");
    city(other, "xuchang").troops = 4000;
    city(other, "xuchang").fords = ["luoyang"];
    other.lockedOrders = { "cao-cao": order({ ...march(), domestic: [{ kind: "mend_road", destCityId: "chengdu" }] }) };
    const missed = resolveTurn(other, NOW);
    const loss = (state: WorldState) => {
      const matched = textOf(state).match(/折损 (\d+)/);
      assert.ok(matched);
      return Number(matched[1]);
    };
    const bareLoss = loss(bare);
    const easedLoss = loss(eased);
    assert.ok(easedLoss > 0);
    assert.ok(easedLoss < bareLoss);
    assert.equal(loss(missed), bareLoss);

    const decay = world();
    decay.turn = 1;
    seat(decay, "cao-cao");
    decay.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "mend_road", destCityId: "luoyang" }] }) };
    let aged = resolveTurn(decay, NOW);
    assert.equal(city(aged, "xuchang").works?.roads.length, 1);
    aged.lockedOrders = {};
    aged = resolveTurn(aged, NOW);
    aged.lockedOrders = {};
    aged = resolveTurn(aged, NOW);
    assert.equal(city(aged, "xuchang").works?.roads.length, 0);
  });

  it("开渠缓和旱田，收成仍低于晴天", () => {
    const probe = world();
    const dry = findTurn(probe, (turn) => forecast(probe, turn).weather === "旱");
    const fair = findTurn(probe, (turn) => forecast(probe, turn).weather === "晴" && forecast(probe, turn).season !== "冬");
    assert.ok(dry > 0 && fair > 0);
    const drought = farmDelta(world(), dry, 0);
    const eased = farmDelta(world(), dry, 2);
    const sunny = farmDelta(world(), fair, 0);
    assert.ok(eased > drought);
    assert.ok(eased < sunny);
  });

  it("空席不会自己修堤，关闭减灾时指令无效，越界配置被拒绝", () => {
    const probe = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    const flood = findTurn(probe, (turn) => forecast(probe, turn).disaster === "涝");
    const vacant = world({ climate: { disasters_enabled: true, disaster_permille: 80 } });
    vacant.turn = flood;
    const next = resolveTurn(vacant, NOW);
    assert.equal(city(next, "xuchang").works?.dike, 0);
    assert.doesNotMatch(textOf(next), /修堤/);
    assert.equal(next.roles.every((role) => role.alive), true);

    const off = world({ relief: { enabled: false } });
    off.turn = 1;
    seat(off, "cao-cao");
    off.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "raise_dike" }] }) };
    const blocked = resolveTurn(off, NOW);
    assert.equal(city(blocked, "xuchang").works?.dike, 0);
    assert.match(textOf(blocked), /没有打开减灾/);

    assert.equal(buildConfig("tianxia_classic", { relief: { dike_max: 5 } }).ok, false);
    assert.equal(buildConfig("tianxia_classic", { relief: { dike_max: 4, dike_grain_cut: 0.3 } }).ok, false);
    assert.equal(buildConfig("tianxia_classic", { relief: { clinic_max: 4, clinic_plague_cut: 0.3 } }).ok, false);
    assert.equal(buildConfig("tianxia_classic", { relief: { enabled: false } }).ok, true);

    const parsed = parseOrder({ domestic: [{ kind: "mend_road", destCityId: "jianye" }] }, blocked, "cao-cao");
    assert.equal(parsed.ok, false);
  });
});

function farmDelta(state: WorldState, turn: number, canal: number) {
  state.turn = turn;
  seat(state, "cao-cao");
  const xu = city(state, "xuchang");
  xu.works = { dike: 0, dikeIdle: 0, granary: 0, clinic: 0, plague: 0, canal, canalIdle: 0, roads: [] };
  const before = xu.grain;
  state.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "farm" }] }) };
  const next = resolveTurn(state, NOW);
  return city(next, "xuchang").grain - before;
}
