import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cueForKey, cuesFromEntries, presentCues, REEL_CAP } from "../src/engine/cues.ts";
import { paintScene, poseAt } from "../src/components/game/reel-scene.ts";
import type { CueId } from "../src/engine/cues.ts";
import type { Order } from "../src/engine/types.ts";

function drawLog(id: CueId, frame: number, reduced: boolean) {
  const log: string[] = [];
  const round = (n: number) => Math.round(n);
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    fillRect: (x: number, y: number, w: number, h: number) => log.push(`r${round(x)},${round(y)},${round(w)},${round(h)}`),
    beginPath: () => log.push("b"),
    ellipse: (x: number, y: number, rx: number, ry: number) => log.push(`e${round(x)},${round(y)},${round(rx)},${round(ry)}`),
    arc: (x: number, y: number, r: number) => log.push(`a${round(x)},${round(y)},${round(r)}`),
    moveTo: (x: number, y: number) => log.push(`m${round(x)},${round(y)}`),
    lineTo: (x: number, y: number) => log.push(`l${round(x)},${round(y)}`),
    closePath: () => log.push("c"),
    fill: () => log.push("f"),
    stroke: () => log.push("s"),
  };
  paintScene(ctx as unknown as CanvasRenderingContext2D, id, frame, reduced);
  return log.join(";");
}

describe("行动演出", () => {
  it("成功、落空和未获同意各走各的画面，失败不借用成功", () => {
    assert.equal(cueForKey("domestic.search.found"), "search");
    assert.equal(cueForKey("domestic.intel"), "search");
    assert.equal(cueForKey("domestic.intel.none"), "searchMiss");
    assert.equal(cueForKey("domestic.search.grain"), "gather");
    assert.equal(cueForKey("gear.clue.mat"), "gather");
    assert.equal(cueForKey("gear.clue.full"), "gatherMiss");
    assert.equal(cueForKey("domestic.drill.prowess"), "drill");
    assert.equal(cueForKey("domestic.drill.command"), "drill");
    assert.equal(cueForKey("gear.buy"), "shop");
    assert.equal(cueForKey("gear.buy.poor"), "shopMiss");
    assert.equal(cueForKey("gear.learn"), "study");
    assert.equal(cueForKey("gear.learn.poor"), "studyMiss");
    assert.equal(cueForKey("gear.forge.plain"), "forge");
    assert.equal(cueForKey("gear.forge.first"), "forge");
    assert.equal(cueForKey("gear.forge.short"), "forgeMiss");
    assert.equal(cueForKey("gear.forge.unlearned"), "forgeMiss");
    assert.equal(cueForKey("diplomacy.offer"), "letter");
    assert.equal(cueForKey("diplomacy.alliance"), "envoy");
    assert.equal(cueForKey("diplomacy.reject.offer"), "envoyMiss");
    assert.equal(cueForKey("diplomacy.silent"), "envoyMiss");
    assert.equal(cueForKey("court.plea"), "court");
    assert.equal(cueForKey("court.recommend.fail"), "courtMiss");
    assert.equal(cueForKey("allegiance.accept"), "enlist");
    assert.equal(cueForKey("allegiance.submit"), "letter");
    assert.equal(cueForKey("allegiance.not_lord"), "enlistMiss");
    assert.equal(cueForKey("domestic.hold"), "hold");
    assert.equal(cueForKey("gear.tame"), "tame");
    assert.equal(cueForKey("gear.tame.short"), "tameMiss");
    assert.notEqual(cueForKey("gear.forge.short"), cueForKey("gear.forge.plain"));
    assert.notEqual(cueForKey("diplomacy.reject.offer"), cueForKey("diplomacy.alliance"));
    assert.notEqual(cueForKey("domestic.intel.none"), cueForKey("domestic.search.found"));
  });

  it("封存、移驻失败、非法装备和处决都不播成完成", () => {
    const sealed = { votes: [], domestic: [{ kind: "search" as const }] } satisfies Order;
    assert.equal(cuesFromEntries([sealed]).length, 0);
    for (const key of ["war.move.enemy", "war.move.displaced", "war.move.dead", "war.move.captive", "war.move.road", "war.move.origin"]) {
      assert.equal(cueForKey(key), null, key);
    }
    assert.equal(cueForKey("war.move"), "relocate");
    assert.equal(cueForKey("gear.equip"), null);
    assert.equal(cueForKey("gear.need.city"), null);
    assert.equal(cueForKey("diplomacy.duplicate"), null);
    assert.equal(cueForKey("court.execute.done"), null);
    assert.equal(cueForKey("court.remark"), null);
    assert.equal(cueForKey(undefined), null);
  });

  it("重复画面合并，一轮最多六段，战事不会被屯田挤掉", () => {
    const many = [
      { key: "domestic.farm" },
      { key: "domestic.farm" },
      { key: "domestic.search.found" },
      { key: "domestic.drill.prowess" },
      { key: "gear.buy" },
      { key: "gear.learn" },
      { key: "diplomacy.offer" },
      { key: "war.battle.win" },
    ];
    const shown = presentCues(many);
    assert.ok(shown.length <= REEL_CAP);
    assert.equal(shown.filter((cue) => cue.id === "farm").length, 1);
    assert.ok(shown.some((cue) => cue.id === "assault"));
    assert.equal(shown[0]?.id, "farm");
    const order = presentCues([{ key: "domestic.farm" }, { key: "war.move" }]).map((cue) => cue.id);
    assert.deepEqual(order, ["farm", "relocate"]);
  });

  it("时间往前走时，搜索、锻造、书信和攻城的笔画不一样", () => {
    assert.notEqual(drawLog("search", 0, false), drawLog("search", 5, false));
    assert.notEqual(drawLog("search", 5, false), drawLog("searchMiss", 5, false));
    assert.notEqual(drawLog("forge", 0, false), drawLog("forge", 3, false));
    assert.notEqual(drawLog("forge", 6, false), drawLog("forgeMiss", 6, false));
    assert.notEqual(drawLog("letter", 0, false), drawLog("letter", 4, false));
    assert.notEqual(drawLog("envoy", 6, false), drawLog("envoyMiss", 6, false));
    assert.notEqual(drawLog("drill", 0, false), drawLog("drill", 3, false));
    assert.notEqual(drawLog("assault", 0, false), drawLog("assault", 4, false));
    assert.notEqual(drawLog("shop", 1, false), drawLog("shop", 5, false));
    assert.notEqual(drawLog("court", 0, false), drawLog("court", 4, false));
    assert.equal(drawLog("forge", 0, true), drawLog("forge", 6, true));
    assert.equal(drawLog("search", 1, true), drawLog("search", 7, true));
    assert.notDeepEqual(poseAt("search", 0, false), poseAt("search", 4, false));
    assert.deepEqual(poseAt("forge", 0, true), poseAt("forge", 5, true));
  });
});
