import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorld } from "../src/engine/scenario.ts";
import { toPublic } from "../src/engine/view.ts";
import type { Order } from "../src/engine/types.ts";
import { MESSAGES, translate } from "../src/i18n/messages.ts";
import {
  draftHasStarter,
  draftStorageKey,
  guideFocus,
  orderLines,
  primaryFor,
  readGuide,
  readStoredDraft,
  seatMeta,
  starterKinds,
  turnPhase,
  GUIDE_STORAGE_KEY,
} from "../src/components/game/play.ts";

const NOW = "2026-11-15T04:00:00.000Z";

function order(patch: Partial<Order> = {}): Order {
  return { votes: [], domestic: [], ...patch };
}

describe("第一回合的界面状态", () => {
  it("草稿、已封存、等待、结果待查看彼此分开，旁观不是其中任何一种", () => {
    assert.equal(turnPhase({ seated: true, locked: false, sealOpen: false, reviewing: false, closed: false }), "draft");
    assert.equal(turnPhase({ seated: true, locked: true, sealOpen: true, reviewing: false, closed: false }), "sealed");
    assert.equal(turnPhase({ seated: true, locked: true, sealOpen: false, reviewing: false, closed: false }), "waiting");
    assert.equal(turnPhase({ seated: true, locked: true, sealOpen: true, reviewing: true, closed: false }), "review");
    assert.equal(turnPhase({ seated: false, locked: false, sealOpen: false, reviewing: false, closed: false }), "watch");
    assert.equal(turnPhase({ seated: true, locked: false, sealOpen: false, reviewing: false, closed: true }), "watch");
  });

  it("席位卡把势力、身份、驻地放在同一行，不拆成竖列", () => {
    const line = seatMeta({ faction: "蜀", office: "君主", where: "驻成都" });
    assert.equal(line, "蜀 · 君主 · 驻成都");
    assert.equal(line.includes("\n"), false);
    assert.equal(seatMeta({ faction: null, office: "市民", where: "驻洛阳" }), "市民 · 驻洛阳");
  });

  it("常用指令按身份给出，旁观没有任何可下令的内政", () => {
    const lord = primaryFor({ office: "lord", kind: "historical" });
    const citizen = primaryFor({ office: "citizen", kind: "citizen" });
    assert.ok(lord.includes("farm"));
    assert.ok(lord.includes("develop"));
    assert.equal(citizen.includes("develop"), false);
    assert.equal(citizen.includes("recruit"), false);
    assert.ok(citizen.includes("farm"));
    assert.ok(citizen.includes("search"));
    assert.ok(citizen.includes("enlist"));
    assert.deepEqual(primaryFor(null), []);
    assert.deepEqual(starterKinds(null), []);
    assert.deepEqual(starterKinds({ office: "advisor", kind: "historical" }), ["farm", "search"]);
  });

  it("草稿预览只列打算做的事，不把屯田写成已经收获", () => {
    const lines = orderLines(order({ domestic: [{ kind: "farm" }], war: { type: "move", targetCityId: "luoyang" } }));
    assert.deepEqual(lines.map((line) => line.labelKey), ["act.farm", "slip.move"]);
    const shown = lines.map((line) => translate("zh", line.labelKey)).join(" ");
    assert.equal(shown.includes("收获"), false);
    assert.equal(draftHasStarter(order({ domestic: [{ kind: "search" }] })), true);
    assert.equal(draftHasStarter(order({ domestic: [{ kind: "develop" }] })), false);
    const note = translate("zh", "play.draftNotResult");
    assert.equal(note.includes("不是已经发生"), true);
  });

  it("切面板用的草稿能读回，坏数据和空席不会变成指令", () => {
    const saved = readStoredDraft(JSON.stringify(order({ domestic: [{ kind: "farm" }] })));
    assert.equal(saved?.domestic[0]?.kind, "farm");
    assert.equal(readStoredDraft("not-json"), null);
    assert.equal(readStoredDraft(null), null);
    assert.equal(readStoredDraft(JSON.stringify({ domestic: "nope" })), null);
    assert.equal(draftStorageKey("w_1", 3, "liu-bei"), "tianxia-draft:w_1:3:liu-bei");
  });

  it("引导可跳过，旁观停在入席，没有简单内政时不催屯田，封存后才讲等待", () => {
    assert.equal(guideFocus({ skipped: false, closed: false, seated: false, canStart: false, started: false, locked: false, cursor: "who" }), "seat");
    assert.equal(guideFocus({ skipped: true, closed: false, seated: false, canStart: false, started: false, locked: false, cursor: "seat" }), "done");
    assert.equal(guideFocus({ skipped: false, closed: true, seated: true, canStart: true, started: false, locked: false, cursor: "act" }), "done");
    assert.equal(guideFocus({ skipped: false, closed: false, seated: true, canStart: false, started: false, locked: false, cursor: "act" }), "who");
    assert.equal(guideFocus({ skipped: false, closed: false, seated: true, canStart: true, started: false, locked: false, cursor: "act" }), "act");
    assert.equal(guideFocus({ skipped: false, closed: false, seated: true, canStart: true, started: true, locked: false, cursor: "act" }), "draft");
    assert.equal(guideFocus({ skipped: false, closed: false, seated: true, canStart: true, started: false, locked: false, cursor: "draft" }), "act");
    assert.equal(guideFocus({ skipped: false, closed: false, seated: true, canStart: true, started: true, locked: true, cursor: "draft" }), "wait");
    assert.equal(readGuide(null).skipped, false);
    assert.equal(readGuide("garbage").cursor, "seat");
    assert.equal(readGuide(JSON.stringify({ cursor: "done", skipped: true })).skipped, true);
    assert.notEqual(GUIDE_STORAGE_KEY, "tx_session");
  });

  it("四种语言都有这四种状态，句子不是空的", () => {
    for (const locale of ["zh", "en", "ja", "ko"] as const) {
      const names = ["draft", "sealed", "waiting", "review"].map((phase) => MESSAGES[locale][`play.phase.${phase}`]);
      assert.equal(new Set(names).size, 4);
      for (const name of names) assert.ok(name && name.trim());
      assert.ok(MESSAGES[locale]["play.sealButton"]!.trim());
      assert.ok(MESSAGES[locale]["guide.act"]!.includes(locale === "zh" ? "屯田" : locale === "ja" ? "屯田" : locale === "ko" ? "둔전" : "Farm"));
    }
  });

  it("已入席且封存的人数进公开视图，未入席的锁定不计算", () => {
    const built = createWorld({ id: "play-ui", name: "上手试局", profile: "tabletop_demo", kind: "experiment", now: NOW });
    if (!built.ok) throw new Error(built.errors.join("；"));
    const state = built.state;
    for (const id of ["liu-bei", "cao-cao"]) {
      const role = state.roles.find((item) => item.id === id);
      if (!role) throw new Error(id);
      role.seated = true;
    }
    state.lockedOrders["liu-bei"] = order({ domestic: [{ kind: "farm" }] });
    state.lockedOrders["zhang-fei"] = order({ domestic: [{ kind: "search" }] });
    const pub = toPublic(state, null);
    assert.equal(pub.seatedCount, 2);
    assert.equal(pub.lockedCount, 1);
    assert.equal(pub.you, null);
  });
});
