import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invariants, openGame, playGame } from "../src/sim/play.ts";

describe("六席推演", () => {
  it("同一局号两遍得到同一结局", () => {
    const once = playGame("sim-repeat", 6, "重复");
    const twice = playGame("sim-repeat", 6, "重复");
    assert.deepEqual(once.snaps.map((snap) => snap.cities), twice.snaps.map((snap) => snap.cities));
    assert.deepEqual(once.orders, twice.orders);
    assert.deepEqual(once.deaths, twice.deaths);
    assert.equal(once.violations.length, 0);
  });

  it("只让六位历史人物入席，开局不变量成立", () => {
    const state = openGame("sim-seats");
    const seated = state.roles.filter((role) => role.seated).map((role) => role.id).sort();
    assert.deepEqual(seated, ["cao-cao", "liu-bei", "sun-quan", "xun-yu", "zhang-fei", "zhuge-liang"]);
    assert.equal(invariants(state).length, 0);
    assert.equal(state.config.turn.duration_hours, 24);
  });
});
