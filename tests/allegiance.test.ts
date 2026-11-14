import assert from "node:assert/strict";
import { chronicleBlob, renderEntry } from "../src/i18n/render.ts";
import { describe, it } from "node:test";
import { assess } from "../src/engine/assess.ts";
import { ALLEGIANCE_COST } from "../src/engine/allegiance.ts";
import { parseOrder } from "../src/engine/order.ts";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import { toPublic } from "../src/engine/view.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-12T00:00:00.000Z";
const NEXT = "2026-11-13T00:00:00.000Z";

function world(): WorldState {
  const built = createWorld({
    id: "allegiance",
    name: "去向",
    profile: "tabletop_demo",
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

function role(state: WorldState, id: string) {
  const found = state.roles.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

const DAYS = [
  "2026-11-12T00:00:00.000Z",
  "2026-11-13T00:00:00.000Z",
  "2026-11-14T00:00:00.000Z",
  "2026-11-15T00:00:00.000Z",
  "2026-11-16T00:00:00.000Z",
];

function play(state: WorldState, orders: WorldState["lockedOrders"], day: number) {
  state.lockedOrders = orders;
  return resolveTurn(state, DAYS[day] ?? DAYS[0]!);
}

function farm(): Order {
  return order({ domestic: [{ kind: "farm" }] });
}

describe("臣服、投降与自由去向", () => {
  it("君主臣服要对方在席君主同意，封地计入统一比例，人仍由原玩家操作", () => {
    const state = world();
    seat(state, "liu-bei", "cao-cao");
    const before = state.cities.find((city) => city.id === "chengdu")!.troops;
    state.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "cao-cao": order({ domestic: [{ kind: "farm" }] }),
    };
    let next = resolveTurn(state, NOW);
    assert.match(chronicleBlob(next.chronicle), /不经表决/);
    assert.equal(next.submitBallots?.length ?? 0, 0);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    next.lockedOrders = {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: "o_1_liu-bei_submit_wei", response: "accept" } }),
      "liu-bei": order({ domestic: [{ kind: "farm" }] }),
    };
    next = resolveTurn(next, NEXT);
    const shu = next.factions.find((faction) => faction.id === "shu");
    assert.equal(shu?.liegeId, "wei");
    assert.equal(role(next, "liu-bei").office, "lord");
    assert.equal(role(next, "liu-bei").seated, true);
    assert.equal(role(next, "liu-bei").factionId, "shu");
    assert.equal(role(next, "zhuge-liang").factionId, "shu");
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.controllerId, "shu");
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.troops, before);
    assert.equal(role(next, "liu-bei").reputation, 50 - ALLEGIANCE_COST.submit);
    next.cities.find((city) => city.id === "luoyang")!.controllerId = "wei";
    const door = assess(next);
    assert.equal(door.heldCities, 3);
    assert.equal(door.majors.find((major) => major.id === "shu")?.status, "vassal");
    assert.match(chronicleBlob(next.chronicle), /计入魏的统一比例/);
  });

  it("空席不能代答，未答复的臣服过期", () => {
    const state = world();
    seat(state, "liu-bei");
    state.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
    };
    let next = resolveTurn(state, NOW);
    next.lockedOrders = {};
    next = resolveTurn(next, NEXT);
    assert.equal(next.offers.find((offer) => offer.kind === "submit")?.status, "expired");
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    assert.match(chronicleBlob(next.chronicle), /空席也不代答/);
  });

  it("部将投奔不需旧主同意，对方拒绝则人不动，兵力不动", () => {
    const state = world();
    seat(state, "zhang-fei", "liu-bei", "cao-cao");
    const troops = state.cities.find((city) => city.id === "chengdu")!.troops;
    state.lockedOrders = {
      "zhang-fei": order({ diplomacy: { type: "seek", targetFactionId: "wei" } }),
      "liu-bei": order({ war: { type: "hold" } }),
    };
    let next = resolveTurn(state, NOW);
    assert.equal(role(next, "zhang-fei").factionId, "shu");
    next.lockedOrders = {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: "o_1_zhang-fei_seek_wei", response: "reject" } }),
    };
    next = resolveTurn(next, NEXT);
    assert.equal(role(next, "zhang-fei").factionId, "shu");
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.troops, troops);
    assert.match(chronicleBlob(next.chronicle), /拒绝了张飞的投奔/);
  });

  it("下野后可以出仕，接受后成为对方部将", () => {
    const state = world();
    seat(state, "zhang-fei", "cao-cao");
    state.lockedOrders = {
      "zhang-fei": order({ diplomacy: { type: "retire" } }),
    };
    let next = resolveTurn(state, NOW);
    assert.equal(role(next, "zhang-fei").office, "wanderer");
    assert.equal(role(next, "zhang-fei").factionId, null);
    assert.equal(role(next, "zhang-fei").seated, true);
    assert.equal(role(next, "zhang-fei").reputation, 50 - ALLEGIANCE_COST.leave);
    next.lockedOrders = {
      "zhang-fei": order({ diplomacy: { type: "serve", targetFactionId: "wei" } }),
    };
    next = resolveTurn(next, NEXT);
    const offer = next.offers.find((item) => item.kind === "serve");
    assert.ok(offer);
    next.lockedOrders = {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: offer!.id, response: "accept" } }),
    };
    next = resolveTurn(next, "2026-11-14T00:00:00.000Z");
    assert.equal(role(next, "zhang-fei").factionId, "wei");
    assert.equal(role(next, "zhang-fei").office, "general");
    assert.match(chronicleBlob(next.chronicle), /出仕/);
  });

  it("投降献出所在城，不带走兵力；献出最后一城则旧势力灭亡", () => {
    const state = world();
    seat(state, "liu-bei", "cao-cao", "zhuge-liang");
    const troops = state.cities.find((city) => city.id === "chengdu")!.troops;
    state.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "surrender", targetFactionId: "wei", cityId: "chengdu" } }),
    };
    let next = resolveTurn(state, NOW);
    assert.equal(next.submitBallots?.some((vote) => vote.status === "open"), false);
    assert.doesNotMatch(chronicleBlob(next.chronicle), /表决/);
    next.lockedOrders = {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: "o_1_liu-bei_surrender_wei", response: "accept" } }),
    };
    next = resolveTurn(next, NEXT);
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.controllerId, "wei");
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.troops, troops);
    assert.equal(role(next, "liu-bei").factionId, "wei");
    assert.equal(role(next, "liu-bei").office, "general");
    assert.equal(role(next, "liu-bei").seated, true);
    assert.equal(role(next, "liu-bei").alive, true);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.eliminated, true);
    assert.equal(role(next, "zhuge-liang").office, "wanderer");
    assert.equal(role(next, "zhuge-liang").factionId, null);
    assert.equal(next.cities.filter((city) => city.controllerId === "wei").length, 2);
    assert.match(chronicleBlob(next.chronicle), /献出成都/);
  });

  it("臣服之后可以叛离，不需要宗主同意", () => {
    const state = world();
    seat(state, "liu-bei", "cao-cao");
    state.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
    };
    let next = resolveTurn(state, NOW);
    next.lockedOrders = {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: "o_1_liu-bei_submit_wei", response: "accept" } }),
    };
    next = resolveTurn(next, NEXT);
    next.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "renounce" } }),
    };
    next = resolveTurn(next, "2026-11-14T00:00:00.000Z");
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    assert.equal(next.cities.find((city) => city.id === "chengdu")?.controllerId, "shu");
    assert.match(chronicleBlob(next.chronicle), /叛离魏/);
  });

  it("不能向自己的附庸臣服，未入席的人不能替自己提出去向", () => {
    const state = world();
    seat(state, "liu-bei", "cao-cao");
    state.factions.find((faction) => faction.id === "wei")!.liegeId = "shu";
    state.lockedOrders = {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "sun-quan": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
    };
    const next = resolveTurn(state, NOW);
    assert.match(chronicleBlob(next.chronicle), /不能向自己的附庸/);
    assert.equal(next.offers.some((offer) => offer.targetRoleId === "sun-quan"), false);
    const parsed = parseOrder({ diplomacy: { type: "submit", targetFactionId: "wei" } }, state, "zhuge-liang");
    assert.equal(parsed.ok, false);
    const ballot = parseOrder({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }, state, "zhuge-liang");
    assert.equal(ballot.ok, false);
  });

  it("在席超过一人时，臣服先表决；空席不计，未投票不算赞成", () => {
    const state = world();
    seat(state, "liu-bei", "zhuge-liang", "cao-cao");
    let next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "zhuge-liang": farm(),
      "cao-cao": farm(),
    }, 0);
    assert.equal(next.offers.some((offer) => offer.kind === "submit"), false);
    assert.equal(next.submitBallots?.[0]?.id, "b_1_liu-bei");
    assert.equal(next.submitBallots?.[0]?.ballots[0]?.choice, "aye");
    next = play(next, {
      "zhuge-liang": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "liu-bei": farm(),
      "cao-cao": farm(),
    }, 1);
    const result = next.chronicle.find((entry) => entry.kind === "ballot_result");
    assert.match(renderEntry(result ?? {}, "zh"), /在席 2 人，赞成 2/);
    assert.match(renderEntry(result ?? {}, "zh"), /通过/);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    assert.equal(next.offers.find((offer) => offer.kind === "submit")?.status, "pending");
    const cast = next.chronicle.find((entry) => entry.kind === "ballot_cast" && entry.roleId === "zhuge-liang");
    assert.match(renderEntry(cast ?? {}, "zh"), /诸葛亮/);
  });

  it("赞成刚好三分之二不算通过，赞成者可以因此投奔，冷却三回合", () => {
    const state = world();
    seat(state, "liu-bei", "zhuge-liang", "zhang-fei", "cao-cao");
    let next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
      "cao-cao": farm(),
    }, 0);
    next = play(next, {
      "zhuge-liang": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye", contingent: "seek", targetFactionId: "wei" } }),
      "zhang-fei": farm(),
      "liu-bei": farm(),
      "cao-cao": farm(),
    }, 1);
    assert.match(chronicleBlob(next.chronicle), /在席 3 人，赞成 2。赞成未超过 2\/3，不通过/);
    assert.equal(next.offers.some((offer) => offer.kind === "submit"), false);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    const seek = next.offers.find((offer) => offer.kind === "seek" && offer.targetRoleId === "zhuge-liang");
    assert.equal(seek?.id, "o_2_zhuge-liang_seek_wei");
    assert.match(chronicleBlob(next.chronicle), /因表决未通过而向魏投奔/);
    assert.equal(role(next, "zhuge-liang").factionId, "shu");
    next = play(next, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "cao-cao": order({ diplomacy: { type: "respond", offerId: "o_2_zhuge-liang_seek_wei", response: "accept" } }),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
    }, 2);
    assert.match(chronicleBlob(next.chronicle), /要到第 4 回合才能再次发起/);
    assert.equal(role(next, "zhuge-liang").factionId, "wei");
    assert.equal(role(next, "zhuge-liang").office, "advisor");
  });

  it("四人里三张赞成才超过三分之二，反对者可以不随行下野", () => {
    const state = world();
    seat(state, "liu-bei", "zhuge-liang", "zhang-fei", "guan-yu", "cao-cao");
    let next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
      "guan-yu": farm(),
      "cao-cao": farm(),
    }, 0);
    next = play(next, {
      "zhuge-liang": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "zhang-fei": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "guan-yu": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "nay", contingent: "retire" } }),
      "liu-bei": farm(),
      "cao-cao": farm(),
    }, 1);
    assert.match(chronicleBlob(next.chronicle), /在席 4 人，赞成 3。赞成超过 2\/3，通过/);
    assert.equal(role(next, "guan-yu").office, "wanderer");
    assert.equal(role(next, "guan-yu").factionId, null);
    assert.equal(role(next, "guan-yu").reputation, 50 - ALLEGIANCE_COST.leave);
    assert.match(chronicleBlob(next.chronicle), /关羽因反对臣服而不随行/);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, null);
    const offer = next.offers.find((item) => item.kind === "submit");
    assert.equal(offer?.id, "o_2_liu-bei_submit_wei");
    next = play(next, {
      "cao-cao": order({ diplomacy: { type: "respond", offerId: offer!.id, response: "accept" } }),
      "liu-bei": farm(),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
    }, 2);
    assert.equal(next.factions.find((faction) => faction.id === "shu")?.liegeId, "wei");
    assert.equal(role(next, "liu-bei").office, "lord");
    assert.equal(role(next, "liu-bei").factionId, "shu");
  });

  it("通过后没附带去向的反对者，下一回合仍可下野", () => {
    const state = world();
    seat(state, "liu-bei", "zhuge-liang", "zhang-fei", "guan-yu");
    let next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
      "guan-yu": farm(),
    }, 0);
    next = play(next, {
      "zhuge-liang": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "zhang-fei": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "guan-yu": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "nay" } }),
      "liu-bei": farm(),
    }, 1);
    assert.equal(role(next, "guan-yu").office, "general");
    assert.equal(next.leavePermits?.some((permit) => permit.roleId === "guan-yu" && permit.side === "nay"), true);
    next = play(next, {
      "guan-yu": order({ diplomacy: { type: "retire" } }),
      "liu-bei": farm(),
      "zhuge-liang": farm(),
      "zhang-fei": farm(),
    }, 2);
    assert.equal(role(next, "guan-yu").office, "wanderer");
    assert.match(chronicleBlob(next.chronicle), /关羽因反对臣服而不随行/);
  });

  it("不记名时史书不写投票人名字，实验日志仍留角色", () => {
    const built = createWorld({
      id: "allegiance-anon",
      name: "不记名",
      profile: "tabletop_demo",
      kind: "experiment",
      now: NOW,
      overrides: { allegiance: { vote_named: false } },
    });
    if (!built.ok) throw new Error(built.errors.join("；"));
    const state = built.state;
    seat(state, "liu-bei", "zhuge-liang", "cao-cao");
    let next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "zhuge-liang": farm(),
      "cao-cao": farm(),
    }, 0);
    next = play(next, {
      "zhuge-liang": order({ diplomacy: { type: "ballot", voteId: "b_1_liu-bei", choice: "aye" } }),
      "liu-bei": farm(),
      "cao-cao": farm(),
    }, 1);
    const ballots = next.chronicle.filter((entry) => entry.kind.startsWith("ballot"));
    assert.ok(ballots.length > 0);
    assert.ok(ballots.every((entry) => {
      const line = renderEntry(entry, "zh");
      return !line.includes("诸葛亮") && !line.includes("刘备");
    }));
    assert.ok(ballots.some((entry) => renderEntry(entry, "zh").includes("一名在席者")));
    assert.equal(ballots.find((entry) => entry.kind === "ballot_cast")?.roleId, "zhuge-liang");
    const pub = toPublic(next, "cao-cao");
    assert.ok(pub.chronicle.filter((entry) => entry.kind.startsWith("ballot")).every((entry) => !entry.roleId));
  });

  it("旧存档没有表决配置时，只剩君主一人仍可直接臣服", () => {
    const state = world();
    delete state.config.allegiance;
    state.submitBallots = undefined;
    seat(state, "liu-bei", "cao-cao");
    const next = play(state, {
      "liu-bei": order({ diplomacy: { type: "submit", targetFactionId: "wei" } }),
      "cao-cao": farm(),
    }, 0);
    assert.equal(next.config.allegiance?.submit_threshold, 2 / 3);
    assert.match(chronicleBlob(next.chronicle), /不经表决/);
    assert.equal(next.offers.find((offer) => offer.kind === "submit")?.id, "o_1_liu-bei_submit_wei");
  });
});
