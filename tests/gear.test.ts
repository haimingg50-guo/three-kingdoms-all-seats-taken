import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantSearchClue, PURSE_CAP, STOCK_CAP } from "../src/engine/gear.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import { adoptResolved } from "../src/engine/adopt.ts";
import { renderEntry } from "../src/i18n/render.ts";
import type { Order, Role, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-14T00:00:00.000Z";

function world(): WorldState {
  const built = createWorld({
    id: "gear-world",
    name: "装备",
    profile: "tabletop_demo",
    overrides: { climate: { disasters_enabled: false, disaster_permille: 0 } },
    kind: "sandbox",
    now: NOW,
  });
  if (!built.ok) throw new Error(built.errors.join("；"));
  return built.state;
}

function role(state: WorldState, id: string): Role {
  const found = state.roles.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function order(partial: Partial<Order> = {}): Order {
  return { votes: [], domestic: [], ...partial };
}

describe("装备成长", () => {
  it("同一条指令买两次，钱只够一次，材料只加一份", () => {
    const state = world();
    const zhang = role(state, "zhang-fei");
    zhang.seated = true;
    zhang.purse = 20;
    zhang.stock = { iron: 0 };
    state.lockedOrders = {
      "zhang-fei": order({ domestic: [{ kind: "buy", pattern: "iron" }, { kind: "buy", pattern: "iron" }] }),
    };
    const next = resolveTurn(state, NOW);
    const buyer = role(next, "zhang-fei");
    assert.equal(buyer.purse, 8);
    assert.equal(buyer.stock?.iron, 1);
    const keys = next.chronicle.filter((entry) => entry.turn === state.turn).map((entry) => entry.key);
    assert.equal(keys.filter((key) => key === "gear.buy").length, 1);
    assert.equal(keys.filter((key) => key === "gear.buy.poor").length, 1);
  });

  it("学会一次才能打造，第一件名器单独记载，第二件才是普通完成", () => {
    const state = world();
    const zhang = role(state, "zhang-fei");
    zhang.seated = true;
    zhang.purse = 40;
    zhang.stock = { iron: 5, wood: 4, leather: 3, fodder: 3 };
    state.lockedOrders = {
      "zhang-fei": order({
        domestic: [
          { kind: "learn", pattern: "snake-spear" },
          { kind: "forge", pattern: "snake-spear", label: "雨茅" },
          { kind: "forge", pattern: "snake-spear", label: "又一支" },
        ],
      }),
    };
    const next = resolveTurn(state, NOW);
    const maker = role(next, "zhang-fei");
    assert.equal(maker.purse, 16);
    assert.deepEqual(maker.known, ["snake-spear"]);
    assert.equal(maker.stock?.iron, 1);
    assert.equal(maker.stock?.wood, 2);
    const spears = (next.items ?? []).filter((item) => item.pattern === "snake-spear");
    assert.equal(spears.length, 2);
    assert.equal(spears[0]?.makerId, "zhang-fei");
    assert.equal(spears[0]?.name, "雨茅");
    const keys = next.chronicle.filter((entry) => entry.roleId === "zhang-fei").map((entry) => entry.key);
    assert.ok(keys.includes("gear.learn"));
    assert.ok(keys.includes("gear.forge.first"));
    assert.ok(keys.includes("gear.forge.plain"));
    const first = next.chronicle.find((entry) => entry.key === "gear.forge.first");
    assert.match(renderEntry(first!, "zh"), /蛇矛/);
    assert.match(renderEntry(first!, "zh"), /雨茅/);
    assert.match(renderEntry(first!, "en"), /snake spear/);

    next.lockedOrders = { "zhang-fei": order({ domestic: [{ kind: "learn", pattern: "snake-spear" }] }) };
    const again = resolveTurn(next, NOW);
    assert.equal(role(again, "zhang-fei").purse, 16);
    assert.ok(again.chronicle.some((entry) => entry.key === "gear.learn.again"));

    const bare = world();
    const newbie = role(bare, "zhang-fei");
    newbie.seated = true;
    newbie.stock = { iron: 5, wood: 5 };
    bare.lockedOrders = { "zhang-fei": order({ domestic: [{ kind: "forge", pattern: "snake-spear" }] }) };
    const refused = resolveTurn(bare, NOW);
    assert.equal(role(refused, "zhang-fei").stock?.iron, 5);
    assert.equal((refused.items ?? []).length, 0);
    assert.ok(refused.chronicle.some((entry) => entry.key === "gear.forge.unlearned"));
  });

  it("战马用饲料和皮驯养，不走锻造", () => {
    const state = world();
    const zhang = role(state, "zhang-fei");
    zhang.seated = true;
    zhang.stock = { fodder: 2, leather: 1, iron: 0, wood: 0 };
    state.lockedOrders = { "zhang-fei": order({ domestic: [{ kind: "tame", label: "的卢" }] }) };
    const next = resolveTurn(state, NOW);
    const horse = (next.items ?? []).find((item) => item.pattern === "war-horse");
    assert.equal(horse?.slot, "mount");
    assert.equal(horse?.name, "的卢");
    assert.equal(role(next, "zhang-fei").stock?.fodder, 0);
    assert.ok(next.chronicle.some((entry) => entry.key === "gear.tame"));
    assert.equal(next.chronicle.some((entry) => entry.key === "gear.forge.plain" || entry.key === "gear.forge.first"), false);
  });

  it("搜索得来的材料和钱有上限", () => {
    const state = world();
    const zhang = role(state, "zhang-fei");
    zhang.purse = PURSE_CAP;
    zhang.stock = { iron: STOCK_CAP, wood: STOCK_CAP, leather: STOCK_CAP, fodder: STOCK_CAP };
    for (let i = 0; i < 8; i += 1) grantSearchClue(state, zhang, "chengdu");
    assert.equal(zhang.purse, PURSE_CAP);
    assert.equal(zhang.stock.iron, STOCK_CAP);
    assert.equal(zhang.stock.wood, STOCK_CAP);
    const fresh = world();
    const cao = role(fresh, "cao-cao");
    cao.seated = true;
    cao.purse = 0;
    cao.stock = {};
    fresh.roles.forEach((person) => {
      if (person.historical && !person.discovered) person.discovered = true;
    });
    fresh.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "search" }] }) };
    const next = resolveTurn(fresh, NOW);
    const after = role(next, "cao-cao");
    const gained = (after.purse ?? 0) > 0 || Object.values(after.stock ?? {}).some((n) => (n ?? 0) > 0);
    assert.equal(gained, true);
    assert.ok((after.purse ?? 0) <= PURSE_CAP);
  });

  it("旧档没有装备字段也能屯田，武力不因此上升", () => {
    const state = world();
    const cao = role(state, "cao-cao");
    cao.seated = true;
    const before = cao.prowess;
    delete cao.purse;
    delete cao.stock;
    delete cao.known;
    delete state.items;
    const host = structuredClone(state);
    state.lockedOrders = { "cao-cao": order({ domestic: [{ kind: "farm" }] }) };
    const next = resolveTurn(state, NOW);
    assert.equal(role(next, "cao-cao").prowess, before);
    assert.ok(next.turn === host.turn + 1);
    assert.ok(Array.isArray(next.items));
    adoptResolved(host, next);
    assert.ok(Array.isArray(host.items));
    assert.equal(role(host, "cao-cao").prowess, before);
  });

  it("蛇矛只改单挑胜负，不改两边兵力", () => {
    function fight(arm: boolean) {
      const state = world();
      const cao = role(state, "cao-cao");
      const xia = role(state, "xiahou-dun");
      const guan = role(state, "guan-yu");
      cao.seated = true;
      xia.seated = true;
      guan.seated = true;
      cao.cityId = "xuchang";
      xia.cityId = "xuchang";
      guan.cityId = "luoyang";
      guan.factionId = "shu";
      xia.prowess = 10;
      xia.command = 10;
      guan.prowess = 10;
      guan.command = 10;
      const xu = state.cities.find((city) => city.id === "xuchang")!;
      const luo = state.cities.find((city) => city.id === "luoyang")!;
      xu.troops = 1000;
      xu.morale = 80;
      luo.troops = 1000;
      luo.morale = 80;
      luo.controllerId = "shu";
      if (arm) {
        state.items = [{ id: "spear", pattern: "snake-spear", slot: "weapon", name: "雨茅", makerId: "xiahou-dun", ownerId: "xiahou-dun", equipped: true }];
      }
      state.lockedOrders = {
        "cao-cao": order({ war: { type: "march", targetCityId: "luoyang", personal: false, portion: "half" } }),
        "xiahou-dun": order({ war: { type: "duel", personal: false } }),
        "guan-yu": order({ war: { type: "duel", personal: false } }),
      };
      return resolveTurn(state, NOW);
    }
    const bare = fight(false);
    const armed = fight(true);
    const bareDuel = bare.chronicle.find((entry) => entry.key === "war.duel.draw" || entry.key === "war.duel.live");
    const armedDuel = armed.chronicle.find((entry) => entry.key === "war.duel.live" || entry.key === "war.duel.draw");
    assert.equal(bareDuel?.key, "war.duel.draw");
    assert.equal(armedDuel?.key, "war.duel.live");
    assert.equal(armedDuel?.params?.winner, "xiahou-dun");
    assert.equal(armedDuel?.params?.atkGear, "2");
    assert.equal(role(armed, "xiahou-dun").prowess, 10);
    assert.equal(role(armed, "xiahou-dun").alive, true);
    assert.equal(role(armed, "guan-yu").alive, true);
    const troops = (saved: WorldState) => saved.cities.map((city) => `${city.id}:${city.troops}`).join(",");
    assert.equal(troops(armed), troops(bare));
  });

  it("军械捐出去，同势力的人可以领一件", () => {
    const state = world();
    const zhang = role(state, "zhang-fei");
    const liu = role(state, "liu-bei");
    zhang.seated = true;
    liu.seated = true;
    state.items = [{ id: "mail", pattern: "lamellar", slot: "armor", name: "", makerId: "zhang-fei", ownerId: "zhang-fei", equipped: false }];
    state.lockedOrders = { "zhang-fei": order({ domestic: [{ kind: "donate", itemId: "mail" }] }) };
    const given = resolveTurn(state, NOW);
    assert.equal(given.items?.[0]?.ownerId, "armory:shu");
    given.lockedOrders = { "liu-bei": order({ domestic: [{ kind: "draw" }] }) };
    const drawn = resolveTurn(given, NOW);
    assert.equal(drawn.items?.[0]?.ownerId, "liu-bei");
    assert.equal(drawn.items?.[0]?.equipped, false);
    assert.ok(drawn.chronicle.some((entry) => entry.key === "gear.donate"));
    assert.ok(drawn.chronicle.some((entry) => entry.key === "gear.draw"));
  });

  it("拒绝过长的器物名和不存在的形制", () => {
    const state = world();
    role(state, "zhang-fei").seated = true;
    const badName = parseOrder({ domestic: [{ kind: "forge", pattern: "snake-spear", label: "这名字实在是太长了" }] }, state, "zhang-fei");
    assert.equal(badName.ok, false);
    const badPattern = parseOrder({ domestic: [{ kind: "learn", pattern: "青龙偃月刀" }] }, state, "zhang-fei");
    assert.equal(badPattern.ok, false);
  });
});
