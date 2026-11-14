import assert from "node:assert/strict";
import { chronicleBlob, renderEntry } from "../src/i18n/render.ts";
import { describe, it } from "node:test";
import { fight } from "../src/engine/battle.ts";
import { applyAmendment, buildConfig } from "../src/engine/config.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-11T08:00:00.000Z";

function world(overrides?: unknown): WorldState {
  const built = createWorld({
    id: "test-world",
    name: "试局",
    profile: "tabletop_demo",
    overrides,
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
    const role = state.roles.find((r) => r.id === id);
    if (!role) throw new Error(id);
    role.seated = true;
  }
}

describe("配置红线", () => {
  it("拒绝取消永久死亡", () => {
    const built = buildConfig("tianxia_classic", { identity: { permadeath: false } });
    assert.equal(built.ok, false);
    if (!built.ok) assert.match(built.errors.join(" "), /permadeath/);
  });

  it("拒绝把统一比例设成占领全图", () => {
    const built = buildConfig("tianxia_classic", {
      endgame: { unify: { control_ratio: 1 } },
    });
    assert.equal(built.ok, false);
  });

  it("接受 0.9 的窄门", () => {
    const built = buildConfig("tianxia_classic", {
      endgame: { unify: { control_ratio: 0.9 } },
    });
    assert.equal(built.ok, true);
  });

  it("禁聊天时拒绝极简菜单", () => {
    const built = buildConfig("tianxia_classic", {
      comm: { free_chat: false, menu_expressiveness: "minimal" },
    });
    assert.equal(built.ok, false);
    if (!built.ok) assert.match(built.errors.join(" "), /C1/);
  });

  it("拒绝自动处罚和临场托管", () => {
    const auto = buildConfig("tianxia_classic", { politics: { auto_punishment: true } });
    const clever = buildConfig("tianxia_classic", {
      war: { fallback_behavior: "ai_general" },
    });
    assert.equal(auto.ok, false);
    assert.equal(clever.ok, false);
  });

  it("修规不能把窄门焊死", () => {
    const built = buildConfig("nomic_lab");
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const amended = applyAmendment(built.config, "endgame.unify.control_ratio", 1);
    assert.equal(amended.ok, false);
  });
});

describe("战果", () => {
  it("同一输入永远得到同一结果", () => {
    const input = {
      atkTroops: 1000,
      atkCommand: 10,
      atkMorale: 100,
      defTroops: 1000,
      defCommand: 10,
      defMorale: 100,
      walled: true,
    };
    assert.deepEqual(fight(input), fight(input));
    assert.equal(fight(input).takes, false);
    assert.equal(fight({ ...input, atkTroops: 4000, walled: false }).takes, true);
  });
});

describe("三城窄门", () => {
  it("开局是四座城、十二名在职、四名未现", () => {
    const state = world();
    assert.equal(state.cities.length, 4);
    assert.equal(state.cities.find((c) => c.isCapital)?.controllerId, null);
    assert.equal(state.roles.filter((r) => r.discovered && r.historical && r.factionId).length, 12);
    assert.equal(state.roles.filter((r) => !r.discovered).length, 4);
    assert.equal(state.config.identity.permadeath, true);
    assert.equal(state.config.endgame.on_unify, "memorial_then_shutdown");
  });

  it("无人下令时，空席不会出征", () => {
    const state = world();
    const before = state.cities.map((c) => [c.id, c.controllerId]);
    const next = resolveTurn(state, NOW);
    assert.deepEqual(
      next.cities.map((c) => [c.id, c.controllerId]),
      before,
    );
    assert.equal(next.turn, 2);
    assert.equal(next.roles.every((r) => r.alive), true);
  });

  it("君主亲征可以打下空城，系统不另选目标", () => {
    const state = world();
    seat(state, "cao-cao");
    const xu = state.cities.find((c) => c.id === "xuchang")!;
    xu.troops = 4000;
    state.lockedOrders["cao-cao"] = order({
      war: { type: "march", targetCityId: "luoyang", personal: true, portion: "most" },
    });
    const next = resolveTurn(state, NOW);
    assert.equal(next.cities.find((c) => c.id === "luoyang")?.controllerId, "wei");
    assert.equal(next.cities.find((c) => c.id === "chengdu")?.controllerId, "shu");
    assert.equal(next.cities.find((c) => c.id === "jianye")?.controllerId, "wu");
    assert.match(chronicleBlob(next.chronicle), /洛阳易主/);
  });

  it("搜索只揭开既有在野人物", () => {
    const state = world();
    seat(state, "cao-cao");
    state.lockedOrders["cao-cao"] = order({ domestic: [{ kind: "search" }] });
    const next = resolveTurn(state, NOW);
    const revealed = next.roles.filter((r) => r.discovered && r.office === "wanderer" && r.historical);
    assert.equal(revealed.length, 1);
    assert.equal(revealed[0]?.name, "吕布");
    assert.equal(next.roles.filter((r) => r.historical).length, 16);
  });

  it("缺席的主将不会被系统派去进攻第三座城", () => {
    const state = world();
    seat(state, "cao-cao", "xiahou-dun");
    const xiahou = state.roles.find((r) => r.id === "xiahou-dun")!;
    xiahou.preset = "defend";
    state.lockedOrders["cao-cao"] = order({
      war: {
        type: "march",
        targetCityId: "luoyang",
        commanderRoleId: "xiahou-dun",
        portion: "most",
      },
    });
    const xu = state.cities.find((c) => c.id === "xuchang")!;
    xu.troops = 4000;
    const next = resolveTurn(state, NOW);
    assert.equal(next.cities.find((c) => c.id === "luoyang")?.controllerId, "wei");
    assert.match(chronicleBlob(next.chronicle), /君主代指挥/);
    assert.equal(next.cities.find((c) => c.id === "jianye")?.controllerId, "wu");
  });
});

describe("政治与死亡", () => {
  it("处决经过表决和公示后永久退场", () => {
    const state = world({ politics: { impeach: { defense_hours: 0 } } });
    seat(state, "liu-bei", "guan-yu", "zhuge-liang");
    state.lockedOrders["liu-bei"] = order({
      motion: { type: "execute", targetRoleId: "zhang-fei", charge: "cruelty" },
    });
    let next = resolveTurn(state, NOW);
    const motion = next.motions.find((m) => m.type === "execute");
    assert.ok(motion);
    assert.equal(motion?.status, "voting");
    next.roles.forEach((r) => {
      if (["liu-bei", "guan-yu", "zhuge-liang"].includes(r.id)) r.seated = true;
    });
    next.lockedOrders["guan-yu"] = order({ votes: [{ motionId: motion!.id, choice: "aye" }] });
    next.lockedOrders["zhuge-liang"] = order({ votes: [{ motionId: motion!.id, choice: "aye" }] });
    next = resolveTurn(next, NOW);
    assert.equal(next.motions.find((m) => m.id === motion!.id)?.status, "notice");
    assert.equal(next.roles.find((r) => r.id === "zhang-fei")?.alive, true);
    next = resolveTurn(next, NOW);
    const fei = next.roles.find((r) => r.id === "zhang-fei");
    assert.equal(fei?.alive, false);
    assert.equal(fei?.deathReason, "executed");
    const again = resolveTurn(next, NOW);
    assert.equal(again.roles.find((r) => r.id === "zhang-fei")?.alive, false);
    assert.equal(again.roles.filter((r) => r.name === "张飞").length, 1);
  });

  it("流放剥夺权力，人物还在", () => {
    const state = world({ politics: { impeach: { defense_hours: 0 } } });
    seat(state, "liu-bei", "guan-yu", "zhuge-liang");
    state.lockedOrders["liu-bei"] = order({
      motion: { type: "exile", targetRoleId: "zhang-fei", charge: "private_army" },
    });
    let next = resolveTurn(state, NOW);
    const motion = next.motions.find((m) => m.type === "exile")!;
    next.roles.forEach((r) => {
      if (["liu-bei", "guan-yu", "zhuge-liang"].includes(r.id)) r.seated = true;
    });
    next.lockedOrders["guan-yu"] = order({ votes: [{ motionId: motion.id, choice: "aye" }] });
    next = resolveTurn(next, NOW);
    const fei = next.roles.find((r) => r.id === "zhang-fei")!;
    assert.equal(fei.alive, true);
    assert.equal(fei.office, "wanderer");
    assert.equal(fei.factionId, null);
  });

  it("两名武将兵变可以更换君主", () => {
    const state = world();
    seat(state, "guan-yu", "zhang-fei");
    const mutiny = order({ motion: { type: "mutiny", targetRoleId: "liu-bei" } });
    state.lockedOrders["guan-yu"] = mutiny;
    state.lockedOrders["zhang-fei"] = structuredClone(mutiny);
    const next = resolveTurn(state, NOW);
    assert.equal(next.roles.find((r) => r.id === "liu-bei")?.office, "wanderer");
    assert.equal(next.factions.find((f) => f.id === "shu")?.lordRoleId, "guan-yu");
    assert.equal(next.roles.find((r) => r.id === "liu-bei")?.alive, true);
  });

  it("弹劾罪状不能手写", () => {
    const state = world();
    const parsed = parseOrder(
      { motion: { type: "impeach", targetRoleId: "xiahou-dun", charge: "你这个废物" } },
      state,
      "cao-cao",
    );
    assert.equal(parsed.ok, false);
  });
});

describe("窄门", () => {
  it("条件满足并守成之后，主服进入纪念馆且不再结算", () => {
    const state = world({
      endgame: { unify: { stable_turns: 1 }, consolidation_turns: 1 },
    });
    for (const city of state.cities) city.controllerId = "wei";
    for (const faction of state.factions) {
      if (faction.id !== "wei") faction.eliminated = true;
    }
    let next = resolveTurn(state, NOW);
    assert.equal(next.status, "consolidation");
    next = resolveTurn(next, NOW);
    assert.equal(next.status, "memorial");
    assert.equal(next.unifiedByFactionId, "wei");
    assert.match(renderEntry(next.chronicle.at(-1) ?? {}, "zh"), /统一/);
    const frozen = resolveTurn(next, NOW);
    assert.equal(frozen.turn, next.turn);
    assert.equal(frozen.status, "memorial");
  });
});

describe("经典十二城", () => {
  it("城与道路是手摆的，并且来回都能走", () => {
    const built = createWorld({
      id: "classic-map",
      name: "经典",
      profile: "tianxia_classic",
      kind: "experiment",
      now: NOW,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.state.cities.length, 12);
    const capital = built.state.cities.find((city) => city.id === "luoyang");
    assert.equal(capital?.isCapital, true);
    assert.equal(capital?.controllerId, null);
    assert.equal(built.state.cities.find((city) => city.id === "xuchang")?.controllerId, "wei");
    assert.equal(built.state.cities.find((city) => city.id === "chengdu")?.controllerId, "shu");
    assert.equal(built.state.cities.find((city) => city.id === "jianye")?.controllerId, "wu");
    assert.equal(built.state.cities.find((city) => city.id === "xuchang")?.troops, 1500);
    assert.equal(built.state.cities.find((city) => city.id === "chengdu")?.troops, 1400);
    assert.equal(built.state.cities.find((city) => city.id === "jianye")?.troops, 1500);
    assert.equal(capital?.troops, 1000);
    assert.equal(built.state.cities.find((city) => city.id === "changan")?.troops, 850);
    assert.equal(built.state.cities.find((city) => city.id === "changan")?.controllerId, null);
    assert.equal(built.state.config.endgame.unify.control_ratio, 0.6);
    assert.equal(built.state.config.endgame.unify.stable_turns, 4);
    assert.equal(built.state.config.endgame.consolidation_turns, 4);
    assert.equal(built.state.config.deeds.refugee_ratio, 0.03);
    assert.equal(built.state.config.deeds.refugee_morale, 36);
    assert.equal(built.state.config.deeds.duel_gap, 8);
    for (const city of built.state.cities) {
      assert.ok(city.links.length > 0, city.id);
      for (const link of city.links) {
        const other = built.state.cities.find((item) => item.id === link);
        assert.ok(other, link);
        assert.ok(other!.links.includes(city.id));
      }
    }
  });
});
