import assert from "node:assert/strict";
import { chronicleBlob, renderEntry } from "../src/i18n/render.ts";
import { describe, it } from "node:test";
import { buildConfig } from "../src/engine/config.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import { toPublic } from "../src/engine/view.ts";
import { adoptResolved } from "../src/engine/adopt.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-12T00:00:00.000Z";

function world(): WorldState {
  const built = createWorld({
    id: "deeds-world",
    name: "人事",
    profile: "tabletop_demo",
    overrides: { climate: { disasters_enabled: false, disaster_permille: 0 } },
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

function order(partial: Partial<Order>): Order {
  return { votes: [], domestic: [], ...partial };
}

describe("人事与提议", () => {
  it("未答复的结盟下回合过期，并且不会叠成一摞", () => {
    const state = world();
    state.turn = 1;
    seat(state, "sun-quan");
    state.lockedOrders = { "sun-quan": order({ diplomacy: { type: "alliance", targetFactionId: "wei" } }) };
    const next = resolveTurn(state, NOW);
    assert.equal(next.offers.filter((offer) => offer.status === "pending").length, 1);
    next.lockedOrders = { "sun-quan": order({ diplomacy: { type: "alliance", targetFactionId: "wei" } }) };
    const again = resolveTurn(next, NOW);
    const text = chronicleBlob(again.chronicle);
    assert.match(text, /空席也不代答/);
    assert.equal(again.offers.filter((offer) => offer.status === "pending").length, 1);
    assert.equal(again.alliances.length, 0);
    again.offers.push({
      id: "pending-same-turn",
      turn: again.turn,
      fromFactionId: "wu",
      toFactionId: "shu",
      kind: "alliance",
      status: "pending",
    });
    again.lockedOrders = { "sun-quan": order({ diplomacy: { type: "alliance", targetFactionId: "shu" } }) };
    const stacked = resolveTurn(again, NOW);
    assert.match(chronicleBlob(stacked.chronicle), /不重复送出/);
  });

  it("未入席的武将只提供统率，城破也不替他换主或让他退场", () => {
    const state = world();
    state.turn = 1;
    seat(state, "cao-cao");
    const xu = state.cities.find((city) => city.id === "xuchang")!;
    const luo = state.cities.find((city) => city.id === "luoyang")!;
    xu.troops = 4000;
    xu.fords = [];
    luo.troops = 200;
    luo.controllerId = "wu";
    const zhou = state.roles.find((role) => role.id === "zhou-yu")!;
    zhou.cityId = "luoyang";
    zhou.seated = false;
    state.lockedOrders = {
      "cao-cao": order({ war: { type: "march", targetCityId: "luoyang", personal: false, portion: "most" } }),
    };
    const next = resolveTurn(state, NOW);
    const text = chronicleBlob(next.chronicle);
    assert.match(text, /周瑜（未入席，只以统率留守）/);
    assert.equal(next.roles.find((role) => role.id === "zhou-yu")?.alive, true);
    assert.notEqual(next.roles.find((role) => role.id === "zhou-yu")?.factionId, "wei");
  });

  it("结义要双方互指，反目扣信誉，单挑不亲身则不退场", () => {
    const state = world();
    state.turn = 2;
    seat(state, "liu-bei", "zhuge-liang", "zhang-fei");
    state.lockedOrders = {
      "liu-bei": order({ domestic: [{ kind: "swear", targetRoleId: "zhuge-liang" }] }),
      "zhuge-liang": order({ domestic: [{ kind: "farm" }] }),
    };
    const missed = resolveTurn(state, NOW);
    assert.match(chronicleBlob(missed.chronicle), /没有回应/);
    assert.equal(missed.bonds?.length ?? 0, 0);
    missed.lockedOrders = {
      "liu-bei": order({ domestic: [{ kind: "swear", targetRoleId: "zhuge-liang" }] }),
      "zhuge-liang": order({ domestic: [{ kind: "swear", targetRoleId: "liu-bei" }] }),
    };
    const sworn = resolveTurn(missed, NOW);
    assert.equal(sworn.bonds?.length, 1);
    sworn.lockedOrders = {
      "zhang-fei": order({ domestic: [{ kind: "break_bond", targetRoleId: "liu-bei" }] }),
    };
    const outsider = resolveTurn(sworn, NOW);
    assert.equal(outsider.bonds?.length, 1);
    const before = outsider.roles.find((role) => role.id === "liu-bei")!.reputation;
    outsider.lockedOrders = {
      "liu-bei": order({ domestic: [{ kind: "break_bond", targetRoleId: "zhuge-liang" }] }),
    };
    const broken = resolveTurn(outsider, NOW);
    assert.equal(broken.bonds?.length, 0);
    assert.equal(broken.roles.find((role) => role.id === "liu-bei")?.reputation, before - 10);
  });

  it("犒赏花金，火攻看天时，离间只比智谋，流民不动具名人物", () => {
    const state = world();
    state.turn = 1;
    seat(state, "cao-cao", "xun-yu");
    const xu = state.cities.find((city) => city.id === "xuchang")!;
    xu.gold = 100;
    xu.morale = 40;
    xu.troops = 500;
    xu.grain = 400;
    state.lockedOrders = {
      "cao-cao": order({ domestic: [{ kind: "reward" }] }),
      "xun-yu": order({ domestic: [{ kind: "scheme", scheme: "fire" }, { kind: "scheme", scheme: "discord", targetRoleId: "sun-quan" }] }),
    };
    const next = resolveTurn(state, NOW);
    const text = chronicleBlob(next.chronicle);
    assert.equal(next.cities.find((city) => city.id === "xuchang")?.gold, 20);
    assert.equal(next.cities.find((city) => city.id === "xuchang")?.morale, 43);
    assert.match(text, /天时不宜/);
    assert.match(text, /离间孙权/);
    const low = next;
    const city = low.cities.find((item) => item.id === "xuchang")!;
    city.morale = 20;
    city.troops = 400;
    city.grain = 200;
    const names = low.roles.filter((role) => role.cityId === "xuchang").map((role) => role.id);
    low.lockedOrders = {};
    const fled = resolveTurn(low, NOW);
    assert.ok(fled.cities.find((item) => item.id === "xuchang")!.troops < 400);
    assert.deepEqual(fled.roles.filter((role) => names.includes(role.id)).map((role) => role.cityId), names.map(() => "xuchang"));
    assert.match(chronicleBlob(fled.chronicle), /具名人物不在流民之列/);
  });

  it("越界的人事数值会被拒绝", () => {
    assert.equal(buildConfig("tianxia_classic", { deeds: { fire_loss: 0.5 } }).ok, false);
    assert.equal(buildConfig("tianxia_classic", { deeds: { refugee_ratio: 0.01 } }).ok, false);
    const duel = world();
    duel.turn = 3;
    seat(duel, "cao-cao", "xun-yu", "zhang-fei");
    duel.cities.find((city) => city.id === "xuchang")!.troops = 4000;
    duel.lockedOrders = {
      "cao-cao": order({ war: { type: "march", targetCityId: "chengdu", personal: false, portion: "most" } }),
      "xun-yu": order({ war: { type: "duel", personal: true } }),
      "zhang-fei": order({ war: { type: "duel", personal: false } }),
    };
    const fought = resolveTurn(duel, NOW);
    assert.equal(fought.roles.find((role) => role.id === "xun-yu")?.alive, false);
    assert.equal(fought.roles.find((role) => role.id === "zhang-fei")?.alive, true);
    assert.match(chronicleBlob(fought.chronicle), /单挑/);
    const state = world();
    seat(state, "cao-cao");
    const parsed = parseOrder({ war: { type: "duel" } }, state, "cao-cao");
    assert.equal(parsed.ok, true);
  });

  it("开局就能看见本季悬赏，旧存档缺字段时也不会丢掉", () => {
    const state = world();
    assert.equal(state.bounty?.season, "春");
    assert.match(chronicleBlob(state.chronicle), /春季悬赏/);
    const bare = world();
    delete bare.bounty;
    const shown = toPublic(bare, null);
    assert.equal(shown.bounty?.season, "春");
    assert.equal(shown.bounty?.code, state.bounty?.code);
    const next = resolveTurn(structuredClone(bare), NOW);
    adoptResolved(bare, next);
    assert.equal(bare.turn, 2);
    assert.equal(bare.bounty?.season, "夏");
    assert.match(chronicleBlob(bare.chronicle), /夏季悬赏/);
  });
});
