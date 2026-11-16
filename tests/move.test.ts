import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cueForKey, cuesFromEntries } from "../src/engine/cues.ts";
import { poseAt } from "../src/components/game/reel-scene.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-14T12:00:00.000Z";

function world(profile: "river_board" | "tianxia_classic" | "tabletop_demo" = "river_board"): WorldState {
  const built = createWorld({
    id: "move-test",
    name: "移驻试局",
    profile,
    kind: "experiment",
    now: NOW,
  });
  if (!built.ok) throw new Error(built.errors.join("；"));
  return built.state;
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

function role(state: WorldState, id: string) {
  const found = state.roles.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe("友城移驻", () => {
  it("在职已入席的人沿相邻友方城走一格，兵留在原城", () => {
    const state = world();
    seat(state, "liu-bei");
    city(state, "jiangzhou").controllerId = "shu";
    const before = city(state, "chengdu").troops;
    const destTroops = city(state, "jiangzhou").troops;
    const grain = city(state, "chengdu").grain;
    const parsed = parseOrder(
      { domestic: [{ kind: "farm" }], war: { type: "move", targetCityId: "jiangzhou" } },
      state,
      "liu-bei",
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.order.war?.fromCityId, "chengdu");
    state.lockedOrders["liu-bei"] = parsed.order;
    const next = resolveTurn(state, NOW);
    assert.equal(role(next, "liu-bei").cityId, "jiangzhou");
    assert.equal(city(next, "chengdu").troops, before);
    assert.equal(city(next, "jiangzhou").troops, destTroops);
    assert.ok(city(next, "chengdu").grain > grain);
    assert.ok(next.chronicle.some((entry) => entry.key === "war.move"));
    assert.ok(next.chronicle.some((entry) => entry.key === "domestic.farm"));
    const moved = next.chronicle.find((entry) => entry.key === "war.move");
    const farmed = next.chronicle.find((entry) => entry.key === "domestic.farm");
    assert.ok(moved && farmed && farmed.seq < moved.seq);
  });

  it("下单时拒绝敌城、不邻接、空席和别人代走", () => {
    const state = world();
    seat(state, "liu-bei", "guan-yu");
    const enemy = parseOrder({ war: { type: "move", targetCityId: "nanzheng" } }, state, "liu-bei");
    assert.equal(enemy.ok, false);
    if (!enemy.ok) assert.match(enemy.error, /友方/);
    const far = parseOrder({ war: { type: "move", targetCityId: "xuchang" } }, state, "liu-bei");
    assert.equal(far.ok, false);
    if (!far.ok) assert.match(far.error, /相邻/);
    role(state, "guan-yu").seated = false;
    const empty = parseOrder({ war: { type: "move", targetCityId: "xuchang" } }, state, "guan-yu");
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.match(empty.error, /空席/);
    const citizen = state.roles.find((item) => item.office === "citizen" || item.kind === "citizen");
    if (citizen) {
      citizen.seated = true;
      citizen.cityId = "chengdu";
      citizen.factionId = "shu";
      const refused = parseOrder({ war: { type: "move", targetCityId: "xuchang" } }, state, citizen.id);
      assert.equal(refused.ok, false);
    }
    city(state, "jiangzhou").controllerId = "shu";
    const own = parseOrder({ war: { type: "move", targetCityId: "jiangzhou" } }, state, "liu-bei");
    assert.equal(own.ok, true);
    if (!own.ok) return;
    state.lockedOrders["liu-bei"] = own.order;
    const next = resolveTurn(state, NOW);
    assert.equal(role(next, "guan-yu").cityId, "chengdu");
    assert.equal(role(next, "liu-bei").cityId, "jiangzhou");
  });

  it("结算时目标易手则失败，人不动，也不从被遣散后的新位置再走", () => {
    const state = world("tianxia_classic");
    seat(state, "liu-bei", "guan-yu", "cao-cao");
    city(state, "nanzheng").controllerId = "shu";
    const parsed = parseOrder({ war: { type: "move", targetCityId: "nanzheng" } }, state, "guan-yu");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    city(state, "nanzheng").controllerId = "wei";
    state.lockedOrders["guan-yu"] = parsed.order;
    const flipped = resolveTurn(state, NOW);
    assert.equal(role(flipped, "guan-yu").cityId, "chengdu");
    assert.ok(flipped.chronicle.some((entry) => entry.key === "war.move.enemy"));

    const again = world("tianxia_classic");
    seat(again, "guan-yu", "cao-cao");
    city(again, "jiangzhou").controllerId = "wei";
    city(again, "jiangzhou").troops = 2000;
    city(again, "nanzheng").controllerId = "shu";
    city(again, "chengdu").troops = 80;
    role(again, "cao-cao").cityId = "jiangzhou";
    const move = parseOrder({ war: { type: "move", targetCityId: "nanzheng" } }, again, "guan-yu");
    const march = parseOrder(
      { war: { type: "march", targetCityId: "chengdu", personal: true, portion: "most" } },
      again,
      "cao-cao",
    );
    assert.equal(move.ok, true);
    assert.equal(march.ok, true);
    if (!move.ok || !march.ok) return;
    again.lockedOrders["guan-yu"] = move.order;
    again.lockedOrders["cao-cao"] = march.order;
    const raced = resolveTurn(again, NOW);
    assert.notEqual(role(raced, "guan-yu").cityId, "chengdu");
    assert.ok(raced.chronicle.some((entry) => entry.key === "war.retreat" || entry.key === "war.captive"));
    assert.ok(raced.chronicle.some((entry) => entry.key === "war.move.displaced" || entry.key === "war.move.captive" || entry.key === "war.move.dead"));
    const extra = raced.chronicle.filter((entry) => entry.key === "war.move");
    assert.equal(extra.length, 0);
  });

  it("画面线索只认结算键，提交封存不会变成胜利", () => {
    assert.equal(cueForKey("domestic.farm"), "farm");
    assert.equal(cueForKey("domestic.recruit"), "recruit");
    assert.equal(cueForKey("domestic.develop"), "develop");
    assert.equal(cueForKey("domestic.dike"), "build");
    assert.equal(cueForKey("domestic.transport"), "transport");
    assert.equal(cueForKey("war.battle.win"), "assault");
    assert.equal(cueForKey("war.battle.fail"), "repulse");
    assert.equal(cueForKey("war.occupy"), "assault");
    assert.equal(cueForKey("war.retreat"), "retreat");
    assert.equal(cueForKey("war.move"), "relocate");
    assert.equal(cueForKey("war.move.enemy"), null);
    assert.equal(cueForKey(undefined), null);
    const sealed = { votes: [], domestic: [{ kind: "farm" as const }] } satisfies Order;
    assert.equal("key" in sealed, false);
    assert.equal(cuesFromEntries([sealed]).length, 0);
    assert.notDeepEqual(poseAt("farm", 0, false), poseAt("farm", 2, false));
    assert.notEqual(poseAt("assault", 0, false).grow, poseAt("assault", 4, false).grow);
    assert.deepEqual(poseAt("relocate", 0, true), poseAt("relocate", 6, true));
  });

  it("封存的指令没有过场，结算后的史书才排出屯田再移驻", () => {
    const state = world();
    seat(state, "liu-bei");
    city(state, "jiangzhou").controllerId = "shu";
    const parsed = parseOrder(
      { domestic: [{ kind: "farm" }], war: { type: "move", targetCityId: "jiangzhou" } },
      state,
      "liu-bei",
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(cuesFromEntries([parsed.order]).length, 0);
    state.lockedOrders["liu-bei"] = parsed.order;
    const turn = state.turn;
    const next = resolveTurn(state, NOW);
    const ids = cuesFromEntries(next.chronicle.filter((entry) => entry.turn === turn)).map((cue) => cue.id);
    assert.ok(ids.includes("farm"));
    assert.ok(ids.includes("relocate"));
    assert.ok(ids.indexOf("farm") < ids.indexOf("relocate"));
    assert.equal(cuesFromEntries([{ key: "war.move.enemy" }]).length, 0);
  });

  it("旧档没有装备和移驻字段时仍能屯田", () => {
    const state = world();
    seat(state, "liu-bei");
    const raw = JSON.parse(JSON.stringify(state)) as WorldState;
    delete raw.items;
    delete raw.bonds;
    for (const person of raw.roles) {
      delete person.purse;
      delete person.stock;
      delete person.known;
    }
    const parsed = parseOrder({ domestic: [{ kind: "farm" }], war: { type: "hold" } }, raw, "liu-bei");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    raw.lockedOrders["liu-bei"] = parsed.order;
    const grain = city(raw, "chengdu").grain;
    const next = resolveTurn(raw, NOW);
    assert.ok(city(next, "chengdu").grain > grain);
    assert.equal(role(next, "liu-bei").cityId, "chengdu");
    assert.equal(next.chronicle.some((entry) => entry.key === "war.move"), false);
  });
});
