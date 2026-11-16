import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { normalizeClimate } from "../src/engine/climate.ts";
import { DEFAULT_PROFILE } from "../src/engine/config.ts";
import {
  SCHEMATIC,
  forbiddenHits,
  mapBoard,
  riverBoard,
  readRoad,
  routeHops,
} from "../src/engine/land.ts";
import { parseOrder } from "../src/engine/order.ts";
import { createWorld } from "../src/engine/scenario.ts";
import type { WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-15T12:00:00.000Z";

function open(profile: string, id = profile): WorldState {
  const built = createWorld({ id, name: "山河", profile, kind: "experiment", now: NOW });
  if (!built.ok) throw new Error(built.errors.join("；"));
  return built.state;
}

function at(state: WorldState, id: string) {
  const city = state.cities.find((item) => item.id === id);
  if (!city) throw new Error(id);
  return city;
}

describe("山河图", () => {
  it("默认试玩是山河，不是把成都接到许昌的教学沙盘", () => {
    assert.equal(DEFAULT_PROFILE, "river_board");
    const state = open("river_board");
    assert.equal(state.config.turn.duration_minutes, 8);
    assert.equal(state.config.turn.early_resolve, true);
    assert.equal(state.config.eco.action_points_per_turn, 3);
    assert.equal(mapBoard(state.cities), "rivers");
    assert.equal(state.cities.length, 12);
    assert.deepEqual(forbiddenHits(state.cities), []);
    assert.equal(at(state, "chengdu").links.includes("xuchang"), false);
    assert.equal(at(state, "xuchang").links.includes("chengdu"), false);
    const teaching = open("tabletop_demo");
    assert.equal(mapBoard(teaching.cities), "teaching");
    assert.equal(at(teaching, "chengdu").links.includes("xuchang"), true);
  });

  it("城的相对位置按河与山分开，成都不到许昌旁边", () => {
    const board = riverBoard(12);
    const city = (id: string) => {
      const found = board.cities.find((item) => item.id === id);
      if (!found) throw new Error(id);
      return found;
    };
    assert.ok(city("changan").x < city("luoyang").x);
    assert.ok(city("luoyang").x < city("xuchang").x);
    assert.ok(city("xuchang").x < city("xiapi").x);
    assert.ok(city("chengdu").x < city("jiangzhou").x);
    assert.ok(city("jiangzhou").x < city("jiangling").x);
    assert.ok(city("jiangling").x < city("jianye").x);
    assert.ok(city("chengdu").x < city("nanzheng").x);
    assert.ok(city("nanzheng").y > city("changan").y);
    assert.ok(city("chengdu").y > city("nanzheng").y);
    assert.ok(city("ye").y < SCHEMATIC.yellowY);
    assert.ok(city("jinyang").y < SCHEMATIC.yellowY);
    assert.ok(city("luoyang").y > SCHEMATIC.yellowY);
    assert.ok(city("changan").y > SCHEMATIC.yellowY);
    assert.ok(city("xuchang").y < city("xiangyang").y);
    assert.ok(city("xiangyang").y < city("jiangling").y);
    assert.ok(Math.abs(city("jiangzhou").y - SCHEMATIC.yangtzeY) <= 2);
    assert.ok(Math.abs(city("jiangling").y - SCHEMATIC.yangtzeY) <= 2);
    const span = (a: string, b: string) => Math.hypot(city(a).x - city(b).x, city(a).y - city(b).y);
    assert.ok(span("chengdu", "xuchang") > span("chengdu", "jiangzhou") * 2);
    assert.ok(span("chengdu", "xuchang") > span("luoyang", "xuchang") * 2);
  });

  it("道路对称、连通，翻山越河没有捷径", () => {
    for (const count of [12, 8]) {
      const state = open("tianxia_classic", `classic-${count}`);
      if (count !== 12) {
        state.config.world.city_count = count;
      }
      const board = count === 12 ? state.cities : riverBoard(count).cities.map((city) => ({
        id: city.id,
        links: riverBoard(count).links[city.id] ?? [],
      }));
      const cities = count === 12 ? state.cities : board;
      assert.equal(cities.length, count);
      const seen = new Set(cities.map((city) => city.id));
      for (const city of cities) {
        assert.ok(city.links.length > 0, city.id);
        for (const link of city.links) {
          assert.ok(seen.has(link), link);
          const other = cities.find((item) => item.id === link);
          assert.ok(other?.links.includes(city.id));
        }
      }
      const start = cities[0]!.id;
      const reached = new Set<string>();
      const queue = [start];
      while (queue.length) {
        const id = queue.pop()!;
        if (reached.has(id)) continue;
        reached.add(id);
        for (const link of cities.find((city) => city.id === id)!.links) queue.push(link);
      }
      assert.equal(reached.size, cities.length);
      assert.deepEqual(forbiddenHits(cities), []);
      assert.equal(routeHops(cities, "chengdu", "xuchang")! >= 3, true);
      assert.equal(routeHops(cities, "chengdu", "changan"), 2);
      assert.equal(routeHops(cities, "changan", "chengdu"), 2);
      const via = riverBoard(count);
      const mid = via.links.nanzheng ?? [];
      assert.ok(mid.includes("changan"));
      assert.ok(mid.includes("chengdu"));
    }
    const full = open("tianxia_classic");
    assert.equal(at(full, "xuchang").links.includes("luoyang"), true);
    assert.equal(at(full, "luoyang").links.includes("xuchang"), true);
    assert.ok(at(full, "jiangzhou").fords.includes("jiangling"));
    assert.equal(at(full, "luoyang").fords.includes("xuchang"), false);
    assert.ok(at(full, "changan").fords.includes("nanzheng") === false);
  });

  it("攻击和移驻只沿新的邻城，旧档的假连线不会被改写", () => {
    const state = open("river_board", "routes");
    const liu = state.roles.find((role) => role.id === "liu-bei");
    if (!liu) throw new Error("liu-bei");
    liu.seated = true;
    const far = parseOrder({ war: { type: "march", targetCityId: "xuchang", personal: true, portion: "most" } }, state, "liu-bei");
    assert.equal(far.ok, false);
    if (!far.ok) assert.match(far.error, /相连/);
    const near = parseOrder({ war: { type: "march", targetCityId: "jiangzhou", personal: true, portion: "most" } }, state, "liu-bei");
    assert.equal(near.ok, true);
    at(state, "jiangzhou").controllerId = "shu";
    const move = parseOrder({ war: { type: "move", targetCityId: "jiangzhou" } }, state, "liu-bei");
    assert.equal(move.ok, true);
    const skip = parseOrder({ war: { type: "move", targetCityId: "xuchang" } }, state, "liu-bei");
    assert.equal(skip.ok, false);

    const pocket = open("tabletop_demo", "old-pocket");
    const before = pocket.cities.map((city) => [city.id, [...city.links].sort()] as const);
    for (const city of pocket.cities) city.fords = [];
    normalizeClimate(pocket);
    const after = pocket.cities.map((city) => [city.id, [...city.links].sort()] as const);
    assert.deepEqual(after, before);
    assert.equal(mapBoard(pocket.cities), "teaching");
    assert.equal(at(pocket, "chengdu").links.includes("xuchang"), true);
  });

  it("金线只标从驻地能走的友方路，选中别的城只是在看", () => {
    assert.equal(readRoad({ a: "chengdu", b: "jiangzhou", friend: true, stationId: "chengdu", selectedId: "chengdu" }), "move");
    assert.equal(readRoad({ a: "chengdu", b: "jiangzhou", friend: true, stationId: "chengdu", selectedId: "xuchang" }), "move");
    assert.equal(readRoad({ a: "luoyang", b: "xuchang", friend: true, stationId: "chengdu", selectedId: "chengdu" }), "plain");
    assert.equal(readRoad({ a: "chengdu", b: "nanzheng", friend: false, stationId: "chengdu", selectedId: "chengdu" }), "look");
    assert.equal(readRoad({ a: "chengdu", b: "nanzheng", friend: false, stationId: "chengdu", selectedId: "xuchang" }), "plain");
    assert.equal(readRoad({ a: "xuchang", b: "luoyang", friend: false, stationId: "chengdu", selectedId: "xuchang" }), "look");
    assert.equal(readRoad({ a: "luoyang", b: "xuchang", friend: true, stationId: "chengdu", selectedId: "xuchang" }), "look");
    assert.equal(readRoad({ a: "jiangling", b: "jianye", friend: false, stationId: "chengdu", selectedId: "chengdu" }), "plain");
  });

  it("来源写在山河模块里，并说明一条路仍是一回合", () => {
    const text = readFileSync(new URL("../src/engine/land.ts", import.meta.url), "utf8");
    assert.match(text, /谭其骧/);
    assert.match(text, /金牛/);
    assert.match(text, /不是古代经纬度/);
    assert.match(text, /一条道路是一回合/);
  });
});
