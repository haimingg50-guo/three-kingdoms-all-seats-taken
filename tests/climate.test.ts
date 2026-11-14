import assert from "node:assert/strict";
import { chronicleBlob, renderEntry } from "../src/i18n/render.ts";
import { describe, it } from "node:test";
import { forecast, marchLossRate, MARCH_LOSS_CAP, seasonOf } from "../src/engine/climate.ts";
import { buildConfig } from "../src/engine/config.ts";
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
    id: "climate-world",
    name: "天时",
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

function occupy(state: WorldState, turn: number) {
  state.turn = turn;
  seat(state, "cao-cao");
  const xu = state.cities.find((city) => city.id === "xuchang")!;
  xu.troops = 4000;
  state.lockedOrders = {
    "cao-cao": order({
      war: { type: "march", targetCityId: "luoyang", personal: true, portion: "most" },
    }),
  };
  return resolveTurn(state, NOW);
}

describe("天时", () => {
  it("季节按回合轮换，同一输入得到同一天气", () => {
    const state = world();
    assert.deepEqual(["春", "夏", "秋", "冬", "春"].map((name, index) => seasonOf(index + 1)), [
      "春",
      "夏",
      "秋",
      "冬",
      "春",
    ]);
    assert.equal(seasonOf(1), nameOf(state, 1));
    const once = forecast(state, 6);
    const twice = forecast(state, 6);
    assert.deepEqual(once, twice);
    assert.equal(once.season, "夏");
    assert.match(renderEntry(state.chronicle[0] ?? {}, "zh"), new RegExp(state.climateSeed));
  });

  it("春日非渡口出征不因天气减员，冬日会减", () => {
    const spring = occupy(world(), 1);
    const winter = occupy(world(), 4);
    const springText = chronicleBlob(spring.chronicle);
    const winterText = chronicleBlob(winter.chronicle);
    assert.doesNotMatch(springText, /折损/);
    assert.match(winterText, /折损/);
    assert.equal(spring.cities.find((city) => city.id === "luoyang")?.controllerId, "wei");
    assert.equal(winter.cities.find((city) => city.id === "luoyang")?.controllerId, "wei");
    assert.equal(winter.roles.every((role) => role.alive), true);
  });

  it("雨天只加重渡口，不改旱路", () => {
    const state = world();
    let rainTurn = 0;
    for (let turn = 1; turn <= 80; turn += 1) {
      const sky = forecast(state, turn);
      if (sky.weather === "雨" && sky.season !== "冬") {
        rainTurn = turn;
        break;
      }
    }
    assert.ok(rainTurn > 0);
    const dry = occupy(world(), rainTurn);
    const wetState = world();
    const xu = wetState.cities.find((city) => city.id === "xuchang")!;
    xu.fords = ["luoyang"];
    const wet = occupy(wetState, rainTurn);
    const dryTroops = dry.cities.find((city) => city.id === "luoyang")!.troops;
    const wetTroops = wet.cities.find((city) => city.id === "luoyang")!.troops;
    assert.ok(wetTroops < dryTroops);
    assert.match(chronicleBlob(wet.chronicle), /渡河折损/);
  });

  it("晴天屯田只小增，旱天减产", () => {
    const state = world();
    let fair = 0;
    let dry = 0;
    for (let turn = 1; turn <= 80; turn += 1) {
      const sky = forecast(state, turn);
      if (!fair && sky.weather === "晴" && sky.season !== "冬") fair = turn;
      if (!dry && sky.weather === "旱") dry = turn;
    }
    assert.ok(fair > 0 && dry > 0);
    const plain = farmDelta(world({ climate: { enabled: false } }), fair);
    const sunny = farmDelta(world(), fair);
    const drought = farmDelta(world(), dry);
    assert.ok(sunny > plain);
    assert.ok(sunny < plain * 1.2);
    assert.ok(drought < plain);
  });

  it("天灾只减资源或兵力，不杀死人物，也不替人出征", () => {
    const probe = world({ climate: { disaster_permille: 80, disasters_enabled: true } });
    let turn = 0;
    for (let candidate = 1; candidate <= 80; candidate += 1) {
      if (forecast(probe, candidate).disaster) {
        turn = candidate;
        break;
      }
    }
    assert.ok(turn > 0);
    const trial = world({ climate: { disaster_permille: 80, disasters_enabled: true } });
    trial.turn = turn;
    const next = resolveTurn(trial, NOW);
    assert.equal(next.chronicle.some((entry) => entry.kind === "disaster"), true);
    assert.equal(next.roles.every((role) => role.alive), true);
    assert.equal(next.cities.find((city) => city.id === "luoyang")?.controllerId, null);
    assert.match(chronicleBlob(next.chronicle), /不使人物退场/);
  });

  it("行军折损有上限，配置超出范围会被拒绝", () => {
    const state = world({
      climate: {
        snow_march_loss: 0.12,
        winter_march_loss: 0.1,
        rain_ford_loss: 0.12,
        flood_ford_loss: 0.15,
      },
    });
    const sky = forecast(state, 4);
    sky.weather = "雪";
    sky.disaster = "涝";
    assert.equal(marchLossRate(state.config.climate, sky, true), MARCH_LOSS_CAP);
    const high = buildConfig("tianxia_classic", { climate: { snow_march_loss: 0.5 } });
    assert.equal(high.ok, false);
    const permille = buildConfig("tianxia_classic", { climate: { disaster_permille: 200 } });
    assert.equal(permille.ok, false);
    const off = buildConfig("tianxia_classic", { climate: { enabled: false, disasters_enabled: false, disaster_permille: 0 } });
    assert.equal(off.ok, true);
  });
});

function nameOf(state: WorldState, turn: number) {
  return forecast(state, turn).season;
}

function farmDelta(state: WorldState, turn: number) {
  state.turn = turn;
  seat(state, "cao-cao");
  const xu = state.cities.find((city) => city.id === "xuchang")!;
  const before = xu.grain;
  state.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "farm" }] }) };
  const next = resolveTurn(state, NOW);
  const after = next.cities.find((city) => city.id === "xuchang")!.grain;
  return after - before;
}
