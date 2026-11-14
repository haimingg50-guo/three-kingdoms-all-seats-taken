import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTurn } from "../src/engine/resolve.ts";
import { createWorld } from "../src/engine/scenario.ts";
import { pickSpectacle, spectacleOutcome, videoUrlAllowed, type SpectacleCue } from "../src/engine/spectacle.ts";
import type { Order, WorldState } from "../src/engine/types.ts";

const NOW = "2026-11-14T00:00:00.000Z";

function cue(key: string, turn: number, params: Record<string, string> = {}): SpectacleCue {
  return { key, turn, params };
}

describe("演出", () => {
  it("只在普通锻成、雨中长柄单挑、或每四回合的积谷上出现", () => {
    assert.equal(pickSpectacle([cue("gear.forge.plain", 2)], "晴"), "hammer");
    assert.equal(pickSpectacle([cue("gear.forge.first", 2)], "雨"), null);
    assert.equal(
      pickSpectacle([cue("war.duel.live", 3, { gearAtk: "snake-spear", gearDef: "-", winner: "xiahou-dun", atk: "xiahou-dun" })], "雨"),
      "blade-rain",
    );
    assert.equal(pickSpectacle([cue("war.duel.live", 3, { gearAtk: "snake-spear" })], "晴"), null);
    assert.equal(pickSpectacle([cue("war.duel.live", 3, { gearAtk: "lamellar" })], "雨"), null);
    assert.equal(pickSpectacle([cue("domestic.granary", 4)], "晴"), "grain-check");
    assert.equal(pickSpectacle([cue("domestic.granary", 1)], "晴"), null);
    assert.equal(pickSpectacle([cue("domestic.granary.full", 4)], "晴"), null);
    const rain = [cue("war.duel.live", 3, { gearAtk: "halberd", winner: "guan-yu", atk: "xiahou-dun" })];
    assert.equal(spectacleOutcome("blade-rain", rain), "lose");
  });

  it("关闭、省流、空地址和不是 https 的地址都不加载视频", () => {
    assert.equal(videoUrlAllowed("off", "https://example.com/rain.mp4"), null);
    assert.equal(videoUrlAllowed("low", "https://example.com/rain.mp4"), null);
    assert.equal(videoUrlAllowed("on", ""), null);
    assert.equal(videoUrlAllowed("on", "/spectacle/rain.mp4"), null);
    assert.equal(videoUrlAllowed("on", "http://example.com/rain.mp4"), null);
    assert.equal(videoUrlAllowed("on", "https://example.com/rain.mp4"), "https://example.com/rain.mp4");
  });

  it("积谷彩蛋不改城中粮数", () => {
    const built = createWorld({
      id: "grain-egg",
      name: "验粮",
      profile: "tabletop_demo",
      overrides: { climate: { disasters_enabled: false, disaster_permille: 0 } },
      kind: "sandbox",
      now: NOW,
    });
    if (!built.ok) throw new Error(built.errors.join("；"));
    const state: WorldState = built.state;
    state.turn = 4;
    const cao = state.roles.find((item) => item.id === "cao-cao");
    if (!cao) throw new Error("cao");
    cao.seated = true;
    const city = state.cities.find((item) => item.id === cao.cityId);
    if (!city) throw new Error("city");
    const before = city.grain;
    const order: Order = { votes: [], domestic: [{ kind: "store_grain" }] };
    state.lockedOrders = { "cao-cao": order };
    const next = resolveTurn(state, NOW);
    const after = next.cities.find((item) => item.id === city.id)?.grain;
    const entries = next.chronicle.filter((entry) => entry.turn === 4);
    const picked = pickSpectacle(entries, "晴");
    assert.equal(picked, "grain-check");
    assert.equal(next.cities.find((item) => item.id === city.id)?.grain, after);
    assert.notEqual(after, before);
  });
});
